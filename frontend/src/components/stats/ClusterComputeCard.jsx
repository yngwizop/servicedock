import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { Cpu } from 'phosphor-react';
import StatCard from './StatCard';

function barColor(percent) {
  if (percent >= 90) return 'bg-red-500';
  if (percent >= 75) return 'bg-orange-500';
  if (percent >= 50) return 'bg-yellow-500';
  return 'bg-green-500';
}

function textColor(percent) {
  if (percent >= 90) return 'text-red-600 dark:text-red-400';
  if (percent >= 75) return 'text-orange-600 dark:text-orange-400';
  if (percent >= 50) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-green-600 dark:text-green-400';
}

function formatBytes(bytes) {
  if (!bytes) return '0 GB';
  const tb = bytes / (1024 ** 4);
  if (tb >= 1) return `${tb.toFixed(2)} TB`;
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(1)} GB`;
}

/**
 * Aggregierte Host-CPU/RAM über alle online-Nodes + Top-Node-Last (keine VM-Doppelzählung).
 */
function ClusterComputeCard({
  computeCluster = null,
  topNode = null,
  topNodeMemory = null,
}) {
  const { t } = useTranslation();

  if (!computeCluster) {
    return (
      <StatCard
        title={t('statusDashboard.card_compute_cluster')}
        icon={<Cpu size={28} weight="duotone" />}
        compact
      >
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 py-6">
          {t('statusDashboard.compute_no_nodes')}
        </p>
      </StatCard>
    );
  }

  const cpuP = computeCluster.cpu_percent ?? 0;
  const ramP = computeCluster.ram_percent ?? 0;

  return (
    <StatCard
      title={t('statusDashboard.card_compute_cluster')}
      icon={<Cpu size={28} weight="duotone" />}
      compact
    >
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        {t('statusDashboard.compute_scope_hint')}
      </p>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-white/60 font-medium">CPU</span>
            <span className={`font-bold ${textColor(cpuP)}`}>{cpuP.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200/50 dark:bg-white/10 night:bg-sd-night-950/90 rounded-full h-2 overflow-hidden">
            <div
              className={`${barColor(cpuP)} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(cpuP, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {computeCluster.cpu_used_cores != null && computeCluster.cpu_total_cores != null
              ? t('statusDashboard.compute_cores_sub', {
                  used: Number(computeCluster.cpu_used_cores).toFixed(1),
                  total: computeCluster.cpu_total_cores,
                })
              : null}
          </div>
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-600 dark:text-white/60 font-medium">RAM</span>
            <span className={`font-bold ${textColor(ramP)}`}>{ramP.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200/50 dark:bg-white/10 night:bg-sd-night-950/90 rounded-full h-2 overflow-hidden">
            <div
              className={`${barColor(ramP)} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${Math.min(ramP, 100)}%` }}
            />
          </div>
          <div className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {formatBytes(computeCluster.ram_used_bytes)} / {formatBytes(computeCluster.ram_total_bytes)}
          </div>
        </div>
      </div>

      {topNode && (
        <div className="mt-4 pt-3 border-t border-gray-200/60 dark:border-white/10 night:border-white/[0.07]">
          <div className="text-xs font-semibold text-gray-600 dark:text-white/70 mb-1">
            {t('statusDashboard.compute_top_node')}
          </div>
          <div className="text-sm font-bold text-gray-900 dark:text-white">{topNode.node}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            {t('statusDashboard.compute_top_node_metrics', {
              cpu: topNode.cpu_percent,
              ram: topNode.memory_percent,
              score: topNode.load_score,
            })}
          </div>
          {topNodeMemory && (
            <div className="text-xs text-amber-700 dark:text-amber-300/90 mt-2">
              {t('statusDashboard.compute_top_ram_node', {
                node: topNodeMemory.node,
                ram: topNodeMemory.memory_percent,
              })}
            </div>
          )}
        </div>
      )}

      <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-2">
        {t('statusDashboard.compute_nodes_online', { count: computeCluster.nodes_online ?? 0 })}
      </div>
    </StatCard>
  );
}

ClusterComputeCard.propTypes = {
  computeCluster: PropTypes.shape({
    cpu_percent: PropTypes.number,
    ram_percent: PropTypes.number,
    cpu_used_cores: PropTypes.number,
    cpu_total_cores: PropTypes.number,
    ram_used_bytes: PropTypes.number,
    ram_total_bytes: PropTypes.number,
    nodes_online: PropTypes.number,
  }),
  topNode: PropTypes.shape({
    node: PropTypes.string,
    cpu_percent: PropTypes.number,
    memory_percent: PropTypes.number,
    load_score: PropTypes.number,
  }),
  topNodeMemory: PropTypes.shape({
    node: PropTypes.string,
    memory_percent: PropTypes.number,
  }),
};

export default ClusterComputeCard;
