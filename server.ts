import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDatabase, resetDatabase } from './server/db.js';
import { predictShipment, getModelMetadata } from './server/predictiveEngine.js';
import { solveSupplyPrescript } from './server/prescriptiveSolver.js';
import { computeDecisionRoiDashboard, executeFeedbackLoopRetrain } from './server/closedLoopEngine.js';
import { ActionOptionName } from './src/types/supplyChain.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

// -------------------------------------------------------------
// 1. SHIPMENT & PREDICTIVE API
// -------------------------------------------------------------
app.get('/api/shipments', (_req, res) => {
  const db = getDatabase();
  const predictionMap = new Map(db.predictions.map((p) => [p.shipment_id, p]));
  const decisionMap = new Map(db.decision_logs.map((d) => [d.shipment_id, d]));
  const outcomeMap = new Map(db.actual_outcomes.map((o) => [o.shipment_id, o]));

  const enriched = db.shipments.map((s) => ({
    ...s,
    latest_prediction: predictionMap.get(s.shipment_id) || null,
    latest_decision: decisionMap.get(s.shipment_id) || null,
    actual_outcome: outcomeMap.get(s.shipment_id) || null
  }));

  res.json({ shipments: enriched, total: enriched.length });
});

app.post('/api/shipments', (req, res) => {
  const db = getDatabase();
  const {
    supplier_id,
    item_category,
    origin,
    destination,
    baseline_lead_time_days,
    supplier_reliability_score,
    weather_risk_index,
    logistics_congestion_factor
  } = req.body;

  const newId = `SHIP-${Math.floor(10010 + Math.random() * 9000)}`;
  const newShipment = {
    shipment_id: newId,
    supplier_id: supplier_id || 'SUPP-104',
    item_category: item_category || 'Microchips',
    origin: origin || 'Taiwan',
    destination: destination || 'USA-West',
    baseline_lead_time_days: Number(baseline_lead_time_days) || 28,
    supplier_reliability_score: Number(supplier_reliability_score) || 0.72,
    weather_risk_index: Number(weather_risk_index) || 0.85,
    logistics_congestion_factor: Number(logistics_congestion_factor) || 2.1,
    is_delayed: 0,
    actual_delay_days: 0,
    status: 'PENDING_PREDICTION' as const,
    created_at: new Date().toISOString()
  };

  db.shipments.unshift(newShipment);
  res.status(201).json(newShipment);
});

