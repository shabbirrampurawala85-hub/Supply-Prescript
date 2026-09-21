import sqlite3
from pulp import LpProblem, LpMinimize, LpVariable, LpBinary, value, LpStatus
class SupplyPrescriptSolver:
 def __init__(self, db_path="/workspace/scratch/supply_prescript.db"):
 self.db_path = db_path
 def solve_disruption_mitigation(self, predicted_delay_days, baseline_lead_time, item_category, max_budget=20000):
 # 1. Candidate Actions & Costs
 actions = {
 "Air_Freight": {"cost": 15000, "days_reduced": min(14, predicted_delay_days), "desc": "Reroute via expedited Air Freight"},
 "Secondary_Supplier": {"cost": 8000, "days_reduced": min(8, predicted_delay_days), "desc": "Procure from secondary regional supplier
 "Production_Rescheduling": {"cost": 3000, "days_reduced": min(4, predicted_delay_days), "desc": "Adjust assembly line schedule"},
 "Launch_Delay": {"cost": 0, "days_reduced": 0, "desc": "Accept delay and shift launch date ($1,200/day penalty)"}
 }

 penalty_per_day = 1200
 prob = LpProblem("Supply_Chain_Disruption_Mitigation", LpMinimize)

 # 2. Decision Variables
 x_vars = {act: LpVariable(f"x_{act}", cat=LpBinary) for act in actions}
 remaining_delay = LpVariable("remaining_delay", lowBound=0)

 # 3. Objective Function
 total_cost = sum(actions[act]["cost"] * x_vars[act] for act in actions)
 penalty_cost = remaining_delay * penalty_per_day
 prob += total_cost + penalty_cost, "Total_Business_Impact"

 # 4. Constraints
 # HARD BUDGET CONSTRAINT
 prob += sum(actions[act]["cost"] * x_vars[act] for act in actions) <= max_budget, "Hard_Budget_Limit"
 # TIME BALANCE CONSTRAINT
 prob += predicted_delay_days - sum(actions[act]["days_reduced"] * x_vars[act] for act in actions) <= remaining_delay, "Time_Mitigation_B
 # CAPACITY CONSTRAINT
 prob += x_vars["Air_Freight"] + x_vars["Secondary_Supplier"] <= 1, "Transport_Override_Capacity"

 # 5. Solve
 prob.solve()

 selected_actions = [
 {"action": act, "cost": actions[act]["cost"], "days_reduced": actions[act]["days_reduced"], "description": actions[act]["desc"]}
 for act in actions if value(x_vars[act]) == 1.0
 ]

 return {
 "status": LpStatus[prob.status],
 "max_budget": max_budget,
 "predicted_delay_days": predicted_delay_days,
 "selected_actions": selected_actions,
 "total_action_cost": sum(a["cost"] for a in selected_actions),
 "days_saved": sum(a["days_reduced"] for a in selected_actions),
 "remaining_delay_days": value(remaining_delay),
 "total_business_impact": value(prob.objective)
 }