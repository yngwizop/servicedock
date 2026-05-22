import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, LockKey } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backendUrl';
import {
  settingsInputClass,
  settingsLabelClass,
  settingsModalStatusSuccess,
  settingsModalStatusError,
  settingsModalStatusInfo,
} from './settingsSurfaces';

import { translateProxmoxError } from '../../utils/proxmoxErrors';

function formatProxmoxApiError(detail, t) {
  if (detail && typeof detail === 'object' && detail.code) {
    return translateProxmoxError(detail.code, detail.context || null, null, t)
      || t('proxmoxConnection.save_error');
  }
  if (typeof detail === 'string') return detail;
  return t('proxmoxConnection.save_error');
}

function formatProxmoxTestError(data, t) {
  if (data?.error_code) {
    return translateProxmoxError(data.error_code, data.error_context || null, data.error, t);
  }
  return data?.error || t('proxmoxConnection.test_failed');
}

const EMPTY_CONFIG = {
  host: '',
  port: 8006,
  token_name: '',
  token_name_masked: '',
  token_value: '',
  verify_ssl: false,
  node: '',
  is_cluster: false,
};

function isProxmoxConfigDirty(current, snapshot) {
  if (!snapshot) return false;
  const fields = ['host', 'port', 'verify_ssl', 'node', 'is_cluster'];
  for (const f of fields) {
    if (current[f] !== snapshot[f]) return true;
  }
  if (current.token_name?.trim()) return true;
  if (current.token_value?.trim()) return true;
  return false;
}

function buildProxmoxSavePayload(config) {
  const body = {
    host: config.host.trim(),
    port: config.port,
    verify_ssl: config.verify_ssl,
    node: config.node?.trim() || null,
    is_cluster: config.is_cluster,
  };
  if (config.token_name?.trim()) {
    body.token_name = config.token_name.trim();
  }
  if (config.token_value?.trim()) {
    body.token_value = config.token_value.trim();
  }
  return body;
}

function buildProxmoxTestPayload(config) {
  const body = {
    host: config.host.trim(),
    port: config.port,
    verify_ssl: config.verify_ssl,
    node: config.node?.trim() || null,
    is_cluster: config.is_cluster,
  };
  if (config.token_name?.trim()) {
    body.token_name = config.token_name.trim();
  }
  if (config.token_value?.trim()) {
    body.token_value = config.token_value.trim();
  }
  return body;
}

