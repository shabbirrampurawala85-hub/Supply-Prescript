export type ItemCategory =
  | 'Microchips'
  | 'Industrial Batteries'
  | 'Raw Steel'
  | 'Automotive Parts'
  | 'Consumer Electronics';

export type OriginLocation = 'Taiwan' | 'South Korea' | 'Germany' | 'China' | 'Japan';
export type DestinationLocation = 'USA-West' | 'USA-East' | 'Europe-Central' | 'Mexico';

export type AlertLevel = 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW';

export interface Shipment {
  shipment_id: string;
  supplier_id: string;
  item_category: ItemCategory;
  origin: OriginLocation;
  destination: DestinationLocation;
  baseline_lead_time_days: number;
  supplier_reliability_score: number;
  weather_risk_index: number;
  logistics_congestion_factor: number;
  is_delayed: number;
  actual_delay_days: number;
  status: 'PENDING_PREDICTION' | 'DISRUPTION_FLAGGED' | 'MITIGATION_EXECUTED' | 'EVALUATED_CLOSED_LOOP';
  created_at: string;
}

export interface Prediction {
  prediction_id: number;
  shipment_id: string;
  delay_probability: number;
  predicted_delay_days: number;
  alert_level: AlertLevel;
  model_version: string;
  predicted_at: string;
}

export type ActionOptionName =
  | 'Air_Freight'
  | 'Secondary_Supplier'
  | 'Production_Rescheduling'
  | 'Launch_Delay';

export interface PrescribedAction {
  action: ActionOptionName;
  cost: number;
  calibrated_cost?: number;
  days_reduced: number;
  description: string;
}

export interface PrescribeResponse {
  shipment_id: string;
  status: 'OPTIMAL' | 'INFEASIBLE' | 'SUBOPTIMAL';
  max_budget: number;
  predicted_delay_days: number;
  selected_actions: PrescribedAction[];
  total_action_cost: number;
  days_saved: number;
  remaining_delay_days: number;
  total_business_impact: number;
  calibrated_factors_applied: Record<string, number>;
  alternatives: {
    id: 'A' | 'B' | 'C';
    name: string;
    description: string;
    action: ActionOptionName;
    estimated_cost: number;
    days_saved: number;
    remaining_delay: number;
    speed_rating: string;
    cost_rating: string;
    roi_score: number;
    recommended: boolean;
  }[];
}

export interface DecisionLog {
  decision_id: number;
  shipment_id: string;
  selected_option: ActionOptionName;
  option_description: string;
  estimated_cost: number;
  executed_by: string;
  executed_at: string;
  snowflake_tx_id: string;
}

export interface ActualOutcome {
  outcome_id: number;
  shipment_id: string;
  decision_id: number;
  realized_cost: number;
  realized_delay_days: number;
  cost_variance: number;
  evaluated_at: string;
  notes?: string;
}

export interface OptionRoiBreakdown {
  estimated_cost: number;
  realized_cost: number;
  net_cost_savings: number;
  count: number;
}

export interface DecisionRoiDashboard {
  summary: {
    total_decisions_evaluated: number;
    unmitigated_baseline_loss: number;
    total_mitigation_investment: number;
    total_realized_business_cost: number;
    net_cost_savings: number;
    decision_roi_percentage: number;
    avg_cost_variance_per_decision: number;
  };
  breakdown: Record<ActionOptionName, OptionRoiBreakdown>;
  recent_evaluations: (DecisionLog & ActualOutcome & {
    predicted_delay_days: number;
    unmitigated_cost: number;
    net_savings: number;
  })[];
}

export interface CalibratedCostFactors {
  Air_Freight: number;
  Secondary_Supplier: number;
  Production_Rescheduling: number;
  Launch_Delay: number;
  last_updated: string;
}

export interface SnowflakeAuditLog {
  tx_id: string;
  table_name: string;
  operation: 'INSERT' | 'UPDATE' | 'MERGE';
  executed_by: string;
  timestamp: string;
  sql_statement: string;
  status: 'COMMITTED';
}
