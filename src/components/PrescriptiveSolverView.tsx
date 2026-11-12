import React, { useState, useEffect } from 'react';
import {
  Shipment,
  Prediction,
  PrescribeResponse,
  ActionOptionName,
  DecisionLog,
  ActualOutcome
} from '../types/supplyChain';
import {
  CheckCircle2,
  DollarSign,
  Clock,
  Send,
  Database,
  ArrowRight,
  TrendingDown,
  ChevronRight,
  AlertCircle
} from 'lucide-react';

interface PrescriptiveSolverViewProps {
  selectedShipmentId: string;
  shipments: (Shipment & { latest_prediction: Prediction | null })[];
  onSelectShipment: (id: string) => void;
  onExecuteDecision: (
    shipmentId: string,
    option: ActionOptionName,
    desc: string,
    cost: number
  ) => Promise<{ decision_id: number; snowflake_tx_id: string } | null>;
  onEvaluateOutcome: (
    shipmentId: string,
    realizedCost: number,
    realizedDelay: number,
    notes: string
  ) => Promise<ActualOutcome | null>;
  onGoToClosedLoop: () => void;
}

export const PrescriptiveSolverView: React.FC<PrescriptiveSolverViewProps> = ({
  selectedShipmentId,
  shipments,
  onSelectShipment,
  onExecuteDecision,
  onEvaluateOutcome,
  onGoToClosedLoop
}) => {
  const [maxBudget, setMaxBudget] = useState<number>(20000);
  const [solverResult, setSolverResult] = useState<PrescribeResponse | null>(null);
  const [isLoadingSolver, setIsLoadingSolver] = useState<boolean>(false);
  const [executingOption, setExecutingOption] = useState<string | null>(null);
  const [executedDecision, setExecutedDecision] = useState<DecisionLog | null>(null);
  const [isEvaluating, setIsEvaluating] = useState<boolean>(false);
  const [realizedCostInput, setRealizedCostInput] = useState<string>('18000');
  const [realizedDelayInput, setRealizedDelayInput] = useState<string>('0');
  const [outcomeEvaluationSuccess, setOutcomeEvaluationSuccess] = useState<boolean>(false);

  const currentShipment = shipments.find((s) => s.shipment_id === selectedShipmentId) || shipments[0];

  // Fetch prescription whenever shipment or budget changes
  useEffect(() => {
    if (!currentShipment) return;

    let isMounted = true;
    setIsLoadingSolver(true);

    fetch(`/api/prescribe/${currentShipment.shipment_id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ max_budget: maxBudget })
    })
      .then((res) => res.json())
      .then((data: PrescribeResponse) => {
        if (isMounted) {
          setSolverResult(data);
          setIsLoadingSolver(false);
        }
      })
      .catch((err) => {
        console.error('Error solving prescription:', err);
        if (isMounted) setIsLoadingSolver(false);
      });

    // Check if there is already an executed decision for this shipment
    fetch(`/api/shipments/${currentShipment.shipment_id}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted) {
          setExecutedDecision(data.decision);
          if (data.outcome) {
            setOutcomeEvaluationSuccess(true);
          } else {
            setOutcomeEvaluationSuccess(false);
          }
        }
      })
      .catch((err) => console.error(err));

    return () => {
      isMounted = false;
    };
  }, [currentShipment?.shipment_id, maxBudget]);

  const handleExecute = async (
    option: ActionOptionName,
    desc: string,
    cost: number
  ) => {
    if (!currentShipment) return;
    setExecutingOption(option);
    try {
      const result = await onExecuteDecision(currentShipment.shipment_id, option, desc, cost);
      if (result) {
        setExecutedDecision({
          decision_id: result.decision_id,
          shipment_id: currentShipment.shipment_id,
          selected_option: option,
          option_description: desc,
          estimated_cost: cost,
          executed_by: 'logistics_manager_alice',
          executed_at: new Date().toISOString(),
          snowflake_tx_id: result.snowflake_tx_id
        });
        // Set default evaluation simulation inputs based on use case
        if (option === 'Air_Freight') {
          setRealizedCostInput('18000'); // As highlighted in user prompt: air freight actually cost $18k!
          setRealizedDelayInput('0');
        } else if (option === 'Secondary_Supplier') {
          setRealizedCostInput('8800');
          setRealizedDelayInput('1');
        } else {
          setRealizedCostInput(cost.toString());
          setRealizedDelayInput('4');
        }
      }
    } finally {
      setExecutingOption(null);
    }
  };

  const handleSimulateOutcome = async () => {
    if (!currentShipment) return;
    setIsEvaluating(true);
    try {
      const realizedCost = Number(realizedCostInput) || 0;
      const realizedDelay = Number(realizedDelayInput) || 0;
      const notes = `3-week closed-loop evaluation recorded. Realized cost: $${realizedCost.toLocaleString()}, Realized residual delay: ${realizedDelay} days.`;
      const res = await onEvaluateOutcome(currentShipment.shipment_id, realizedCost, realizedDelay, notes);
      if (res) {
        setOutcomeEvaluationSuccess(true);
      }
    } finally {
      setIsEvaluating(false);
    }
  };

  if (!currentShipment) {
    return (
      <div className="p-8 text-center text-slate-400">
        No shipment selected. Please select a shipment from the Operations Hub.
      </div>
    );
  }

  const prediction = currentShipment.latest_prediction;
  const predictedDays = prediction ? prediction.predicted_delay_days : currentShipment.actual_delay_days || 14;
  const unmitigatedPenalty = predictedDays * 1200;

  return (
    <div className="space-y-6">
      {/* Title & Context Picker */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Prescriptive Optimization Engine</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Mathematical Linear Programming (PuLP/SciPy) evaluating candidate mitigation alternatives subject to hard budget and capacity constraints.
          </p>
        </div>

        {/* Shipment Selector */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-slate-400 whitespace-nowrap">Active Disruption:</label>
          <select
            value={currentShipment.shipment_id}
            onChange={(e) => onSelectShipment(e.target.value)}
            className="bg-slate-900 text-xs text-white font-mono border border-slate-800 rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            {shipments.map((s) => (
              <option key={s.shipment_id} value={s.shipment_id}>
                {s.shipment_id} - {s.item_category} ({s.origin} → {s.destination})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Disruption Diagnostic Strip */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] text-slate-400 block">Impending Delay Forecast</span>
          <div className="text-lg font-bold font-mono text-amber-400 tabular-nums">
            {predictedDays.toFixed(1)} Days
          </div>
          <span className="text-[11px] text-slate-500 block">XGBoost Confidence: {prediction ? `${Math.round(prediction.delay_probability * 100)}%` : '94%'}</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Unmitigated Business Loss</span>
          <div className="text-lg font-bold font-mono text-red-400 tabular-nums">
            ${unmitigatedPenalty.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">At $1,200/day delay penalty</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Critical Disruption Root</span>
          <div className="text-sm font-semibold text-slate-200">
            {currentShipment.origin} Port Congestion
          </div>
          <span className="text-[11px] text-slate-500 block">Congestion Factor: {currentShipment.logistics_congestion_factor.toFixed(2)}x</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Closed-Loop Status</span>
          <div className="text-sm font-semibold text-indigo-400">
            {outcomeEvaluationSuccess
              ? 'Evaluated (Loop Closed)'
              : executedDecision
              ? 'Mitigation Committed'
              : 'Action Pending'}
          </div>
          <span className="text-[11px] text-slate-500 block">Snowflake Write-Back Active</span>
        </div>
      </div>

      {/* Mathematical Constraint Control Strip */}
      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
              Operations Research Constraint: Maximum Allowable Budget Limit
            </h3>
            <p className="text-[11px] text-slate-400">
              The LP solver strictly enforces <code className="text-indigo-400">sum(action_cost) &le; max_budget</code>. Adjust slider to audit optimizer response.
            </p>
          </div>
          <div className="text-right">
            <span className="text-sm font-mono font-bold text-white tabular-nums">
              ${maxBudget.toLocaleString()} USD
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs font-mono text-slate-500">$5,000</span>
          <input
            type="range"
            min={5000}
            max={35000}
            step={1000}
            value={maxBudget}
            onChange={(e) => setMaxBudget(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
          />
          <span className="text-xs font-mono text-slate-500">$35,000</span>
        </div>

        {solverResult && (
          <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 pt-1 border-t border-slate-800/60">
            <span>Solver Status: <strong className="text-emerald-400 font-mono">{solverResult.status}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Optimal Action Cost: <strong className="text-white font-mono">${solverResult.total_action_cost.toLocaleString()}</strong></span>
            <span aria-hidden="true">·</span>
            <span>Days Saved: <strong className="text-indigo-400 font-mono">+{solverResult.days_saved} days</strong></span>
            <span aria-hidden="true">·</span>
            <span>Remaining Delay: <strong className="text-amber-400 font-mono">{solverResult.remaining_delay_days} days</strong></span>
            <span aria-hidden="true">·</span>
            <span>Net Business Impact: <strong className="text-white font-mono">${Math.round(solverResult.total_business_impact).toLocaleString()}</strong></span>
          </div>
        )}
      </div>

      {/* The 3 Prescriptive Alternative Cards (Options A, B, C) */}
      <div>
        <div className="flex items-center justify-between pb-3">
          <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
            Prescribed Action Alternatives (Ranked by Trade-Off Optimization)
          </h2>
          <span className="text-xs text-slate-400">Direct Transactional Write-Back Enabled</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {solverResult?.alternatives.map((alt) => {
            const isExecuted = executedDecision?.selected_option === alt.action;
            const isViolatingBudget = alt.estimated_cost > maxBudget;
            const isCurrentlyExecuting = executingOption === alt.action;

            return (
              <div
                key={alt.id}
                className={`rounded-xl border p-5 flex flex-col justify-between transition-all ${
                  alt.recommended
                    ? 'bg-indigo-950/20 border-indigo-500/60 shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-900 border-slate-800'
                } ${isViolatingBudget ? 'opacity-60' : ''}`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-400 font-mono">
                      OPTION {alt.id}
                    </span>
                    {alt.recommended && (
                      <span className="text-[11px] font-semibold text-indigo-400">
                        Mathematically Recommended
                      </span>
                    )}
                    {isViolatingBudget && (
                      <span className="text-[11px] text-red-400 font-mono">
                        Exceeds Budget Constraint
                      </span>
                    )}
                  </div>

                  <h3 className="text-base font-bold text-white">{alt.name}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed min-h-[36px]">
                    {alt.description}
                  </p>

                  {/* Quantitative Trade-Offs Matrix */}
                  <div className="space-y-2 py-3 border-y border-slate-800/80 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <DollarSign className="w-3.5 h-3.5 text-slate-500" />
                        Estimated Cost:
                      </span>
                      <span className="font-mono font-bold text-white tabular-nums">
                        ${alt.estimated_cost.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-500" />
                        Days Saved:
                      </span>
                      <span className="font-mono font-bold text-emerald-400 tabular-nums">
                        +{alt.days_saved} Days
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Residual Delay:</span>
                      <span className="font-mono text-slate-300 tabular-nums">
                        {alt.remaining_delay} Days (${(alt.remaining_delay * 1200).toLocaleString()})
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Speed / CapEx:</span>
                      <span className="font-medium text-slate-300">
                        {alt.speed_rating}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Action Button */}
                <div className="pt-4">
                  {isExecuted ? (
                    <div className="w-full py-2 px-3 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-medium flex items-center justify-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Committed to Snowflake DW</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleExecute(alt.action, alt.description, alt.estimated_cost)}
                      disabled={isViolatingBudget || isCurrentlyExecuting || isLoadingSolver}
                      className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs font-semibold transition-colors shadow-sm ${
                        alt.recommended
                          ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      } ${isViolatingBudget ? 'cursor-not-allowed opacity-50' : ''}`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isCurrentlyExecuting ? 'Writing back...' : `Execute Option ${alt.id}`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transactional Write-Back Confirmation & 3-Week Closed Loop Simulator */}
      {executedDecision && (
        <div className="p-5 rounded-xl bg-slate-900 border border-indigo-900/60 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-indigo-400">
                <Database className="w-4 h-4" />
                <span>Transactional Write-Back Recorded to Snowflake Data Warehouse</span>
              </div>
              <p className="text-xs text-slate-300">
                Decision ID <code className="text-white font-mono">{executedDecision.decision_id}</code> was inserted into table <code className="text-slate-300 font-mono">LOGISTICS_DW.WRITEBACK.DECISION_LOGS</code> via transaction <code className="text-indigo-300 font-mono">{executedDecision.snowflake_tx_id}</code>.
              </p>
            </div>
            <div className="text-xs font-mono text-slate-400">
              {new Date(executedDecision.executed_at).toLocaleTimeString()}
            </div>
          </div>

          {/* 3-Week Ground Truth Simulator Panel */}
          <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                  The Closed Loop: 3-Week Ground-Truth Evaluation Simulator
                </h4>
                <p className="text-[11px] text-slate-400">
                  Simulate the passage of 3 weeks when actual invoices and logistics outcomes arrive. In the prompt's microchip case, Air Freight estimated at $15k actually realized at $18k due to spot surcharges!
                </p>
              </div>
              {outcomeEvaluationSuccess && (
                <span className="text-xs text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ground Truth Evaluated</span>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Realized Actual Cost ($ USD)
                </label>
                <input
                  type="number"
                  value={realizedCostInput}
                  onChange={(e) => setRealizedCostInput(e.target.value)}
                  className="w-full bg-slate-900 font-mono text-xs text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Original Estimate: ${executedDecision.estimated_cost.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  Realized Delay Days
                </label>
                <input
                  type="number"
                  value={realizedDelayInput}
                  onChange={(e) => setRealizedDelayInput(e.target.value)}
                  className="w-full bg-slate-900 font-mono text-xs text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
                />
                <span className="text-[10px] text-slate-500 block mt-0.5">
                  Targeted Residual: 0 days
                </span>
              </div>

              <div className="flex items-end">
                <button
                  onClick={handleSimulateOutcome}
                  disabled={isEvaluating}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded transition-colors shadow-sm"
                >
                  <span>{isEvaluating ? 'Evaluating...' : 'Record Actual Outcome'}</span>
                </button>
              </div>
            </div>

            {outcomeEvaluationSuccess && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
                <div className="text-slate-300">
                  Variance recorded: Realized cost <strong className="text-white font-mono">${Number(realizedCostInput).toLocaleString()}</strong> vs estimate <strong className="text-white font-mono">${executedDecision.estimated_cost.toLocaleString()}</strong>.
                  Cost Variance: <strong className="text-amber-400 font-mono">+${(Number(realizedCostInput) - executedDecision.estimated_cost).toLocaleString()}</strong>.
                </div>
                <button
                  onClick={onGoToClosedLoop}
                  className="flex items-center gap-1.5 text-xs font-semibold text-indigo-400 hover:text-indigo-300 whitespace-nowrap"
                >
                  <span>View Decision ROI & Retrain Solver</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
