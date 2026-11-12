import sqlite3
import pandas as pd
import joblib
import os
import xgboost as xgb
DB_PATH = "/workspace/scratch/supply_prescript.db"
MODEL_DIR = "/workspace/scratch/models"
# -------------------------------------------------------------
# 1. DECISION ROI DASHBOARD ENGINE
# -------------------------------------------------------------
def compute_decision_roi_dashboard():
 conn = sqlite3.connect(DB_PATH)
 conn.row_factory = sqlite3.Row
 cursor = conn.cursor()

 cursor.execute("""
 SELECT
 d.shipment_id,
 d.selected_option,
 d.estimated_cost,
 a.realized_cost,
 a.cost_variance,
 p.predicted_delay_days,
 a.realized_delay_days
 FROM decision_logs d
 JOIN actual_outcomes a ON d.decision_id = a.decision_id
 JOIN predictions p ON d.shipment_id = p.shipment_id
 """)
 records = [dict(row) for row in cursor.fetchall()]
 conn.close()

 df_roi = pd.DataFrame(records)
 penalty_per_day = 1200.0 # Business penalty for delay ($1,200/day)

 # Do Nothing baseline cost vs Realized cost
 df_roi["unmitigated_baseline_cost"] = df_roi["predicted_delay_days"] * penalty_per_day
 df_roi["total_realized_cost"] = df_roi["realized_cost"] + (df_roi["realized_delay_days"] * penalty_per_day)
 df_roi["net_cost_savings"] = df_roi["unmitigated_baseline_cost"] - df_roi["total_realized_cost"]

 total_baseline_cost = df_roi["unmitigated_baseline_cost"].sum()
 total_realized_cost = df_roi["total_realized_cost"].sum()
 total_net_savings = df_roi["net_cost_savings"].sum()
 total_investment = df_roi["realized_cost"].sum()

 roi_percent = (total_net_savings / total_investment * 100) if total_investment > 0 else 0.0

 return {
 "summary": {
 "total_decisions_evaluated": len(df_roi),
 "unmitigated_baseline_loss": round(total_baseline_cost, 2),
 "total_mitigation_investment": round(total_investment, 2),
 "total_realized_business_cost": round(total_realized_cost, 2),
 "net_cost_savings": round(total_net_savings, 2),
 "decision_roi_percentage": round(roi_percent, 2),
 "avg_cost_variance_per_decision": round(df_roi["cost_variance"].mean(), 2)
 },
 "breakdown": df_roi.groupby("selected_option")[["estimated_cost", "realized_cost", "net_cost_savings"]].sum().to_dict(orient="index")
 }
# -------------------------------------------------------------
# 2. CLOSED-LOOP MODEL RETRAINING & SOLVER CALIBRATION
# -------------------------------------------------------------
def feedback_loop_retrain():
 conn = sqlite3.connect(DB_PATH)
 cursor = conn.cursor()

 # Update solver cost multipliers based on empirical variance
 cursor.execute("""
 SELECT d.selected_option, AVG(a.realized_cost / d.estimated_cost) as empirical_factor
 FROM decision_logs d
 JOIN actual_outcomes a ON d.decision_id = a.decision_id
 WHERE d.estimated_cost > 0
 GROUP BY d.selected_option
 """)
 cost_factors = {row: round(row[1], 3) for row in cursor.fetchall()}
 joblib.dump(cost_factors, os.path.join(MODEL_DIR, "calibrated_cost_factors.joblib"))

 # Retrain XGBoost Models with ground-truth outcome data
 df_all = pd.read_sql_query("SELECT * FROM shipments", conn)
 conn.close()

 feature_cols = joblib.load(os.path.join(MODEL_DIR, "feature_columns.joblib"))
 df_encoded = pd.get_dummies(df_all, columns=["item_category", "origin", "destination"], drop_first=True)

 for col in feature_cols:
    if col not in df_encoded.columns:
        df_encoded[col] = 0

 X = df_encoded[feature_cols]

 clf_retrained = xgb.XGBClassifier(n_estimators=75, max_depth=4, learning_rate=0.04, random_state=42)
 clf_retrained.fit(X, df_all["is_delayed"])

 delayed_mask = df_all["actual_delay_days"] > 0
 reg_retrained = xgb.XGBRegressor(n_estimators=75, max_depth=4, learning_rate=0.04, random_state=42)
 reg_retrained.fit(X[delayed_mask], df_all.loc[delayed_mask, "actual_delay_days"])

 joblib.dump(clf_retrained, os.path.join(MODEL_DIR, "xgboost_classifier.joblib"))
 joblib.dump(reg_retrained, os.path.join(MODEL_DIR, "xgboost_regressor.joblib"))

 return {"status": "SUCCESS", "calibrated_cost_factors": cost_factors, "retrained_samples": len(df_all)}