function ProxmoxConnectionCard({
  activeDashboard,
  onSettingsChange,
  onClose,
  onDirtyChange,
  onBindDiscard,
}) {
  const { t } = useTranslation();
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [snapshot, setSnapshot] = useState(null);
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [testStatus, setTestStatus] = useState({ type: '', message: '' });
  const [isConfigured, setIsConfigured] = useState(false);

  const isDirty = useMemo(() => isProxmoxConfigDirty(config, snapshot), [config, snapshot]);

  const resetToSnapshot = useCallback(() => {
    if (snapshot) setConfig({ ...snapshot });
    else setConfig(EMPTY_CONFIG);
    setSaveStatus({ type: '', message: '' });
    setTestStatus({ type: '', message: '' });
  }, [snapshot]);

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    onBindDiscard?.(resetToSnapshot);
  }, [onBindDiscard, resetToSnapshot]);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
        const data = await res.json();

        if (data.configured) {
          const loaded = {
            host: data.host || '',
            port: data.port || 8006,
            token_name: '',
            token_name_masked: data.token_name || '',
            token_value: '',
            verify_ssl: data.verify_ssl || false,
            node: data.node || '',
            is_cluster: data.is_cluster || false,
          };
          setConfig(loaded);
          setSnapshot(loaded);
          setIsConfigured(true);
        } else {
          setConfig(EMPTY_CONFIG);
          setSnapshot(EMPTY_CONFIG);
          setIsConfigured(false);
        }
      } catch (err) {
        console.error('Error loading config:', err);
      }
    };
    void loadConfig();
  }, [activeDashboard]);

  const handleSave = async () => {
    setSaveStatus({ type: 'loading', message: t('proxmoxConnection.saving') });
    setTestStatus({ type: '', message: '' });

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProxmoxSavePayload(config)),
      });

      if (res.ok) {
        setSaveStatus({ type: 'success', message: t('proxmoxConnection.save_success') });
        setIsConfigured(true);
        onSettingsChange?.();
        try {
          const reload = await authenticatedFetch(
            `${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`
          );
          const data = await reload.json();
          if (data.configured) {
            const loaded = {
              host: data.host || '',
              port: data.port || 8006,
              token_name: '',
              token_name_masked: data.token_name || '',
              token_value: '',
              verify_ssl: data.verify_ssl || false,
              node: data.node || '',
              is_cluster: data.is_cluster || false,
            };
            setConfig(loaded);
            setSnapshot(loaded);
          }
        } catch {
          const saved = {
            ...config,
            token_name: '',
            token_value: '',
          };
          setConfig(saved);
          setSnapshot(saved);
        }
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        const error = await res.json().catch(() => ({}));
        setSaveStatus({
          type: 'error',
          message: formatProxmoxApiError(error.detail, t),
        });
      }
    } catch {
      setSaveStatus({ type: 'error', message: t('common.network_error') });
    }
  };

  const handleTest = async () => {
    if (!config.host?.trim()) {
      setTestStatus({ type: 'error', message: t('proxmoxConnection.test_missing_fields') });
      return;
    }
    if (!isConfigured && !config.token_name?.trim()) {
      setTestStatus({ type: 'error', message: t('proxmoxConnection.test_missing_fields') });
      return;
    }
    if (!isConfigured && !config.token_value?.trim()) {
      setTestStatus({ type: 'error', message: t('proxmoxConnection.test_token_required') });
      return;
    }

    setTestStatus({ type: 'loading', message: t('proxmoxConnection.testing') });

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/test?dashboard_id=${activeDashboard}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildProxmoxTestPayload(config)),
      });
      const data = await res.json();

      if (data.success) {
        setTestStatus({
          type: 'success',
          message: t('proxmoxConnection.test_success', { count: data.nodes?.length || 0 }),
        });
      } else {
        setTestStatus({ type: 'error', message: formatProxmoxTestError(data, t) });
      }
    } catch {
      setTestStatus({ type: 'error', message: t('proxmoxConnection.test_error') });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('proxmoxConnection.delete_confirm'))) return;

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setConfig(EMPTY_CONFIG);
        setSnapshot(EMPTY_CONFIG);
        setIsConfigured(false);
        setSaveStatus({ type: 'success', message: t('proxmoxConnection.delete_success') });
        onSettingsChange?.();
        setTimeout(() => {
          setSaveStatus({ type: '', message: '' });
          onClose?.();
        }, 1500);
      }
    } catch {
      setSaveStatus({ type: 'error', message: t('proxmoxConnection.delete_error') });
    }
  };

  const canSave =
    config.host &&
    (isConfigured || (config.token_name?.trim() && config.token_value?.trim()));

  return (
    <div className="space-y-6">
      {isConfigured && (
        <div className={`${settingsModalStatusSuccess} flex items-center gap-2 !p-2.5`}>
          <CheckCircle size={20} weight="fill" className="text-emerald-500 shrink-0" />
          <span className="text-sm font-medium">
            {t('common.configured')}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className={settingsLabelClass}>
            {t('proxmoxConnection.host_label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder={t('proxmoxConnection.host_placeholder')}
            className={settingsInputClass}
          />
        </div>

        <div>
          <label className={settingsLabelClass}>{t('proxmoxConnection.port_label')}</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 8006 })}
            className={settingsInputClass}
          />
        </div>

        <div>
          <label className={settingsLabelClass}>
            <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>
                {t('proxmoxConnection.token_name_label')} <span className="text-red-500">*</span>
              </span>
              <span className="text-xs font-normal dim:text-slate-400 night:text-slate-400">
                {t('proxmoxConnection.token_name_format')}
              </span>
            </span>
          </label>
          {isConfigured && config.token_name_masked && !config.token_name?.trim() ? (
            <p className="text-xs dim:text-slate-400 night:text-slate-400 mb-2">
              {t('proxmoxConnection.token_name_stored', { masked: config.token_name_masked })}
            </p>
          ) : null}
          <input
            type="text"
            value={config.token_name}
            onChange={(e) => setConfig({ ...config, token_name: e.target.value })}
            placeholder={
              isConfigured && config.token_name_masked
                ? t('proxmoxConnection.token_name_change_placeholder')
                : 'root@pam!mytoken'
            }
            className={settingsInputClass}
          />
          {isConfigured ? (
            <p className="text-xs dim:text-slate-500 night:text-slate-500 mt-1.5">
              {t('proxmoxConnection.token_name_keep_hint')}
            </p>
          ) : null}
        </div>

        <div>
          <label className={`${settingsLabelClass} flex flex-wrap items-center gap-x-2 gap-y-0.5`}>
            <span>
              {t('proxmoxConnection.token_secret_label')}{' '}
              {!isConfigured ? <span className="text-red-500">*</span> : null}
            </span>
            <LockKey
              size={18}
              weight="duotone"
              className="shrink-0 text-orange-600 dark:text-orange-300"
              aria-hidden
            />
          </label>
          <input
            type="password"
            value={config.token_value}
            onChange={(e) => setConfig({ ...config, token_value: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className={settingsInputClass}
          />
        </div>

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.verify_ssl}
                onChange={(e) => setConfig({ ...config, verify_ssl: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 dim:bg-sd-dim-700/70 night:bg-slate-600 rounded-full peer-checked:bg-orange-500 transition-all" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
            </div>
            <span className="text-sm dim:text-slate-200 night:text-slate-200 group-hover:dim:text-slate-50 night:group-hover:text-white transition-colors">
              {t('proxmoxConnection.verify_ssl')}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.is_cluster}
                onChange={(e) => setConfig({ ...config, is_cluster: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 dim:bg-sd-dim-700/70 night:bg-slate-600 rounded-full peer-checked:bg-orange-500 transition-all" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
            </div>
            <span className="text-sm dim:text-slate-200 night:text-slate-200 group-hover:dim:text-slate-50 night:group-hover:text-white transition-colors">
              {t('proxmoxConnection.cluster_mode')}
            </span>
          </label>
        </div>

        <div>
          <label className={settingsLabelClass}>{t('proxmoxConnection.specific_node')}</label>
          <input
            type="text"
            value={config.node}
            onChange={(e) => setConfig({ ...config, node: e.target.value })}
            placeholder={t('proxmoxConnection.node_placeholder')}
            className={settingsInputClass}
          />
          <p className="mt-1.5 text-xs dim:text-slate-400 night:text-gray-400">
            {config.is_cluster
              ? t('proxmoxConnection.node_hint_cluster')
              : t('proxmoxConnection.node_hint_standalone')}
          </p>
        </div>

        {saveStatus.message && (
          <div
            className={
              saveStatus.type === 'success'
                ? settingsModalStatusSuccess
                : saveStatus.type === 'error'
                  ? settingsModalStatusError
                  : settingsModalStatusInfo
            }
          >
            {saveStatus.message}
          </div>
        )}

        {testStatus.message && (
          <div
            className={
              testStatus.type === 'success'
                ? settingsModalStatusSuccess
                : testStatus.type === 'error'
                  ? settingsModalStatusError
                  : settingsModalStatusInfo
            }
          >
            {testStatus.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-orange-500/90 hover:bg-orange-600 text-white shadow-sm transition-colors disabled:dim:bg-sd-dim-700/60 disabled:dim:text-slate-500 disabled:night:bg-slate-600/50 disabled:night:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
          >
            {t('common.save')}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={!isConfigured}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-sky-600/90 hover:bg-sky-700 text-white shadow-sm transition-colors disabled:dim:bg-sd-dim-700/60 disabled:night:bg-slate-600/45 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t('proxmoxConnection.test_connection')}
          </button>

          {isConfigured && (
            <button
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-red-500/90 hover:bg-red-600 text-white shadow-sm transition-colors"
            >
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProxmoxConnectionCard;
