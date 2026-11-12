import {
  Shipment,
  Prediction,
  DecisionLog,
  ActualOutcome,
  CalibratedCostFactors,
  SnowflakeAuditLog,
  ItemCategory,
  OriginLocation,
  DestinationLocation
} from '../src/types/supplyChain.js';

interface DatabaseStore {
  shipments: Shipment[];
  predictions: Prediction[];
  decision_logs: DecisionLog[];
  actual_outcomes: ActualOutcome[];
  calibrated_cost_factors: CalibratedCostFactors;
  snowflake_audit_logs: SnowflakeAuditLog[];
  modelVersion: string;
}

const initialShipments: Shipment[] = [
  {
    shipment_id: 'SHIP-10000',
    supplier_id: 'SUPP-104',
    item_category: 'Microchips',
    origin: 'Taiwan',
    destination: 'USA-West',
    baseline_lead_time_days: 28,
    supplier_reliability_score: 0.68,
    weather_risk_index: 0.88,
    logistics_congestion_factor: 2.15,
    is_delayed: 1,
    actual_delay_days: 14,
    status: 'DISRUPTION_FLAGGED',
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
  },
  {
    shipment_id: 'SHIP-10001',
    supplier_id: 'SUPP-109',
    item_category: 'Industrial Batteries',
    origin: 'South Korea',
    destination: 'Europe-Central',
    baseline_lead_time_days: 35,
    supplier_reliability_score: 0.82,
    weather_risk_index: 0.65,
    logistics_congestion_factor: 1.40,
    is_delayed: 1,
    actual_delay_days: 8,
    status: 'DISRUPTION_FLAGGED',
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
  },
  {
    shipment_id: 'SHIP-10002',
    supplier_id: 'SUPP-112',
    item_category: 'Automotive Parts',
    origin: 'Germany',
    destination: 'USA-East',
    baseline_lead_time_days: 18,
    supplier_reliability_score: 0.94,
    weather_risk_index: 0.25,
    logistics_congestion_factor: 0.85,
    is_delayed: 0,
    actual_delay_days: 0,
    status: 'PENDING_PREDICTION',
    created_at: new Date(Date.now() - 3600000 * 20).toISOString(),
  },
  {
    shipment_id: 'SHIP-10003',
    supplier_id: 'SUPP-101',
    item_category: 'Raw Steel',
    origin: 'China',
    destination: 'Mexico',
    baseline_lead_time_days: 42,
    supplier_reliability_score: 0.73,
    weather_risk_index: 0.70,
    logistics_congestion_factor: 1.80,
    is_delayed: 1,
    actual_delay_days: 11,
    status: 'DISRUPTION_FLAGGED',
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
  },
  {
    shipment_id: 'SHIP-10004',
    supplier_id: 'SUPP-115',
    item_category: 'Consumer Electronics',
    origin: 'Japan',
    destination: 'USA-West',
    baseline_lead_time_days: 15,
    supplier_reliability_score: 0.96,
    weather_risk_index: 0.15,
    logistics_congestion_factor: 0.90,
    is_delayed: 0,
    actual_delay_days: 0,
    status: 'PENDING_PREDICTION',
    created_at: new Date(Date.now() - 3600000 * 30).toISOString(),
  },
  // Evaluated Historical Shipments for Closed Loop
  {
    shipment_id: 'SHIP-09981',
    supplier_id: 'SUPP-104',
    item_category: 'Microchips',
    origin: 'Taiwan',
    destination: 'USA-West',
    baseline_lead_time_days: 28,
    supplier_reliability_score: 0.70,
    weather_risk_index: 0.85,
    logistics_congestion_factor: 2.10,
    is_delayed: 1,
    actual_delay_days: 14,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 28).toISOString(),
  },
  {
    shipment_id: 'SHIP-09982',
    supplier_id: 'SUPP-108',
    item_category: 'Microchips',
    origin: 'Taiwan',
    destination: 'USA-West',
    baseline_lead_time_days: 25,
    supplier_reliability_score: 0.72,
    weather_risk_index: 0.80,
    logistics_congestion_factor: 1.95,
    is_delayed: 1,
    actual_delay_days: 12,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 25).toISOString(),
  },
  {
    shipment_id: 'SHIP-09983',
    supplier_id: 'SUPP-109',
    item_category: 'Industrial Batteries',
    origin: 'South Korea',
    destination: 'Europe-Central',
    baseline_lead_time_days: 30,
    supplier_reliability_score: 0.79,
    weather_risk_index: 0.60,
    logistics_congestion_factor: 1.50,
    is_delayed: 1,
    actual_delay_days: 9,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 22).toISOString(),
  },
  {
    shipment_id: 'SHIP-09984',
    supplier_id: 'SUPP-103',
    item_category: 'Automotive Parts',
    origin: 'Germany',
    destination: 'USA-East',
    baseline_lead_time_days: 20,
    supplier_reliability_score: 0.83,
    weather_risk_index: 0.55,
    logistics_congestion_factor: 1.30,
    is_delayed: 1,
    actual_delay_days: 5,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 18).toISOString(),
  },
  {
    shipment_id: 'SHIP-09985',
    supplier_id: 'SUPP-101',
    item_category: 'Raw Steel',
    origin: 'China',
    destination: 'Mexico',
    baseline_lead_time_days: 40,
    supplier_reliability_score: 0.69,
    weather_risk_index: 0.75,
    logistics_congestion_factor: 2.20,
    is_delayed: 1,
    actual_delay_days: 16,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 15).toISOString(),
  },
  {
    shipment_id: 'SHIP-09986',
    supplier_id: 'SUPP-115',
    item_category: 'Consumer Electronics',
    origin: 'Japan',
    destination: 'USA-West',
    baseline_lead_time_days: 16,
    supplier_reliability_score: 0.88,
    weather_risk_index: 0.40,
    logistics_congestion_factor: 1.10,
    is_delayed: 1,
    actual_delay_days: 4,
    status: 'EVALUATED_CLOSED_LOOP',
    created_at: new Date(Date.now() - 86400000 * 12).toISOString(),
  }
];