app.get('/api/shipments/:id', (req, res) => {
  const db = getDatabase();
  const shipment = db.shipments.find((s) => s.shipment_id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const prediction = db.predictions.filter((p) => p.shipment_id === shipment.shipment_id).slice(-1)[0] || null;
  const decision = db.decision_logs.filter((d) => d.shipment_id === shipment.shipment_id).slice(-1)[0] || null;
  const outcome = db.actual_outcomes.filter((o) => o.shipment_id === shipment.shipment_id).slice(-1)[0] || null;

  res.json({
    shipment,
    prediction,
    decision,
    outcome
  });
});

app.post('/api/predict/:id', (req, res) => {
  const db = getDatabase();
  const shipment = db.shipments.find((s) => s.shipment_id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const prediction = predictShipment(shipment);
  db.predictions.push(prediction);

  // Update shipment status based on alert
  if (prediction.delay_probability >= 0.45) {
    shipment.is_delayed = 1;
    shipment.actual_delay_days = prediction.predicted_delay_days;
    shipment.status = 'DISRUPTION_FLAGGED';
  } else {
    shipment.is_delayed = 0;
    shipment.actual_delay_days = 0;
    shipment.status = 'PENDING_PREDICTION';
  }

  // Record prediction insert to Snowflake audit log
  db.snowflake_audit_logs.unshift({
    tx_id: `TX-SNOW-PRED-${Date.now().toString().slice(-6)}`,
    table_name: 'PREDICTIONS',
    operation: 'INSERT',
    executed_by: 'xgboost_runtime_service',
    timestamp: new Date().toISOString(),
    sql_statement: `INSERT INTO LOGISTICS_DW.WRITEBACK.PREDICTIONS (shipment_id, delay_probability, predicted_delay_days, model_version) VALUES ('${shipment.shipment_id}', ${prediction.delay_probability}, ${prediction.predicted_delay_days}, '${prediction.model_version}');`,
    status: 'COMMITTED'
  });

  res.json({
    shipment_id: shipment.shipment_id,
    delay_probability: prediction.delay_probability,
    predicted_delay_days: prediction.predicted_delay_days,
    alert_level: prediction.alert_level,
    model_version: prediction.model_version
  });
});

// -------------------------------------------------------------
// 2. PRESCRIPTIVE SOLVER API (PuLP / SciPy Equivalent)
// -------------------------------------------------------------
app.post('/api/prescribe/:id', (req, res) => {
  const db = getDatabase();
  const shipment = db.shipments.find((s) => s.shipment_id === req.params.id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  // Find latest prediction or run prediction on the fly
  let prediction = db.predictions.filter((p) => p.shipment_id === shipment.shipment_id).slice(-1)[0];
  if (!prediction) {
    prediction = predictShipment(shipment);
    db.predictions.push(prediction);
  }

  const maxBudget = req.body.max_budget !== undefined ? Number(req.body.max_budget) : 20000;
  const prescription = solveSupplyPrescript(
    prediction.predicted_delay_days,
    maxBudget,
    db.calibrated_cost_factors
  );

  prescription.shipment_id = shipment.shipment_id;
  res.json(prescription);
});

// -------------------------------------------------------------
// 3. TRANSACTIONAL WRITE-BACK API (Snowflake DW Pipeline)
// -------------------------------------------------------------
app.post('/api/execute-decision', (req, res) => {
  const db = getDatabase();
  const { shipment_id, selected_option, option_description, estimated_cost, executed_by } = req.body;

  if (!shipment_id || !selected_option) {
    return res.status(400).json({ error: 'shipment_id and selected_option are required' });
  }

  const allowedOptions = ['Air_Freight', 'Secondary_Supplier', 'Production_Rescheduling', 'Launch_Delay'];
  if (!allowedOptions.includes(selected_option)) {
    return res.status(400).json({ error: `Invalid option. Must be one of ${allowedOptions.join(', ')}` });
  }

  const shipment = db.shipments.find((s) => s.shipment_id === shipment_id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const decisionId = 600 + db.decision_logs.length + 1;
  const snowflakeTxId = `TX-SNOW-${Date.now().toString().slice(-6)}`;
  const user = executed_by || 'logistics_manager_alice';

  const newDecision = {
    decision_id: decisionId,
    shipment_id,
    selected_option: selected_option as ActionOptionName,
    option_description: option_description || `Action taken: ${selected_option}`,
    estimated_cost: Number(estimated_cost) || 0,
    executed_by: user,
    executed_at: new Date().toISOString(),
    snowflake_tx_id: snowflakeTxId
  };

  db.decision_logs.push(newDecision);
  shipment.status = 'MITIGATION_EXECUTED';

  // Transactional Write-Back into Snowflake Data Warehouse log
  const sqlStatement = `INSERT INTO LOGISTICS_DW.WRITEBACK.DECISION_LOGS (decision_id, shipment_id, selected_option, option_description, estimated_cost, executed_by, executed_at) VALUES (${decisionId}, '${shipment_id}', '${selected_option}', '${newDecision.option_description.replace(/'/g, "''")}', ${newDecision.estimated_cost}, '${user}', CURRENT_TIMESTAMP());`;

  db.snowflake_audit_logs.unshift({
    tx_id: snowflakeTxId,
    table_name: 'DECISION_LOGS',
    operation: 'INSERT',
    executed_by: user,
    timestamp: new Date().toISOString(),
    sql_statement: sqlStatement,
    status: 'COMMITTED'
  });

  res.status(201).json({
    status: 'SUCCESS',
    decision_id: decisionId,
    shipment_id,
    snowflake_tx_id: snowflakeTxId,
    executed_at: newDecision.executed_at,
    writeback_target: 'LOGISTICS_DW.WRITEBACK.DECISION_LOGS'
  });
});

// -------------------------------------------------------------
// 4. OUTCOME EVALUATION SIMULATOR (3-Week Closed Loop Evaluation)
// -------------------------------------------------------------
app.post('/api/evaluate-outcome', (req, res) => {
  const db = getDatabase();
  const { shipment_id, realized_cost, realized_delay_days, notes } = req.body;

  const shipment = db.shipments.find((s) => s.shipment_id === shipment_id);
  if (!shipment) {
    return res.status(404).json({ error: 'Shipment not found' });
  }

  const decision = db.decision_logs.filter((d) => d.shipment_id === shipment_id).slice(-1)[0];
  if (!decision) {
    return res.status(400).json({ error: 'No executed decision found for this shipment. Execute decision first.' });
  }

  const outcomeId = 950 + db.actual_outcomes.length + 1;
  const cost = Number(realized_cost) !== undefined ? Number(realized_cost) : decision.estimated_cost;
  const delayDays = Number(realized_delay_days) !== undefined ? Number(realized_delay_days) : 0;
  const costVariance = cost - decision.estimated_cost;

  const outcome = {
    outcome_id: outcomeId,
    shipment_id,
    decision_id: decision.decision_id,
    realized_cost: cost,
    realized_delay_days: delayDays,
    cost_variance: costVariance,
    evaluated_at: new Date().toISOString(),
    notes: notes || `Outcome evaluated: Realized cost $${cost.toLocaleString()} with variance $${costVariance.toLocaleString()}`
  };

  db.actual_outcomes.push(outcome);
  shipment.status = 'EVALUATED_CLOSED_LOOP';

  // Audit log write-back
  const txId = `TX-SNOW-OUTCOME-${Date.now().toString().slice(-6)}`;
  db.snowflake_audit_logs.unshift({
    tx_id: txId,
    table_name: 'ACTUAL_OUTCOMES',
    operation: 'INSERT',
    executed_by: 'closed_loop_evaluator_job',
    timestamp: new Date().toISOString(),
    sql_statement: `INSERT INTO LOGISTICS_DW.WRITEBACK.ACTUAL_OUTCOMES (outcome_id, shipment_id, decision_id, realized_cost, realized_delay_days, cost_variance) VALUES (${outcomeId}, '${shipment_id}', ${decision.decision_id}, ${cost}, ${delayDays}, ${costVariance});`,
    status: 'COMMITTED'
  });

  res.json({
    status: 'SUCCESS',
    outcome,
    cost_variance: costVariance
  });
});

// -------------------------------------------------------------
// 5. CLOSED-LOOP ROI DASHBOARD & MODEL RETRAINING
// -------------------------------------------------------------
app.get('/api/roi-dashboard', (_req, res) => {
  const dashboard = computeDecisionRoiDashboard();
  res.json(dashboard);
});

app.post('/api/retrain-closed-loop', (_req, res) => {
  const result = executeFeedbackLoopRetrain();
  res.json(result);
});

// -------------------------------------------------------------
// 6. SNOWFLAKE WAREHOUSE INTEGRATION & AUDIT CONSOLE
// -------------------------------------------------------------
app.get('/api/snowflake/tables', (_req, res) => {
  const db = getDatabase();
  res.json({
    warehouse: 'LOGISTICS_WH',
    database: 'LOGISTICS_DW',
    schema: 'WRITEBACK',
    status: 'ONLINE',
    tables: [
      { name: 'SHIPMENTS', row_count: db.shipments.length },
      { name: 'PREDICTIONS', row_count: db.predictions.length },
      { name: 'DECISION_LOGS', row_count: db.decision_logs.length },
      { name: 'ACTUAL_OUTCOMES', row_count: db.actual_outcomes.length },
      { name: 'CALIBRATED_COST_FACTORS', row_count: 1 }
    ],
    audit_logs: db.snowflake_audit_logs.slice(0, 20),
    calibrated_cost_factors: db.calibrated_cost_factors,
    model_version: db.modelVersion,
    model_hyperparameters: getModelMetadata()
  });
});

app.post('/api/snowflake/query', (req, res) => {
  const db = getDatabase();
  const { sql } = req.body;
  if (!sql) return res.status(400).json({ error: 'SQL query required' });

  const upper = sql.trim().toUpperCase();
  let resultRows: any[] = [];

  if (upper.includes('DECISION_LOGS')) {
    resultRows = db.decision_logs;
  } else if (upper.includes('ACTUAL_OUTCOMES')) {
    resultRows = db.actual_outcomes;
  } else if (upper.includes('PREDICTIONS')) {
    resultRows = db.predictions;
  } else if (upper.includes('CALIBRATED')) {
    resultRows = [db.calibrated_cost_factors];
  } else {
    resultRows = db.shipments.slice(0, 15);
  }

  res.json({
    query: sql,
    status: 'SUCCESS',
    execution_time_ms: Math.floor(12 + Math.random() * 25),
    rows: resultRows
  });
});

app.get('/api/solver/calibration', (_req, res) => {
  const db = getDatabase();
  res.json(db.calibrated_cost_factors);
});

app.post('/api/seed/reset', (_req, res) => {
  const db = resetDatabase();
  res.json({ status: 'RESET_SUCCESS', shipments_count: db.shipments.length });
});

// -------------------------------------------------------------
// 7. VITE DEV MIDDLEWARE / STATIC FILES
// -------------------------------------------------------------
const isProd = process.env.NODE_ENV === 'production';
if (!isProd) {
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa'
  });
  app.use(vite.middlewares);
} else {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
}

const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Supply Prescript running on http://0.0.0.0:${PORT}`);
});
