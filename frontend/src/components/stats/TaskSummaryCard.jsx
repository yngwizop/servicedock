import React from 'react';
import { ListChecks, XCircle, ArrowsClockwise, CheckCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Task Summary an - gruppiert nach Nodes wie im PDM
 */
function TaskSummaryCard({ stats }) {
  const { failed, running, success, by_node } = stats;
  const total = failed + running + success;
  
  // Health Status basierend auf Failed Tasks
  const getHealthStatus = () => {
    if (total === 0) return { label: 'No Tasks', color: 'text-slate-500', bgColor: 'bg-slate-500/10' };
    const failRate = (failed / total) * 100;
    if (failRate === 0) return { label: 'Perfect', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (failRate < 5) return { label: 'Good', color: 'text-green-500', bgColor: 'bg-green-500/10' };
    if (failRate < 15) return { label: 'Warning', color: 'text-orange-500', bgColor: 'bg-orange-500/10' };
    return { label: 'Critical', color: 'text-red-500', bgColor: 'bg-red-500/10' };
  };
  
  const health = getHealthStatus();

  return (
    <StatCard 
      title="Task Summary" 
      icon={<ListChecks size={28} weight="duotone" />}
    >
      {total > 0 && by_node && by_node.length > 0 ? (
        <div className="flex flex-col h-full">
          {/* Mini Stat - Task Health */}
          <div className={`mb-3 px-2 py-1 rounded-md ${health.bgColor} flex items-center justify-between`}>
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Status</span>
            <span className={`text-xs font-bold ${health.color}`}>{health.label}</span>
          </div>

          {/* Node Tasks */}
          <div className="space-y-2 flex-1">
            {by_node.map((nodeData, index) => {
              const nodeTotal = nodeData.failed + nodeData.running + nodeData.success;
              
              return (
                <div 
                  key={nodeData.node}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                >
                  {/* Node Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-800 dark:text-slate-100 truncate">
                      {nodeData.node}
                    </div>
                  </div>

                  {/* Counts - größer und einheitlich */}
                  <div className="flex items-center gap-2">
                    {/* Failed */}
                    <div className="flex items-center gap-1">
                      <XCircle size={16} weight="fill" className="text-red-500" />
                      <span className="text-sm font-bold text-red-600 dark:text-red-400 w-5 text-right">
                        {nodeData.failed}
                      </span>
                    </div>

                    {/* Running */}
                    <div className="flex items-center gap-1">
                      <ArrowsClockwise size={16} weight="bold" className="text-yellow-500" />
                      <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 w-5 text-right">
                        {nodeData.running}
                      </span>
                    </div>

                    {/* Success */}
                    <div className="flex items-center gap-1">
                      <CheckCircle size={16} weight="fill" className="text-green-500" />
                      <span className="text-sm font-bold text-green-600 dark:text-green-400 w-7 text-right">
                        {nodeData.success}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Total - am Ende auf gleicher Höhe */}
          <div className="border-t border-slate-200 dark:border-slate-700 pt-2 mt-2">
            <div className="flex items-center justify-between p-1.5">
              <div className="flex-1 min-w-0">
                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Total</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <XCircle size={16} weight="fill" className="text-red-500" />
                  <span className="text-sm font-bold text-red-600 dark:text-red-400 w-5 text-right">{failed}</span>
                </div>
                <div className="flex items-center gap-1">
                  <ArrowsClockwise size={16} weight="bold" className="text-yellow-500" />
                  <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400 w-5 text-right">{running}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CheckCircle size={16} weight="fill" className="text-green-500" />
                  <span className="text-sm font-bold text-green-600 dark:text-green-400 w-7 text-right">{success}</span>
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
