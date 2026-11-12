import React, { useState, useEffect, useCallback } from 'react';
import { TopNav } from './components/TopNav';
import { ShipmentList } from './components/ShipmentList';
import { PrescriptiveSolverView } from './components/PrescriptiveSolverView';
import { DecisionRoiView } from './components/DecisionRoiView';
import { SnowflakeConsole } from './components/SnowflakeConsole';
import { NewShipmentModal } from './components/NewShipmentModal';
import {
  Shipment,
  Prediction,
  DecisionRoiDashboard,
  CalibratedCostFactors,
  ActionOptionName,
  ActualOutcome
} from './types/supplyChain';
import { CheckCircle2, AlertCircle, Sparkles, X } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'operations' | 'solver' | 'roi' | 'snowflake'>('operations');
  const [shipments, setShipments] = useState<(Shipment & { latest_prediction: Prediction | null })[]>([]);
  const [selectedShipmentId, setSelectedShipmentId] = useState<string>('SHIP-10000');
  const [roiData, setRoiData] = useState<DecisionRoiDashboard | null>(null);
  const [calibratedFactors, setCalibratedFactors] = useState<CalibratedCostFactors | null>(null);

  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isPredictingId, setIsPredictingId] = useState<string | null>(null);
  const [isRetraining, setIsRetraining] = useState<boolean>(false);
  const [retrainSuccessData, setRetrainSuccessData] = useState<any | null>(null);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [isNewShipmentOpen, setIsNewShipmentOpen] = useState<boolean>(false);

  const [toastMessage, setToastMessage] = useState<{
    type: 'success' | 'info';
    title: string;
    description: string;
  } | null>(null);

  // Load all initial data
  const fetchData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const [shipmentsRes, roiRes, calibRes] = await Promise.all([
        fetch('/api/shipments'),
        fetch('/api/roi-dashboard'),
        fetch('/api/solver/calibration')
      ]);

      const shipmentsJson = await shipmentsRes.json();
      const roiJson = await roiRes.json();
      const calibJson = await calibRes.json();

      setShipments(shipmentsJson.shipments || []);
      setRoiData(roiJson);
      setCalibratedFactors(calibJson);
    } catch (err) {
      console.error('Failed to load application data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toast auto-clear
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleSelectShipmentForSolver = (shipmentId: string) => {
    setSelectedShipmentId(shipmentId);
    setActiveTab('solver');
  };

  const handleRunPrediction = async (shipmentId: string) => {
    setIsPredictingId(shipmentId);
    try {
      const res = await fetch(`/api/predict/${shipmentId}`, { method: 'POST' });
      const data = await res.json();
      setToastMessage({
        type: 'info',
        title: `XGBoost Prediction: ${shipmentId}`,
        description: `Delay probability: ${(data.delay_probability * 100).toFixed(0)}%, predicted duration: +${data.predicted_delay_days} days (${data.alert_level} Alert).`
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsPredictingId(null);
    }
  };

  const handleExecuteDecision = async (
    shipmentId: string,
    option: ActionOptionName,
    desc: string,
    cost: number
  ) => {
    try {
      const res = await fetch('/api/execute-decision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipmentId,
          selected_option: option,
          option_description: desc,
          estimated_cost: cost,
          executed_by: 'logistics_manager_alice'
        })
      });

      if (!res.ok) {
        throw new Error('Failed to write back decision');
      }

      const data = await res.json();
      setToastMessage({
        type: 'success',
        title: 'Snowflake Write-Back Committed',
        description: `Decision #${data.decision_id} for ${shipmentId} (${option.replace(/_/g, ' ')}) recorded under tx ${data.snowflake_tx_id}.`
      });

      await fetchData();
      return { decision_id: data.decision_id, snowflake_tx_id: data.snowflake_tx_id };
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleEvaluateOutcome = async (
    shipmentId: string,
    realizedCost: number,
    realizedDelay: number,
    notes: string
  ): Promise<ActualOutcome | null> => {
    try {
      const res = await fetch('/api/evaluate-outcome', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shipment_id: shipmentId,
          realized_cost: realizedCost,
          realized_delay_days: realizedDelay,
          notes
        })
      });

      if (!res.ok) throw new Error('Failed to evaluate outcome');
      const data = await res.json();

      setToastMessage({
        type: 'success',
        title: '3-Week Outcome Evaluated',
        description: `Ground-truth realized cost $${realizedCost.toLocaleString()} recorded. Cost variance: +$${data.cost_variance.toLocaleString()}.`
      });

      await fetchData();
      return data.outcome;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const handleTriggerRetrain = async () => {
    setIsRetraining(true);
    try {
      const res = await fetch('/api/retrain-closed-loop', { method: 'POST' });
      const data = await res.json();
      setRetrainSuccessData(data);
      setCalibratedFactors(data.calibrated_cost_factors);

      setToastMessage({
        type: 'success',
        title: 'Closed Loop Recalibrated',
        description: `Empirical multipliers and XGBoost retrained on ${data.retrain_summary?.training_samples} ground-truth points.`
      });

      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRetraining(false);
    }
  };

  const handleResetSeedData = async () => {
    setIsResetting(true);
    try {
      await fetch('/api/seed/reset', { method: 'POST' });
      setRetrainSuccessData(null);
      setToastMessage({
        type: 'info',
        title: 'Demo State Reset',
        description: 'Clean initial dataset and uncalibrated baseline weights restored.'
      });
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      setIsResetting(false);
    }
  };

  const handleCreateShipment = async (payload: any) => {
    try {
      const res = await fetch('/api/shipments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const newShipment = await res.json();

      // Immediately run prediction on newly injected shipment
      await fetch(`/api/predict/${newShipment.shipment_id}`, { method: 'POST' });

      setToastMessage({
        type: 'success',
        title: 'Shipment Injected & Evaluated',
        description: `${newShipment.shipment_id} (${newShipment.item_category}) evaluated by XGBoost model.`
      });

      await fetchData();
      setSelectedShipmentId(newShipment.shipment_id);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* 3-Zone Top Navigation Contract */}
      <TopNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenNewShipment={() => setIsNewShipmentOpen(true)}
        onRefreshData={fetchData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6">
        {/* Toast Notification */}
        {toastMessage && (
          <div className="mb-5 p-3.5 rounded-lg bg-indigo-950/80 border border-indigo-500/60 shadow-lg flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <strong className="text-white block">{toastMessage.title}</strong>
                <span className="text-slate-300">{toastMessage.description}</span>
              </div>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Tab 1: Operations Hub */}
        {activeTab === 'operations' && (
          <ShipmentList
            shipments={shipments}
            onSelectShipment={handleSelectShipmentForSolver}
            onRunPrediction={handleRunPrediction}
            isPredictingId={isPredictingId}
          />
        )}

        {/* Tab 2: Prescriptive Solver */}
        {activeTab === 'solver' && (
          <PrescriptiveSolverView
            selectedShipmentId={selectedShipmentId}
            shipments={shipments}
            onSelectShipment={setSelectedShipmentId}
            onExecuteDecision={handleExecuteDecision}
            onEvaluateOutcome={handleEvaluateOutcome}
            onGoToClosedLoop={() => setActiveTab('roi')}
          />
        )}

        {/* Tab 3: Decision ROI & Closed Loop */}
        {activeTab === 'roi' && (
          <DecisionRoiView
            roiData={roiData}
            calibratedFactors={calibratedFactors}
            onTriggerRetrain={handleTriggerRetrain}
            isRetraining={isRetraining}
            retrainSuccessData={retrainSuccessData}
          />
        )}

        {/* Tab 4: Snowflake Data Warehouse Console */}
        {activeTab === 'snowflake' && (
          <SnowflakeConsole
            onResetSeedData={handleResetSeedData}
            isResetting={isResetting}
          />
        )}
      </main>

      {/* New Shipment Modal */}
      <NewShipmentModal
        isOpen={isNewShipmentOpen}
        onClose={() => setIsNewShipmentOpen(false)}
        onCreateShipment={handleCreateShipment}
      />

      {/* Quiet Corporate Footer */}
      <footer className="border-t border-slate-900 px-6 py-4 text-center text-xs text-slate-500">
        Supply Prescript · Closed-Loop Operations Research & Transactional Snowflake Architecture
      </footer>
    </div>
  );
}
