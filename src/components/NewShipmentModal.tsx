import React, { useState } from 'react';
import { ItemCategory, OriginLocation, DestinationLocation } from '../types/supplyChain';
import { X, Plus, Sparkles } from 'lucide-react';

interface NewShipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateShipment: (data: any) => Promise<void>;
}

export const NewShipmentModal: React.FC<NewShipmentModalProps> = ({
  isOpen,
  onClose,
  onCreateShipment
}) => {
  const [supplierId, setSupplierId] = useState('SUPP-104');
  const [category, setCategory] = useState<ItemCategory>('Microchips');
  const [origin, setOrigin] = useState<OriginLocation>('Taiwan');
  const [destination, setDestination] = useState<DestinationLocation>('USA-West');
  const [leadTime, setLeadTime] = useState<number>(28);
  const [reliability, setReliability] = useState<number>(0.72);
  const [weatherRisk, setWeatherRisk] = useState<number>(0.85);
  const [congestion, setCongestion] = useState<number>(2.15);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onCreateShipment({
        supplier_id: supplierId,
        item_category: category,
        origin,
        destination,
        baseline_lead_time_days: Number(leadTime),
        supplier_reliability_score: Number(reliability),
        weather_risk_index: Number(weatherRisk),
        logistics_congestion_factor: Number(congestion)
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadPreset = (preset: 'microchip_crisis' | 'battery_disruption' | 'nominal_parts') => {
    if (preset === 'microchip_crisis') {
      setSupplierId('SUPP-104');
      setCategory('Microchips');
      setOrigin('Taiwan');
      setDestination('USA-West');
      setLeadTime(28);
      setReliability(0.68);
      setWeatherRisk(0.88);
      setCongestion(2.2);
    } else if (preset === 'battery_disruption') {
      setSupplierId('SUPP-109');
      setCategory('Industrial Batteries');
      setOrigin('South Korea');
      setDestination('Europe-Central');
      setLeadTime(35);
      setReliability(0.78);
      setWeatherRisk(0.65);
      setCongestion(1.6);
    } else {
      setSupplierId('SUPP-112');
      setCategory('Automotive Parts');
      setOrigin('Germany');
      setDestination('USA-East');
      setLeadTime(18);
      setReliability(0.95);
      setWeatherRisk(0.2);
      setCongestion(0.9);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Simulate New Inbound Shipment</h2>
            <p className="text-xs text-slate-400">Inject telemetry data for XGBoost delay risk evaluation.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Quick Presets */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Quick Scenarios:
            </span>
            <div className="flex flex-wrap gap-2 text-xs">
              <button
                type="button"
                onClick={() => loadPreset('microchip_crisis')}
                className="px-2.5 py-1 bg-amber-950/60 border border-amber-600/40 text-amber-300 rounded hover:bg-amber-900/60"
              >
                14-Day Microchip Crisis
              </button>
              <button
                type="button"
                onClick={() => loadPreset('battery_disruption')}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
              >
                Battery Freight Delay
              </button>
              <button
                type="button"
                onClick={() => loadPreset('nominal_parts')}
                className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded hover:bg-slate-700"
              >
                Nominal Transit
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Item Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ItemCategory)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="Microchips">Microchips</option>
                <option value="Industrial Batteries">Industrial Batteries</option>
                <option value="Raw Steel">Raw Steel</option>
                <option value="Automotive Parts">Automotive Parts</option>
                <option value="Consumer Electronics">Consumer Electronics</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Supplier ID</label>
              <input
                type="text"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full bg-slate-950 font-mono text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Origin Port</label>
              <select
                value={origin}
                onChange={(e) => setOrigin(e.target.value as OriginLocation)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="Taiwan">Taiwan</option>
                <option value="South Korea">South Korea</option>
                <option value="Germany">Germany</option>
                <option value="China">China</option>
                <option value="Japan">Japan</option>
              </select>
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Destination Hub</label>
              <select
                value={destination}
                onChange={(e) => setDestination(e.target.value as DestinationLocation)}
                className="w-full bg-slate-950 text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              >
                <option value="USA-West">USA-West</option>
                <option value="USA-East">USA-East</option>
                <option value="Europe-Central">Europe-Central</option>
                <option value="Mexico">Mexico</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="text-slate-300 block mb-1">Lead Time (Days)</label>
              <input
                type="number"
                value={leadTime}
                onChange={(e) => setLeadTime(Number(e.target.value))}
                className="w-full bg-slate-950 font-mono text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Supplier Reliability (0.6 - 1.0)</label>
              <input
                type="number"
                step="0.01"
                min="0.5"
                max="1.0"
                value={reliability}
                onChange={(e) => setReliability(Number(e.target.value))}
                className="w-full bg-slate-950 font-mono text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Weather Risk Index (0.0 - 1.0)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={weatherRisk}
                onChange={(e) => setWeatherRisk(Number(e.target.value))}
                className="w-full bg-slate-950 font-mono text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="text-slate-300 block mb-1">Congestion Factor (0.5 - 2.5x)</label>
              <input
                type="number"
                step="0.05"
                min="0.5"
                max="3.0"
                value={congestion}
                onChange={(e) => setCongestion(Number(e.target.value))}
                className="w-full bg-slate-950 font-mono text-white border border-slate-800 rounded px-2.5 py-1.5 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Injecting...' : 'Inject & Run Predictions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
