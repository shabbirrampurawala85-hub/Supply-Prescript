import sqlite3
import os
import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient
from pydantic import BaseModel, Field
# Import Phase 3 Solver
from phase3_prescriptive_solver import SupplyPrescriptSolver
DB_PATH = "/workspace/scratch/supply_prescript.db"
MODEL_DIR = "/workspace/scratch/models"
# Load Trained Models & Features
clf = joblib.load(os.path.join(MODEL_DIR, "xgboost_classifier.joblib"))
reg = joblib.load(os.path.join(MODEL_DIR, "xgboost_regressor.joblib"))
feature_cols = joblib.load(os.path.join(MODEL_DIR, "feature_columns.joblib"))
app = FastAPI(title="Supply Prescript - Write-Back API", version="1.0.0")
class PrescribeRequest(BaseModel):
 max_budget: float = Field(default=20000.0)
class ExecuteDecisionRequest(BaseModel):
 shipment_id: str
 selected_option: str
 option_description: str
 estimated_cost: float
 executed_by: str = "logistics_manager_alice"
@app.post("/api/predict/{shipment_id}")
def predict_shipment_delay(shipment_id: str):
 conn = sqlite3.connect(DB_PATH)
 conn.row_factory = sqlite3.Row
 cursor = conn.cursor()
 cursor.execute("SELECT * FROM shipments WHERE shipment_id = ?", (shipment_id,))
 shipment = cursor.fetchone()

 if not shipment:
 conn.close()
 raise HTTPException(status_code=404, detail="Shipment not found.")

 ship_dict = dict(shipment)
 df_encoded = pd.get_dummies(pd.DataFrame([ship_dict]), columns=["item_category", "origin", "destination"], drop_first=True)
 for col in feature_cols:
 if col not in df_encoded.columns:
 df_encoded[col] = 0

 X = df_encoded[feature_cols]
 delay_prob = float(clf.predict_proba(X)[7])
 predicted_delay_days = max(0.0, round(float(reg.predict(X)), 1)) if delay_prob > 0.45 else 0.0

 cursor.execute("""
 INSERT INTO predictions (shipment_id, delay_probability, predicted_delay_days, model_version)
 VALUES (?, ?, ?, ?)
 """, (shipment_id, round(delay_prob, 4), predicted_delay_days, "xgboost_v1.0"))

 conn.commit()
 conn.close()
 return {"shipment_id": shipment_id, "delay_probability": round(delay_prob, 4), "predicted_delay_days": predicted_delay_days}
@app.post("/api/prescribe/{shipment_id}")
def prescribe_mitigation(shipment_id: str, payload: PrescribeRequest):
 conn = sqlite3.connect(DB_PATH)
 conn.row_factory = sqlite3.Row
 cursor = conn.cursor()
 cursor.execute("""
 SELECT p.*, s.baseline_lead_time_days, s.item_category
 FROM predictions p JOIN shipments s ON p.shipment_id = s.shipment_id
 WHERE p.shipment_id = ? ORDER BY p.prediction_id DESC LIMIT 1
 """, (shipment_id,))
 pred = cursor.fetchone()
 conn.close()

 solver = SupplyPrescriptSolver(db_path=DB_PATH)
 return solver.solve_disruption_mi(
 predicted_delay_days=pred["predicted_delay_days"],
 baseline_lead_time=pred["baseline_lead_time_days"],
 item_category=pred["item_category"],
 max_budget=payload.max_budget
 )
@app.post("/api/execute-decision")
def execute_decision_writeback(payload: ExecuteDecisionRequest):
 """TRANSACTIONAL WRITE-BACK: Inserts decision choice into database."""
 conn = sqlite3.connect(DB_PATH)
 cursor = conn.cursor()
 cursor.execute("""
 INSERT INTO decision_logs (shipment_id, selected_option, option_description, estimated_cost, executed_by)
 VALUES (?, ?, ?, ?, ?)
 """, (payload.shipment_id, payload.selected_option, payload.option_description, payload.estimated_cost, payload.executed_by))

 decision_id = cursor.lastrowid
 conn.commit()
 conn.close()

 return {"status": "SUCCESS", "decision_id": decision_id, "shipment_id": payload.shipment_id}