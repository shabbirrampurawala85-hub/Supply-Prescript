import { getDatabase } from './db.js';
import {
  DecisionRoiDashboard,
  ActionOptionName,
  OptionRoiBreakdown,
  CalibratedCostFactors
} from '../src/types/supplyChain.js';
import { retrainModel } from './predictiveEngine.js';

const PENALTY_PER_DAY = 1200.0;

export function computeDecisionRoiDashboard(): DecisionRoiDashboard {
  const db = getDatabase();

  const predictionMap = new Map(db.predictions.map((p) => [p.shipment_id, p]));
  const decisionMap = new Map(db.decision_logs.map((d) => [d.decision_id, d]));

  let unmitigatedBaselineLoss = 0;
  let totalMitigationInvestment = 0;
  let totalRealizedBusinessCost = 0;
  let totalCostVariance = 0;

  const breakdown: Record<ActionOptionName, OptionRoiBreakdown> = {
    Air_Freight: { estimated_cost: 0, realized_cost: 0, net_cost_savings: 0, count: 0 },
    Secondary_Supplier: { estimated_cost: 0, realized_cost: 0, net_cost_savings: 0, count: 0 },
    Production_Rescheduling: { estimated_cost: 0, realized_cost: 0, net_cost_savings: 0, count: 0 },
    Launch_Delay: { estimated_cost: 0, realized_cost: 0, net_cost_savings: 0, count: 0 }
  };

  const recentEvaluations = [];

  for (const outcome of db.actual_outcomes) {
    const decision = decisionMap.get(outcome.decision_id);
    if (!decision) continue;

    const prediction = predictionMap.get(outcome.shipment_id);
    const predictedDays = prediction ? prediction.predicted_delay_days : 10;

    const unmitigated = predictedDays * PENALTY_PER_DAY;
    const realizedBusinessCost = outcome.realized_cost + outcome.realized_delay_days * PENALTY_PER_DAY;
    const netSavings = unmitigated - realizedBusinessCost;

    unmitigatedBaselineLoss += unmitigated;
    totalMitigationInvestment += outcome.realized_cost;
    totalRealizedBusinessCost += realizedBusinessCost;
    totalCostVariance += outcome.cost_variance;

    const opt = decision.selected_option;
    if (breakdown[opt]) {
      breakdown[opt].estimated_cost += decision.estimated_cost;
      breakdown[opt].realized_cost += outcome.realized_cost;
      breakdown[opt].net_cost_savings += netSavings;
      breakdown[opt].count += 1;
    }

    recentEvaluations.push({
      ...decision,
      ...outcome,
      predicted_delay_days: predictedDays,
      unmitigated_cost: unmitigated,
      net_savings: netSavings
    });
  }

  const count = db.actual_outcomes.length;
  const netSavingsTotal = unmitigatedBaselineLoss - totalRealizedBusinessCost;
  const roiPercent =
    totalMitigationInvestment > 0 ? (netSavingsTotal / totalMitigationInvestment) * 100 : 0.0;
  const avgVariance = count > 0 ? totalCostVariance / count : 0.0;

  return {
    summary: {
      total_decisions_evaluated: count,
      unmitigated_baseline_loss: Math.round(unmitigatedBaselineLoss),
      total_mitigation_investment: Math.round(totalMitigationInvestment),
      total_realized_business_cost: Math.round(totalRealizedBusinessCost),
      net_cost_savings: Math.round(netSavingsTotal),
      decision_roi_percentage: Math.round(roiPercent * 10) / 10,
      avg_cost_variance_per_decision: Math.round(avgVariance)
    },
    breakdown,
    recent_evaluations: recentEvaluations.reverse()
  };
}

export function executeFeedbackLoopRetrain() {
  const db = getDatabase();

  // Compute empirical calibration multipliers: AVG(realized_cost / estimated_cost)
  const optionRatios: Record<string, number[]> = {
    Air_Freight: [],
    Secondary_Supplier: [],
    Production_Rescheduling: [],
    Launch_Delay: []
  };

  const decisionMap = new Map(db.decision_logs.map((d) => [d.decision_id, d]));

  for (const outcome of db.actual_outcomes) {
    const decision = decisionMap.get(outcome.decision_id);
    if (decision && decision.estimated_cost > 0) {
      const ratio = outcome.realized_cost / decision.estimated_cost;
      if (optionRatios[decision.selected_option]) {
        optionRatios[decision.selected_option].push(ratio);
      }
    }
  }

  const newCalibratedFactors: CalibratedCostFactors = {
    Air_Freight: optionRatios.Air_Freight.length > 0
      ? Math.round((optionRatios.Air_Freight.reduce((a, b) => a + b, 0) / optionRatios.Air_Freight.length) * 1000) / 1000
      : 1.20,
    Secondary_Supplier: optionRatios.Secondary_Supplier.length > 0
      ? Math.round((optionRatios.Secondary_Supplier.reduce((a, b) => a + b, 0) / optionRatios.Secondary_Supplier.length) * 1000) / 1000
      : 1.10,
    Production_Rescheduling: optionRatios.Production_Rescheduling.length > 0
      ? Math.round((optionRatios.Production_Rescheduling.reduce((a, b) => a + b, 0) / optionRatios.Production_Rescheduling.length) * 1000) / 1000
      : 1.07,
    Launch_Delay: 1.0,
    last_updated: new Date().toISOString()
  };

  db.calibrated_cost_factors = newCalibratedFactors;

  // Retrain predictive model with ground truth data
  const retrainResult = retrainModel(db.shipments.length + db.actual_outcomes.length);
  db.modelVersion = retrainResult.new_version;

  // Log to audit log
  const txId = `TX-SNOW-RETRAIN-${Date.now().toString().slice(-6)}`;
  db.snowflake_audit_logs.unshift({
    tx_id: txId,
    table_name: 'CALIBRATED_COST_FACTORS',
    operation: 'UPDATE',
    executed_by: 'automated_closed_loop_agent',
    timestamp: new Date().toISOString(),
    sql_statement: `UPDATE LOGISTICS_DW.WRITEBACK.CALIBRATED_COST_FACTORS SET air_freight_factor = ${newCalibratedFactors.Air_Freight}, secondary_supplier_factor = ${newCalibratedFactors.Secondary_Supplier}, production_rescheduling_factor = ${newCalibratedFactors.Production_Rescheduling}, updated_at = CURRENT_TIMESTAMP();`,
    status: 'COMMITTED'
  });

  return {
    status: 'SUCCESS',
    calibrated_cost_factors: newCalibratedFactors,
    retrain_summary: retrainResult
  };
}
