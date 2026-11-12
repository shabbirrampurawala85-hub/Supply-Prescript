import React from 'react';
import { RefreshCw, PlusCircle, Database, Layers, TrendingUp, Sliders, Download } from 'lucide-react';

interface TopNavProps {
  activeTab: 'operations' | 'solver' | 'roi' | 'snowflake';
  setActiveTab: (tab: 'operations' | 'solver' | 'roi' | 'snowflake') => void;
  onOpenNewShipment: () => void;
  onRefreshData: () => void;
  isRefreshing: boolean;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  setActiveTab,
  onOpenNewShipment,
  onRefreshData,
  isRefreshing
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-30">
      {/* Zone 1: Single text element wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-sm font-bold text-sm tracking-tighter">
          SP
        </div>
        <span className="text-base font-semibold tracking-tight text-white whitespace-nowrap">
          Supply Prescript
        </span>
      </div>

      {/* Zone 2: 4 clean single-line text navigation links */}
      <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-300">
        <button
          onClick={() => setActiveTab('operations')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'operations'
              ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Operations Hub</span>
        </button>

        <button
          onClick={() => setActiveTab('solver')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'solver'
              ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Prescriptive Solver</span>
        </button>

        <button
          onClick={() => setActiveTab('roi')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'roi'
              ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Decision ROI & Closed Loop</span>
        </button>

        <button
          onClick={() => setActiveTab('snowflake')}
          className={`flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0 pb-0.5 ${
            activeTab === 'snowflake'
              ? 'text-indigo-400 border-b-2 border-indigo-400 font-semibold'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Snowflake Warehouse</span>
        </button>
      </nav>

      {/* Zone 3: 1 primary action with refresh affordance */}
      <div className="flex items-center gap-2.5 shrink-0">
        <a
          href="/Supply_Prescript_Presentation.pptx"
          download="Supply_Prescript_Presentation.pptx"
          title="Download Presentation Slides (.pptx)"
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-md transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-indigo-400" />
          <span>Download PPTX</span>
        </a>

        <button
          onClick={onRefreshData}
          title="Refresh Data"
          disabled={isRefreshing}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
        </button>

        <button
          onClick={onOpenNewShipment}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-500 transition-colors whitespace-nowrap shrink-0 shadow-sm"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Simulate Shipment</span>
        </button>
      </div>
    </header>
  );
};
