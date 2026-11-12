import React, { useState } from 'react';
import { DecisionRoiDashboard, CalibratedCostFactors } from '../types/supplyChain';
import {
  TrendingUp,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  Cpu,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

interface DecisionRoiViewProps {
  roiData: DecisionRoiDashboard | null;
  calibratedFactors: CalibratedCostFactors | null;
  onTriggerRetrain: () => Promise<void>;
  isRetraining: boolean;
  retrainSuccessData: any | null;
}

export const DecisionRoiView: React.FC<DecisionRoiViewProps> = ({
  roiData,
  calibratedFactors,
  onTriggerRetrain,
  isRetraining,
  retrainSuccessData
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'evaluations' | 'weights'>('metrics');

  if (!roiData) {
    return (
      <div className="p-8 text-center text-slate-400">
        Loading Decision ROI Dashboard...
      </div>
    );
  }

  const { summary, breakdown, recent_evaluations } = roiData;

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Closed-Loop Decision ROI & Calibration</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Continuous evaluation of executed operational decisions against realized ground-truth outcomes, automatically recalibrating future optimization weights.
          </p>
        </div>

        {/* Retrain Action Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={onTriggerRetrain}
            disabled={isRetraining}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRetraining ? 'animate-spin' : ''}`} />
            <span>{isRetraining ? 'Recalibrating Solver & Retraining...' : 'Trigger Closed-Loop Retrain'}</span>
          </button>
        </div>
      </div>

      {/* Recalibration Notice Banner */}
      {retrainSuccessData && (
        <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/50 flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Feedback Loop Executed · Solver & XGBoost Recalibrated</span>
            </div>
            <p className="text-xs text-slate-300">
              Model upgraded to <code className="text-indigo-200 font-mono">{retrainSuccessData.retrain_summary?.new_version}</code> on {retrainSuccessData.retrain_summary?.training_samples} ground-truth instances. Empirical cost multipliers recalibrated (Air Freight factor: <strong className="text-white font-mono">{retrainSuccessData.calibrated_cost_factors?.Air_Freight}x</strong>, Secondary Supplier: <strong className="text-white font-mono">{retrainSuccessData.calibrated_cost_factors?.Secondary_Supplier}x</strong>).
            </p>
          </div>
        </div>
      )}

      {/* Primary ROI Metric Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">Total Net Cost Savings</span>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            ${summary.net_cost_savings.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Baseline loss avoided minus realized mitigation CapEx
          </span>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">Decision ROI Percentage</span>
          <div className="text-2xl font-bold font-mono text-indigo-400 tabular-nums flex items-baseline gap-1">
            <span>+{summary.decision_roi_percentage}%</span>
            <ArrowUpRight className="w-4 h-4 text-indigo-400 inline" />
          </div>
          <span className="text-[11px] text-slate-500 block">
            Return on operational mitigation capital
          </span>
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">Unmitigated Baseline Risk</span>
          <div className="text-2xl font-bold font-mono text-red-400 tabular-nums">
            ${summary.unmitigated_baseline_loss.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Estimated loss if zero actions were taken
          </span>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
          <span className="text-[11px] text-slate-400 block">Avg Cost Variance / Decision</span>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            +${summary.avg_cost_variance_per_decision.toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-500 block">
            Realized cost vs estimated budget discrepancy
          </span>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 text-xs">
        <button
          onClick={() => setActiveSubTab('metrics')}
          className={`pb-2 px-3 font-semibold transition-colors ${
            activeSubTab === 'metrics'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Prescription Performance Breakdown
        </button>
        <button
          onClick={() => setActiveSubTab('evaluations')}
          className={`pb-2 px-3 font-semibold transition-colors ${
            activeSubTab === 'evaluations'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Ground-Truth Outcome History ({recent_evaluations.length})
        </button>
        <button
          onClick={() => setActiveSubTab('weights')}
          className={`pb-2 px-3 font-semibold transition-colors ${
            activeSubTab === 'weights'
              ? 'text-indigo-400 border-b-2 border-indigo-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Empirical Solver Weights & Multipliers
        </button>
      </div>

      {/* View 1: Breakdown by Option */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Mitigation Strategy Breakdown & Variance
              </h3>
              <span className="text-xs text-slate-400">
                Formula: Net Savings = Baseline Delay Penalty - (Realized Cost + Residual Penalty)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                    <th className="py-3 px-4">Action Strategy</th>
                    <th className="py-3 px-4 text-right">Decisions</th>
                    <th className="py-3 px-4 text-right">Estimated CapEx</th>
                    <th className="py-3 px-4 text-right">Realized CapEx</th>
                    <th className="py-3 px-4 text-right">Empirical Ratio</th>
                    <th className="py-3 px-4 text-right">Net Savings</th>
                    <th className="py-3 px-4 text-right">ROI Multiplier</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {Object.entries(breakdown).map(([opt, data]) => {
                    const ratio = data.estimated_cost > 0
                      ? (data.realized_cost / data.estimated_cost).toFixed(2)
                      : '1.00';
                    const roi = data.realized_cost > 0
                      ? Math.round((data.net_cost_savings / data.realized_cost) * 100)
                      : 0;

                    return (
                      <tr key={opt} className="hover:bg-slate-800/40">
                        <td className="py-3 px-4 font-semibold text-white">
                          {opt.replace(/_/g, ' ')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                          {data.count}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-400">
                          ${data.estimated_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                          ${data.realized_cost.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums">
                          <span className={Number(ratio) > 1.05 ? 'text-amber-400' : 'text-slate-300'}>
                            {ratio}x
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                          +${data.net_cost_savings.toLocaleString()}
                        </td>
                        <td className="py-3 px-4 text-right font-mono tabular-nums text-indigo-400">
                          {roi}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* View 2: Recent Outcome History */}
      {activeSubTab === 'evaluations' && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              3-Week Post-Execution Evaluated Records
            </h3>
            <span className="text-xs text-slate-400">
              Synchronized from <code className="text-slate-300 font-mono">LOGISTICS_DW.WRITEBACK.ACTUAL_OUTCOMES</code>
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                  <th className="py-3 px-4">Shipment & Executed Action</th>
                  <th className="py-3 px-4">Executed By</th>
                  <th className="py-3 px-4 text-right">Predicted Delay</th>
                  <th className="py-3 px-4 text-right">Est. Cost vs Realized</th>
                  <th className="py-3 px-4 text-right">Cost Variance</th>
                  <th className="py-3 px-4 text-right">Realized Delay</th>
                  <th className="py-3 px-4 text-right">Net Savings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recent_evaluations.map((row) => (
                  <tr key={row.outcome_id} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white font-mono">{row.shipment_id}</div>
                      <div className="text-[11px] text-slate-400">{row.selected_option.replace(/_/g, ' ')}</div>
                    </td>

                    <td className="py-3 px-4 text-slate-300 font-mono text-[11px]">
                      {row.executed_by}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {row.predicted_delay_days}d (${(row.predicted_delay_days * 1200).toLocaleString()})
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="text-white">${row.realized_cost.toLocaleString()}</div>
                      <div className="text-[10px] text-slate-500">est: ${row.estimated_cost.toLocaleString()}</div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <span className={row.cost_variance > 0 ? 'text-amber-400' : 'text-emerald-400'}>
                        {row.cost_variance > 0 ? `+$${row.cost_variance.toLocaleString()}` : '$0'}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                      {row.realized_delay_days} days
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400 font-semibold">
                      +${row.net_savings.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View 3: Empirical Solver Multipliers */}
      {activeSubTab === 'weights' && calibratedFactors && (
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Solver Empirical Cost Multipliers
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              These factors calibrate the base candidate costs in the PuLP optimization solver based on historical outcome variance.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block">Air Freight Factor</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {calibratedFactors.Air_Freight.toFixed(3)}x
              </div>
              <span className="text-[10px] text-amber-400 block">
                Base $15k &rarr; Effective ${(15000 * calibratedFactors.Air_Freight).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block">Secondary Supplier Factor</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {calibratedFactors.Secondary_Supplier.toFixed(3)}x
              </div>
              <span className="text-[10px] text-indigo-400 block">
                Base $8k &rarr; Effective ${(8000 * calibratedFactors.Secondary_Supplier).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block">Production Rescheduling</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                {calibratedFactors.Production_Rescheduling.toFixed(3)}x
              </div>
              <span className="text-[10px] text-slate-400 block">
                Base $3k &rarr; Effective ${(3000 * calibratedFactors.Production_Rescheduling).toLocaleString()}
              </span>
            </div>

            <div className="p-4 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
              <span className="text-[11px] text-slate-400 block">Launch Delay Penalty</span>
              <div className="text-xl font-bold font-mono text-white tabular-nums">
                $1,200 / day
              </div>
              <span className="text-[10px] text-slate-400 block">
                Commercial penalty rate
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
