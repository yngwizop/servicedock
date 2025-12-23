import React from 'react';
import { ListChecks, XCircle, ArrowsClockwise, CheckCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Task Summary an - gruppiert nach Nodes wie im PDM
 */
function TaskSummaryCard({ stats }) {
  const { failed, running, success, by_node } = stats;
  const total = failed + running + success;

  return (
    <StatCard 
      title="Task Summary" 
      icon={<ListChecks size={28} weight="duotone" />}
    >
      {total > 0 && by_node && by_node.length > 0 ? (
        <div className="space-y-1.5">
          {by_node.map((nodeData, index) => {
            const nodeTotal = nodeData.failed + nodeData.running + nodeData.success;
            
            return (
              <div 
                key={nodeData.node}
                className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                {/* Node Name */}
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">
                    {nodeData.node}
                  </div>
                </div>

                {/* Counts - kompakt */}
                <div className="flex items-center gap-2">
                  {/* Failed */}
                  <div className="flex items-center gap-1">
                    <XCircle size={14} weight="fill" className="text-red-500" />
                    <span className="text-xs font-bold text-red-600 dark:text-red-400 w-4 text-right">
                      {nodeData.failed}
                    </span>
                  </div>

                  {/* Running */}
                  <div className="flex items-center gap-1">
                    <ArrowsClockwise size={14} weight="bold" className="text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 w-4 text-right">
                      {nodeData.running}
                    </span>
                  </div>

                  {/* Success */}
                  <div className="flex items-center gap-1">
                    <CheckCircle size={14} weight="fill" className="text-green-500" />
                    <span className="text-xs font-bold text-green-600 dark:text-green-400 w-6 text-right">
                      {nodeData.success}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Summary Footer - kompakter */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Total</span>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <XCircle size={14} weight="fill" className="text-red-500" />
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 w-4 text-right">{failed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowsClockwise size={14} weight="bold" className="text-yellow-500" />
                  <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400 w-4 text-right">{running}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={14} weight="fill" className="text-green-500" />
                  <span className="text-xs font-bold text-green-600 dark:text-green-400 w-6 text-right">{success}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-4 text-slate-500 dark:text-slate-400 text-sm">
          Keine Tasks im konfigurierten Zeitraum
        </div>
      )}
    </StatCard>
  );
}

export default TaskSummaryCard;