const initialPredictions: Prediction[] = [
  {
    prediction_id: 1,
    shipment_id: 'SHIP-10000',
    delay_probability: 0.942,
    predicted_delay_days: 14.0,
    alert_level: 'CRITICAL',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 3600000 * 3).toISOString(),
  },
  {
    prediction_id: 2,
    shipment_id: 'SHIP-10001',
    delay_probability: 0.785,
    predicted_delay_days: 8.0,
    alert_level: 'HIGH',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 3600000 * 11).toISOString(),
  },
  {
    prediction_id: 3,
    shipment_id: 'SHIP-10003',
    delay_probability: 0.845,
    predicted_delay_days: 11.0,
    alert_level: 'CRITICAL',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 3600000 * 23).toISOString(),
  },
  // Historical predictions for closed loop
  {
    prediction_id: 101,
    shipment_id: 'SHIP-09981',
    delay_probability: 0.92,
    predicted_delay_days: 14.0,
    alert_level: 'CRITICAL',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 27).toISOString(),
  },
  {
    prediction_id: 102,
    shipment_id: 'SHIP-09982',
    delay_probability: 0.88,
    predicted_delay_days: 12.0,
    alert_level: 'CRITICAL',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 24).toISOString(),
  },
  {
    prediction_id: 103,
    shipment_id: 'SHIP-09983',
    delay_probability: 0.76,
    predicted_delay_days: 9.0,
    alert_level: 'HIGH',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 21).toISOString(),
  },
  {
    prediction_id: 104,
    shipment_id: 'SHIP-09984',
    delay_probability: 0.62,
    predicted_delay_days: 5.0,
    alert_level: 'MODERATE',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 17).toISOString(),
  },
  {
    prediction_id: 105,
    shipment_id: 'SHIP-09985',
    delay_probability: 0.95,
    predicted_delay_days: 16.0,
    alert_level: 'CRITICAL',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 14).toISOString(),
  },
  {
    prediction_id: 106,
    shipment_id: 'SHIP-09986',
    delay_probability: 0.58,
    predicted_delay_days: 4.0,
    alert_level: 'MODERATE',
    model_version: 'xgboost_v1.0',
    predicted_at: new Date(Date.now() - 86400000 * 11).toISOString(),
  }
];

