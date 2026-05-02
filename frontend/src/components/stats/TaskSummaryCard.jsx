import React from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, XCircle, ArrowsClockwise, CheckCircle } from 'phosphor-react';
import StatCard from './StatCard';

/**
 * Zeigt Task Summary an - gruppiert nach Nodes wie im PDM
 */
function TaskSummaryCard({ stats }) {
  const { t } = useTranslation();
  const { failed, running, success, by_node } = stats;
  const total = failed + running + success;
  
  // Health Status basierend auf Failed Tasks
  const getHealthStatus = () => {
    if (total === 0) return { label: 'No Tasks', color: 'text-gray-500', bgColor: 'bg-gray-500/10' };
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
      compact
    >
      {total > 0 && by_node && by_node.length > 0 ? (
        <div className="flex flex-col">
          {/* Kein flex-1/h-full: sonst streckt die Liste die Zelle und erzeugt Leerraum vor „Total“ */}
          <div className="space-y-2">
            {by_node.map((nodeData, index) => {
              const nodeTotal = nodeData.failed + nodeData.running + nodeData.success;
              
              return (
                <div 
                  key={nodeData.node}
                  className="flex items-center justify-between p-1.5 rounded hover:bg-white/10 dark:hover:bg-white/5 night:hover:bg-sd-night-950/50 transition-colors"
                >
                  {/* Node Name */}
                  <div className="flex-1 min-w-0">
                    <div className="text-base font-medium text-gray-800 dark:text-white truncate">
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
          <div className="border-t border-gray-300/30 dark:border-white/10 pt-2 mt-2">
            <div className="flex items-center justify-between p-1.5">
              <div className="flex-1 min-w-0">
                <span className="text-base font-medium text-gray-700 dark:text-gray-200">Total</span>
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
        <div className="text-center py-4 text-gray-500 dark:text-gray-400 text-sm">
          {t('stats.no_tasks')}
        </div>
      )}
    </StatCard>
  );
}

export default TaskSummaryCard;
