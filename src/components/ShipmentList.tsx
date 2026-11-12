import React, { useState } from 'react';
import { Shipment, ItemCategory, Prediction } from '../types/supplyChain';
import { Search, AlertTriangle, ArrowRight, Sparkles, SlidersHorizontal, CheckCircle2 } from 'lucide-react';

interface ShipmentListProps {
  shipments: (Shipment & { latest_prediction: Prediction | null })[];
  onSelectShipment: (shipmentId: string) => void;
  onRunPrediction: (shipmentId: string) => void;
  isPredictingId: string | null;
}

export const ShipmentList: React.FC<ShipmentListProps> = ({
  shipments,
  onSelectShipment,
  onRunPrediction,
  isPredictingId
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Filtered shipments
  const filtered = shipments.filter((s) => {
    const matchesSearch =
      s.shipment_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.supplier_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.destination.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.item_category.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = categoryFilter === 'All' || s.item_category === categoryFilter;
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'DISRUPTIONS' && (s.status === 'DISRUPTION_FLAGGED' || (s.latest_prediction?.delay_probability || 0) >= 0.45)) ||
      (statusFilter === 'MITIGATED' && s.status === 'MITIGATION_EXECUTED') ||
      (statusFilter === 'CLOSED_LOOP' && s.status === 'EVALUATED_CLOSED_LOOP');

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const disruptionsCount = shipments.filter(
    (s) => s.status === 'DISRUPTION_FLAGGED' || (s.latest_prediction?.delay_probability || 0) >= 0.45
  ).length;

  const totalEvaluated = shipments.filter((s) => s.status === 'EVALUATED_CLOSED_LOOP').length;
  const pendingActions = shipments.filter((s) => s.status === 'DISRUPTION_FLAGGED').length;

  return (
    <div className="space-y-6">
      {/* Editorial Overview Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Supply Chain Operations Console</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Real-time telemetry tracking lead-time variances, XGBoost disruption forecasting, and mathematical mitigation prescriptions with transactional write-back.
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs text-slate-400">
          <span>Active Monitored: <strong className="text-white font-mono">{shipments.length}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Disruptions: <strong className="text-amber-400 font-mono">{disruptionsCount}</strong></span>
          <span aria-hidden="true">·</span>
          <span>Closed-Loop Evaluated: <strong className="text-emerald-400 font-mono">{totalEvaluated}</strong></span>
        </div>
      </div>

      {/* Featured Microchip Alert Box (Highlighting the User Use Case: SHIP-10000) */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-medium text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>High-Priority Disruption Detected · Urgent Action Required</span>
          </div>
          <h2 className="text-base font-semibold text-white">
            SHIP-10000 · Microchips · Impending 14-Day Lead-Time Disruption
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
            <span>Supplier SUPP-104 (Taiwan → USA-West)</span>
            <span aria-hidden="true">·</span>
            <span>Congestion: 2.15x</span>
            <span aria-hidden="true">·</span>
            <span>Weather Risk: 0.88</span>
            <span aria-hidden="true">·</span>
            <span>Est. Delay: <strong className="text-amber-300 font-mono">14.0 Days</strong></span>
            <span aria-hidden="true">·</span>
            <span>Commercial Penalty: <strong className="text-red-400 font-mono">$16,800</strong></span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => onSelectShipment('SHIP-10000')}
            className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-500 transition-colors shadow-sm"
          >
            <span>Run Prescriptive Solver</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Segmented Controls) */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pt-2">
        {/* Status Segmented Buttons */}
        <div className="flex items-center p-1 bg-slate-900 rounded-lg border border-slate-800 text-xs">
          <button
            onClick={() => setStatusFilter('All')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'All' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All Shipments ({shipments.length})
          </button>
          <button
            onClick={() => setStatusFilter('DISRUPTIONS')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'DISRUPTIONS' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Disruptions ({disruptionsCount})
          </button>
          <button
            onClick={() => setStatusFilter('CLOSED_LOOP')}
            className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap ${
              statusFilter === 'CLOSED_LOOP' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            Closed-Loop Evaluated ({totalEvaluated})
          </button>
        </div>

        {/* Category & Text Search */}
        <div className="flex items-center gap-2.5">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
          >
            <option value="All">All Categories</option>
            <option value="Microchips">Microchips</option>
            <option value="Industrial Batteries">Industrial Batteries</option>
            <option value="Raw Steel">Raw Steel</option>
            <option value="Automotive Parts">Automotive Parts</option>
            <option value="Consumer Electronics">Consumer Electronics</option>
          </select>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search shipment, supplier, lane..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 text-xs text-slate-200 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 w-56 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* High-Density Data Grid */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/60 text-slate-400 font-medium">
                <th className="py-3 px-4">Shipment & Supplier</th>
                <th className="py-3 px-4">Category & Lane</th>
                <th className="py-3 px-4 text-right">Lead Time</th>
                <th className="py-3 px-4 text-right">Congestion / Weather</th>
                <th className="py-3 px-4 text-right">Delay Risk (XGBoost)</th>
                <th className="py-3 px-4 text-right">Predicted Delay</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {filtered.map((s) => {
                const pred = s.latest_prediction;
                const prob = pred ? Math.round(pred.delay_probability * 100) : null;
                const delayDays = pred ? pred.predicted_delay_days : s.actual_delay_days;
                const isSelectedForPredict = isPredictingId === s.shipment_id;

                return (
                  <tr
                    key={s.shipment_id}
                    className={`hover:bg-slate-800/50 transition-colors ${
                      s.shipment_id === 'SHIP-10000' ? 'bg-indigo-950/20' : ''
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white font-mono">{s.shipment_id}</div>
                      <div className="text-[11px] text-slate-400">{s.supplier_id}</div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="text-slate-200 font-medium">{s.item_category}</div>
                      <div className="text-[11px] text-slate-400">
                        {s.origin} → {s.destination}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-300 tabular-nums">
                      {s.baseline_lead_time_days}d
                    </td>

                    <td className="py-3 px-4 text-right font-mono text-slate-400 tabular-nums text-[11px]">
                      <div>{s.logistics_congestion_factor.toFixed(2)}x cong</div>
                      <div>{(s.weather_risk_index * 100).toFixed(0)}% wx</div>
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      {prob !== null ? (
                        <div
                          className={`font-semibold ${
                            prob >= 75
                              ? 'text-red-400'
                              : prob >= 45
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {prob}% prob
                        </div>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                      {delayDays > 0 ? (
                        <span className="text-amber-400">+{delayDays} days</span>
                      ) : (
                        <span className="text-slate-400">0 days</span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      {s.status === 'DISRUPTION_FLAGGED' && (
                        <span className="text-amber-400 text-xs">Flagged for Solver</span>
                      )}
                      {s.status === 'MITIGATION_EXECUTED' && (
                        <span className="text-indigo-400 text-xs">Mitigation Executed</span>
                      )}
                      {s.status === 'EVALUATED_CLOSED_LOOP' && (
                        <span className="text-emerald-400 text-xs flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Evaluated</span>
                        </span>
                      )}
                      {s.status === 'PENDING_PREDICTION' && (
                        <span className="text-slate-400 text-xs">Nominal</span>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {!pred && (
                          <button
                            onClick={() => onRunPrediction(s.shipment_id)}
                            disabled={isSelectedForPredict}
                            className="px-2.5 py-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors whitespace-nowrap"
                          >
                            {isSelectedForPredict ? 'Evaluating...' : 'Predict'}
                          </button>
                        )}
                        <button
                          onClick={() => onSelectShipment(s.shipment_id)}
                          className="px-2.5 py-1 text-[11px] font-medium text-indigo-400 hover:text-white hover:bg-indigo-600 border border-indigo-500/40 rounded transition-colors whitespace-nowrap"
                        >
                          Prescribe
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