const initialDecisions: DecisionLog[] = [
  {
    decision_id: 501,
    shipment_id: 'SHIP-09981',
    selected_option: 'Air_Freight',
    option_description: 'Reroute via expedited Air Freight',
    estimated_cost: 15000,
    executed_by: 'logistics_manager_alice',
    executed_at: new Date(Date.now() - 86400000 * 26).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894101',
  },
  {
    decision_id: 502,
    shipment_id: 'SHIP-09982',
    selected_option: 'Air_Freight',
    option_description: 'Reroute via expedited Air Freight',
    estimated_cost: 15000,
    executed_by: 'logistics_director_bob',
    executed_at: new Date(Date.now() - 86400000 * 23).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894102',
  },
  {
    decision_id: 503,
    shipment_id: 'SHIP-09983',
    selected_option: 'Secondary_Supplier',
    option_description: 'Procure from secondary regional supplier at premium',
    estimated_cost: 8000,
    executed_by: 'logistics_manager_alice',
    executed_at: new Date(Date.now() - 86400000 * 20).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894103',
  },
  {
    decision_id: 504,
    shipment_id: 'SHIP-09984',
    selected_option: 'Production_Rescheduling',
    option_description: 'Adjust assembly line schedule to absorb lead time',
    estimated_cost: 3000,
    executed_by: 'plant_ops_carol',
    executed_at: new Date(Date.now() - 86400000 * 16).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894104',
  },
  {
    decision_id: 505,
    shipment_id: 'SHIP-09985',
    selected_option: 'Air_Freight',
    option_description: 'Reroute via expedited Air Freight',
    estimated_cost: 15000,
    executed_by: 'logistics_director_bob',
    executed_at: new Date(Date.now() - 86400000 * 13).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894105',
  },
  {
    decision_id: 506,
    shipment_id: 'SHIP-09986',
    selected_option: 'Launch_Delay',
    option_description: 'Accept delay and shift launch date ($1,200/day penalty)',
    estimated_cost: 0,
    executed_by: 'vp_supply_chain_david',
    executed_at: new Date(Date.now() - 86400000 * 10).toISOString(),
    snowflake_tx_id: 'TX-SNOW-894106',
  }
];

// Ground truth closed-loop actual outcomes (Notice Air Freight cost $18,000 vs $15,000!)
const initialOutcomes: ActualOutcome[] = [
  {
    outcome_id: 901,
    shipment_id: 'SHIP-09981',
    decision_id: 501,
    realized_cost: 18000, // Spot surcharge & fuel spike
    realized_delay_days: 0,
    cost_variance: 3000,
    evaluated_at: new Date(Date.now() - 86400000 * 5).toISOString(),
    notes: 'Air freight surcharges and cargo demurrage elevated cost to $18k (original estimate $15k).'
  },
  {
    outcome_id: 902,
    shipment_id: 'SHIP-09982',
    decision_id: 502,
    realized_cost: 17850,
    realized_delay_days: 0,
    cost_variance: 2850,
    evaluated_at: new Date(Date.now() - 86400000 * 3).toISOString(),
    notes: 'Emergency weekend airport handling fees added $2,850.'
  },
  {
    outcome_id: 903,
    shipment_id: 'SHIP-09983',
    decision_id: 503,
    realized_cost: 8800,
    realized_delay_days: 1,
    cost_variance: 800,
    evaluated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    notes: 'Secondary supplier delivered 90% lot size on time; minor 1-day buffer.'
  },
  {
    outcome_id: 904,
    shipment_id: 'SHIP-09984',
    decision_id: 504,
    realized_cost: 3200,
    realized_delay_days: 1,
    cost_variance: 200,
    evaluated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'Overtime shift adjustments on Line B successfully absorbed 4 days.'
  },
  {
    outcome_id: 905,
    shipment_id: 'SHIP-09985',
    decision_id: 505,
    realized_cost: 18200,
    realized_delay_days: 0,
    cost_variance: 3200,
    evaluated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'High volume steel pallets required chartered cargo flight.'
  },
  {
    outcome_id: 906,
    shipment_id: 'SHIP-09986',
    decision_id: 506,
    realized_cost: 0,
    realized_delay_days: 4,
    cost_variance: 0,
    evaluated_at: new Date(Date.now() - 86400000 * 1).toISOString(),
    notes: 'Shifted shelf date by 4 days with commercial penalty ($4,800).'
  }
];

