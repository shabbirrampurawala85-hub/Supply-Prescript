```
from pydantic import BaseModel, Field, field_validator
from typing import List, Optional
from datetime import datetime

# ==========================================
# PREDICTION SCHEMAS
# ==========================================
class PredictionRequest(BaseModel):
    shipment_id: str = Field(..., json_schema_extra={"example": "SHIP-10000"})

class PredictionResponse(BaseModel):
    shipment_id: str
    delay_probability: float = Field(..., ge=0.0, le=1.0)
    predicted_delay_days: float = Field(..., ge=0.0)
    alert_level: str

# ==========================================
# PRESCRIPTION SCHEMAS
# ==========================================
class PrescribeRequest(BaseModel):
    max_budget: float = Field(default=20000.0, gt=0.0, description="Maximum allowable budget constraint in USD")

class ActionOption(BaseModel):
    action: str
    cost: float = Field(..., ge=0.0)
    days_reduced: float = Field(..., ge=0.0)
    description: str

class PrescribeResponse(BaseModel):
    shipment_id: str
    status: str
    max_budget: float
    predicted_delay_days: float
    selected_actions: List[ActionOption]
    total_action_cost: float
    days_saved: float
    remaining_delay_days: float
    total_business_impact: float

# ==========================================
# TRANSACTIONAL WRITE-BACK SCHEMAS
# ==========================================
class ExecuteDecisionRequest(BaseModel):
    shipment_id: str = Field(..., json_schema_extra={"example": "SHIP-10000"})
    selected_option: str = Field(..., json_schema_extra={"example": "Air_Freight"})
    option_description: str = Field(..., json_schema_extra={"example": "Reroute shipment via expedited Air Freight"})
    estimated_cost: float = Field(..., ge=0.0, description="Estimated cost of option")
    executed_by: str = Field(..., json_schema_extra={"example": "logistics_manager@company.com"})

    @field_validator("selected_option")
    @classmethod
    def validate_option_choice(cls, v: str) -&gt; str:
        allowed = {"Air_Freight", "Secondary_Supplier", "Production_Rescheduling", "Launch_Delay"}
        if v not in allowed:
            raise ValueError(f"Invalid option '{v}'. Must be one of {allowed}")
        return v

class ExecuteDecisionResponse(BaseModel):
    status: str
    decision_id: int
    shipment_id: str
    executed_at: str
