import sqlite3
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, roc_auc_score, mean_squared_error, mean_absolute_error
import xgboost as xgb
import joblib
import os
np.random.seed(42)
# ==========================================
# PHASE 1: DATABASE SCHEMA & MOCK DATA SETUP
# ==========================================
DB_PATH = "/workspace/scratch/supply_prescript.db"
def init_db(db_path=DB_PATH):
"""Initializes database tables simulating Snowflake DW."""
conn = sqlite3.connect(db_path)
cursor = conn.cursor()
# 1. Shipments Table
cursor.execute("""
CREATE TABLE IF NOT EXISTS shipments (
shipment_id VARCHAR PRIMARY KEY,
supplier_id VARCHAR,
item_category VARCHAR,
origin VARCHAR,
destination VARCHAR,
baseline_lead_time_days INTEGER,
supplier_reliability_score REAL,
weather_risk_index REAL,
logistics_congestion_factor REAL,
is_delayed INTEGER,
actual_delay_days INTEGER,
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
""")
# 2. Predictions Table
cursor.execute("""
CREATE TABLE IF NOT EXISTS predictions (
prediction_id INTEGER PRIMARY KEY AUTOINCREMENT,
shipment_id VARCHAR,
delay_probability REAL,
predicted_delay_days REAL,
model_version VARCHAR,
predicted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id)
);
""")
# 3. Decision Logs Table (Write-Back Target)
cursor.execute("""
CREATE TABLE IF NOT EXISTS decision_logs (
decision_id INTEGER PRIMARY KEY AUTOINCREMENT,
shipment_id VARCHAR,
selected_option VARCHAR,
option_description TEXT,
estimated_cost REAL,
executed_by VARCHAR,
executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id)
);
""")
# 4. Actual Outcomes Table (Closed-Loop Analytics)
cursor.execute("""
CREATE TABLE IF NOT EXISTS actual_outcomes (
outcome_id INTEGER PRIMARY KEY AUTOINCREMENT,
shipment_id VARCHAR,
decision_id INTEGER,
realized_cost REAL,
realized_delay_days INTEGER,
cost_variance REAL,
evaluated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
FOREIGN KEY (shipment_id) REFERENCES shipments(shipment_id),
FOREIGN KEY (decision_id) REFERENCES decision_logs(decision_id)
);
""")
conn.commit()
conn.close()
def generate_mock_data(n_samples=2500):"""Generates synthetic supply chain shipment dataset."""
shipment_ids = [f"SHIP-{10000 + i}" for i in range(n_samples)]
suppliers = [f"SUPP-{np.random.randint(100, 115)}" for _ in range(n_samples)]
categories = np.random.choice(["Microchips", "Industrial Batteries", "Raw Steel", "Automotive Parts", "Consumer Electronics"], n_samples, p=
origins = np.random.choice(["Taiwan", "South Korea", "Germany", "China", "Japan"], n_samples)
destinations = np.random.choice(["USA-West", "USA-East", "Europe-Central", "Mexico"], n_samples)
baseline_lead_time = np.random.randint(10, 45, size=n_samples)
supplier_reliability = np.round(np.random.uniform(0.65, 0.99, size=n_samples), 2)
weather_risk = np.round(np.random.uniform(0.0, 1.0, size=n_samples), 2)
congestion_factor = np.round(np.random.uniform(0.5, 2.5, size=n_samples), 2)
# Synthetic Delay Risk Logic
delay_score = (
(1.0 - supplier_reliability) * 3.0 +
weather_risk * 2.5 +
(congestion_factor - 1.0) * 2.0 +
np.random.normal(0, 0.5, n_samples)
)
delay_prob = 1 / (1 + np.exp(-delay_score))
is_delayed = (delay_prob > 0.45).astype(int)
delay_duration = np.where(
is_delayed == 1,
np.round(np.maximum(3, delay_score * 4 + np.random.normal(2, 2, n_samples))).astype(int),
0
)
return pd.DataFrame({
"shipment_id": shipment_ids,
"supplier_id": suppliers,
"item_category": categories,
"origin": origins,
"destination": destinations,
"baseline_lead_time_days": baseline_lead_time,
"supplier_reliability_score": supplier_reliability,
"weather_risk_index": weather_risk,
"logistics_congestion_factor": congestion_factor,
"is_delayed": is_delayed,
"actual_delay_days": delay_duration
})
def populate_db(df, db_path=DB_PATH):
conn = sqlite3.connect(db_path)
df.to_sql("shipments", conn, if_exists="replace", index=False)
conn.close()
# ==========================================
# PHASE 2: PREDICTIVE MODEL (XGBOOST)
# ==========================================
def train_predictive_models(df):
"""Trains XGBoost Classifier for delay risk & XGBoost Regressor for delay duration."""
feature_cols = [
"baseline_lead_time_days", "supplier_reliability_score",
"weather_risk_index", "logistics_congestion_factor"
]
df_encoded = pd.get_dummies(df, columns=["item_category", "origin", "destination"], drop_first=True)
all_feature_cols = feature_cols + [c for c in df_encoded.columns if c.startswith(("item_category_", "origin_", "destination_"))]
X = df_encoded[all_feature_cols]
y_class = df_encoded["is_delayed"]
y_reg = df_encoded["actual_delay_days"]
X_train, X_test, y_class_train, y_class_test, y_reg_train, y_reg_test = train_test_split(
X, y_class, y_reg, test_size=0.2, random_state=42
)
# 1. XGBoost Classification Model
clf = xgb.XGBClassifier(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42, eval_metric="logloss")
clf.fit(X_train, y_class_train)
# 2. XGBoost Regression Model
delayed_mask = y_reg_train > 0
reg = xgb.XGBRegressor(n_estimators=100, max_depth=4, learning_rate=0.05, random_state=42)
reg.fit(X_train[delayed_mask], y_reg_train[delayed_mask])
# Save Artifacts
os.makedirs("/workspace/scratch/models", exist_ok=True)
joblib.dump(clf, "/workspace/scratch/models/xgboost_classifier.joblib")
joblib.dump(reg, "/workspace/scratch/models/xgboost_regressor.joblib")
joblib.dump(all_feature_cols, "/workspace/scratch/models/feature_columns.joblib")
return clf, reg, all_feature_cols