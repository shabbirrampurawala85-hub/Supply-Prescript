import React, { useState, useEffect } from 'react';
import { SnowflakeAuditLog } from '../types/supplyChain';
import { Database, Play, CheckCircle2, RotateCcw, Terminal } from 'lucide-react';

interface SnowflakeConsoleProps {
  onResetSeedData: () => Promise<void>;
  isResetting: boolean;
}

export const SnowflakeConsole: React.FC<SnowflakeConsoleProps> = ({
  onResetSeedData,
  isResetting
}) => {
  const [warehouseInfo, setWarehouseInfo] = useState<any>(null);
  const [sqlQuery, setSqlQuery] = useState<string>(
    'SELECT * FROM LOGISTICS_DW.WRITEBACK.DECISION_LOGS ORDER BY decision_id DESC LIMIT 10;'
  );
  const [queryResult, setQueryResult] = useState<any>(null);
  const [isExecutingSql, setIsExecutingSql] = useState<boolean>(false);

  const fetchWarehouseData = () => {
    fetch('/api/snowflake/tables')
      .then((res) => res.json())
      .then((data) => setWarehouseInfo(data))
      .catch((err) => console.error(err));
  };

  useEffect(() => {
    fetchWarehouseData();
  }, []);

  const handleExecuteSql = async () => {
    if (!sqlQuery.trim()) return;
    setIsExecutingSql(true);
    try {
      const res = await fetch('/api/snowflake/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql: sqlQuery })
      });
      const data = await res.json();
      setQueryResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingSql(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Editorial Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Snowflake Data Warehouse & Write-Back Console</h1>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Bidirectional transactional write-back pipeline connecting operational decision logging, model predictions, and post-delivery outcome tables.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onResetSeedData}
            disabled={isResetting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? 'animate-spin' : ''}`} />
            <span>Reset Demo State</span>
          </button>
        </div>
      </div>

      {/* Snowflake Cluster & Table Architecture Strip */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <span className="text-[11px] text-slate-400 block">Warehouse Instance</span>
          <div className="text-base font-semibold text-white font-mono flex items-center gap-1.5 mt-0.5">
            <Database className="w-4 h-4 text-sky-400" />
            <span>LOGISTICS_WH</span>
          </div>
          <span className="text-[11px] text-emerald-400 block">Status: ONLINE (X-Small)</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Database & Schema</span>
          <div className="text-base font-semibold text-white font-mono mt-0.5">
            LOGISTICS_DW.WRITEBACK
          </div>
          <span className="text-[11px] text-slate-500 block">Role: LOGISTICS_WRITEBACK_ROLE</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Active Model In-Production</span>
          <div className="text-sm font-semibold text-indigo-400 font-mono mt-0.5">
            {warehouseInfo?.model_version || 'xgboost_v1.0'}
          </div>
          <span className="text-[11px] text-slate-500 block">Tree Regressor + Classifier</span>
        </div>

        <div>
          <span className="text-[11px] text-slate-400 block">Snowflake Pipeline State</span>
          <div className="text-sm font-semibold text-slate-200 mt-0.5 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Transactional Mutex Active</span>
          </div>
          <span className="text-[11px] text-slate-500 block">ACID Compliant Write-Back</span>
        </div>
      </div>

      {/* Table Statistics Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {warehouseInfo?.tables?.map((table: { name: string; row_count: number }) => (
          <div key={table.name} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-[11px] font-mono text-slate-400 block truncate">{table.name}</span>
            <div className="text-lg font-bold font-mono text-white tabular-nums mt-0.5">
              {table.row_count} rows
            </div>
          </div>
        ))}
      </div>

      {/* SQL Query Console */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden space-y-0">
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-white">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span>Interactive Snowflake SQL Console</span>
          </div>

          {/* Preset query buttons */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM LOGISTICS_DW.WRITEBACK.DECISION_LOGS ORDER BY decision_id DESC;');
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              DECISION_LOGS
            </button>
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM LOGISTICS_DW.WRITEBACK.ACTUAL_OUTCOMES ORDER BY outcome_id DESC;');
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              ACTUAL_OUTCOMES
            </button>
            <button
              onClick={() => {
                setSqlQuery('SELECT * FROM LOGISTICS_DW.WRITEBACK.CALIBRATED_COST_FACTORS;');
              }}
              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono"
            >
              CALIBRATED_FACTORS
            </button>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <div className="relative">
            <textarea
              rows={3}
              value={sqlQuery}
              onChange={(e) => setSqlQuery(e.target.value)}
              className="w-full bg-slate-950 font-mono text-xs text-indigo-200 border border-slate-800 rounded-lg p-3 focus:outline-none focus:border-indigo-500 selection:bg-indigo-600"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Direct connection to managed Snowflake warehouse session
            </span>
            <button
              onClick={handleExecuteSql}
              disabled={isExecutingSql}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors shadow-sm disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>{isExecutingSql ? 'Running query...' : 'Run Query'}</span>
            </button>
          </div>

          {/* Results table */}
          {queryResult && (
            <div className="mt-3 pt-3 border-t border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span>Result: <strong className="text-white font-mono">{queryResult.rows?.length || 0} rows</strong></span>
                <span className="font-mono text-slate-500">Elapsed: {queryResult.execution_time_ms}ms</span>
              </div>
              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                <pre className="p-3 text-[11px] font-mono text-slate-300 bg-slate-950/70 overflow-x-auto">
                  {JSON.stringify(queryResult.rows, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Transactional Write-Back Audit Log */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Transactional Write-Back Audit Stream
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Live transaction stream verifying INSERT and UPDATE operations sent from the UI into the data warehouse.
            </p>
          </div>
          <span className="text-xs font-mono text-slate-400">
            {warehouseInfo?.audit_logs?.length || 0} Transactions
          </span>
        </div>

        <div className="divide-y divide-slate-800/60 font-mono text-xs">
          {warehouseInfo?.audit_logs?.map((log: SnowflakeAuditLog) => (
            <div key={log.tx_id} className="p-4 hover:bg-slate-800/30 transition-colors space-y-1.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-indigo-400">{log.tx_id}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-300">{log.operation} ON {log.table_name}</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-slate-400 text-[11px]">{log.executed_by}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-[11px] font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>COMMITTED</span>
                  </span>
                  <span className="text-slate-500 text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              <div className="p-2 rounded bg-slate-950 text-slate-300 text-[11px] break-all border border-slate-800/50">
                {log.sql_statement}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