const initialAuditLogs: SnowflakeAuditLog[] = [
  {
    tx_id: 'TX-SNOW-894101',
    table_name: 'DECISION_LOGS',
    operation: 'INSERT',
    executed_by: 'logistics_manager_alice',
    timestamp: new Date(Date.now() - 86400000 * 26).toISOString(),
    sql_statement: `INSERT INTO LOGISTICS_DW.WRITEBACK.DECISION_LOGS (shipment_id, selected_option, option_description, estimated_cost, executed_by) VALUES ('SHIP-09981', 'Air_Freight', 'Reroute via expedited Air Freight', 15000, 'logistics_manager_alice');`,
    status: 'COMMITTED'
  },
  {
    tx_id: 'TX-SNOW-894102',
    table_name: 'DECISION_LOGS',
    operation: 'INSERT',
    executed_by: 'logistics_director_bob',
    timestamp: new Date(Date.now() - 86400000 * 23).toISOString(),
    sql_statement: `INSERT INTO LOGISTICS_DW.WRITEBACK.DECISION_LOGS (shipment_id, selected_option, option_description, estimated_cost, executed_by) VALUES ('SHIP-09982', 'Air_Freight', 'Reroute via expedited Air Freight', 15000, 'logistics_director_bob');`,
    status: 'COMMITTED'
  },
  {
    tx_id: 'TX-SNOW-894103',
    table_name: 'DECISION_LOGS',
    operation: 'INSERT',
    executed_by: 'logistics_manager_alice',
    timestamp: new Date(Date.now() - 86400000 * 20).toISOString(),
    sql_statement: `INSERT INTO LOGISTICS_DW.WRITEBACK.DECISION_LOGS (shipment_id, selected_option, option_description, estimated_cost, executed_by) VALUES ('SHIP-09983', 'Secondary_Supplier', 'Procure from secondary regional supplier at premium', 8000, 'logistics_manager_alice');`,
    status: 'COMMITTED'
  }
];

// In-Memory Database store
let db: DatabaseStore = {
  shipments: [...initialShipments],
  predictions: [...initialPredictions],
  decision_logs: [...initialDecisions],
  actual_outcomes: [...initialOutcomes],
  calibrated_cost_factors: {
    Air_Freight: 1.20, // Learned empirical variance (18,000 / 15,000 = 1.20)
    Secondary_Supplier: 1.10, // 10% premium observed
    Production_Rescheduling: 1.07,
    Launch_Delay: 1.0,
    last_updated: new Date().toISOString()
  },
  snowflake_audit_logs: [...initialAuditLogs],
  modelVersion: 'xgboost_v1.0'
};

export function getDatabase(): DatabaseStore {
  return db;
}

export function resetDatabase(): DatabaseStore {
  db = {
    shipments: JSON.parse(JSON.stringify(initialShipments)),
    predictions: JSON.parse(JSON.stringify(initialPredictions)),
    decision_logs: JSON.parse(JSON.stringify(initialDecisions)),
    actual_outcomes: JSON.parse(JSON.stringify(initialOutcomes)),
    calibrated_cost_factors: {
      Air_Freight: 1.0, // Reset to uncalibrated baseline so user can test the Closed Loop calibration!
      Secondary_Supplier: 1.0,
      Production_Rescheduling: 1.0,
      Launch_Delay: 1.0,
      last_updated: new Date().toISOString()
    },
    snowflake_audit_logs: JSON.parse(JSON.stringify(initialAuditLogs)),
    modelVersion: 'xgboost_v1.0'
  };
  return db;
}
