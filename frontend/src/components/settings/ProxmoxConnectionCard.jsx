import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CheckCircle, LockKey } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backendUrl';

const labelClass = 'block text-sm font-semibold text-gray-900 night:text-slate-100 mb-2';

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border outline-none transition-all ' +
  'border-gray-300/70 dark:border-white/[0.12] ' +
  'bg-white dark:bg-slate-950/95 ' +
  'text-gray-900 night:text-slate-100 ' +
  'placeholder-gray-500 dark:placeholder-slate-500 ' +
  'focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 dark:focus:border-orange-400/60';

const statusBoxBase =
  'p-4 rounded-xl text-sm font-medium border';

const EMPTY_CONFIG = {
  host: '',
  port: 8006,
  token_name: '',
  token_value: '',
  verify_ssl: false,
  node: '',
  is_cluster: false,
};

function isProxmoxConfigDirty(current, snapshot) {
  if (!snapshot) return false;
  const fields = ['host', 'port', 'token_name', 'verify_ssl', 'node', 'is_cluster'];
  for (const f of fields) {
    if (current[f] !== snapshot[f]) return true;
  }
  if (current.token_value?.trim()) return true;
  return false;
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
            token_name: data.token_name || '',
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

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      if (res.ok) {
        const saved = { ...config, token_value: '' };
        setConfig(saved);
        setSnapshot(saved);
        setSaveStatus({ type: 'success', message: t('proxmoxConnection.save_success') });
        setIsConfigured(true);
        onSettingsChange?.();
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        const error = await res.json();
        setSaveStatus({ type: 'error', message: error.detail || t('proxmoxConnection.save_error') });
      }
    } catch {
      setSaveStatus({ type: 'error', message: t('common.network_error') });
    }
  };

  const handleTest = async () => {
    setTestStatus({ type: 'loading', message: t('proxmoxConnection.testing') });

    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/test?dashboard_id=${activeDashboard}`, {
        method: 'POST',
      });
      const data = await res.json();

      if (data.success) {
        setTestStatus({
          type: 'success',
          message: t('proxmoxConnection.test_success', { count: data.nodes?.length || 0 }),
        });
      } else {
        setTestStatus({ type: 'error', message: data.error || t('proxmoxConnection.test_failed') });
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
    config.token_name &&
    (isConfigured ? true : Boolean(config.token_value?.trim()));

  return (
    <div className="space-y-6">
      {isConfigured && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-emerald-300/60 dark:border-emerald-600/35 bg-emerald-50/90 dark:bg-emerald-950/75">
          <CheckCircle size={20} weight="fill" className="text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-sm font-medium text-emerald-900 dark:text-emerald-100">
            {t('common.configured')}
          </span>
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label className={labelClass}>
            {t('proxmoxConnection.host_label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder={t('proxmoxConnection.host_placeholder')}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>{t('proxmoxConnection.port_label')}</label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value, 10) || 8006 })}
            className={inputClass}
          />
        </div>

        <div>
          <label className={labelClass}>
            <span className="inline-flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span>
                {t('proxmoxConnection.token_name_label')} <span className="text-red-500">*</span>
              </span>
              <span className="text-xs font-normal text-gray-600 dark:text-slate-400">
                {t('proxmoxConnection.token_name_format')}
              </span>
            </span>
          </label>
          <input
            type="text"
            value={config.token_name}
            onChange={(e) => setConfig({ ...config, token_name: e.target.value })}
            placeholder="root@pam!mytoken"
            className={inputClass}
          />
        </div>

        <div>
          <label className={`${labelClass} flex flex-wrap items-center gap-x-2 gap-y-0.5`}>
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
            className={inputClass}
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
              <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-orange-500 transition-all" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
            </div>
            <span className="text-sm dim:text-slate-200 night:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
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
              <div className="w-11 h-6 bg-gray-300 dark:bg-slate-600 rounded-full peer-checked:bg-orange-500 transition-all" />
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5" />
            </div>
            <span className="text-sm dim:text-slate-200 night:text-slate-200 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {t('proxmoxConnection.cluster_mode')}
            </span>
          </label>
        </div>

        <div>
          <label className={labelClass}>{t('proxmoxConnection.specific_node')}</label>
          <input
            type="text"
            value={config.node}
            onChange={(e) => setConfig({ ...config, node: e.target.value })}
            placeholder={t('proxmoxConnection.node_placeholder')}
            className={inputClass}
          />
          <p className="mt-1.5 text-xs dim:text-slate-400 night:text-gray-400">
            {config.is_cluster
              ? t('proxmoxConnection.node_hint_cluster')
              : t('proxmoxConnection.node_hint_standalone')}
          </p>
        </div>

        {saveStatus.message && (
          <div
            className={`${statusBoxBase} ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/80 border-emerald-300/70 dark:border-emerald-600/35 text-emerald-900 dark:text-emerald-100'
                : saveStatus.type === 'error'
                  ? 'bg-red-50/95 dark:bg-red-950/80 border-red-300/70 dark:border-red-600/35 text-red-900 dark:text-red-100'
                  : 'bg-blue-50/95 dark:bg-blue-950/80 border-blue-300/70 dark:border-blue-600/35 text-blue-900 dark:text-blue-100'
            }`}
          >
            {saveStatus.message}
          </div>
        )}

        {testStatus.message && (
          <div
            className={`${statusBoxBase} ${
              testStatus.type === 'success'
                ? 'bg-emerald-50/95 dark:bg-emerald-950/80 border-emerald-300/70 dark:border-emerald-600/35 text-emerald-900 dark:text-emerald-100'
                : testStatus.type === 'error'
                  ? 'bg-red-50/95 dark:bg-red-950/80 border-red-300/70 dark:border-red-600/35 text-red-900 dark:text-red-100'
                  : 'bg-blue-50/95 dark:bg-blue-950/80 border-blue-300/70 dark:border-blue-600/35 text-blue-900 dark:text-blue-100'
            }`}
          >
            {testStatus.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-orange-500/90 hover:bg-orange-600 text-white shadow-sm transition-colors disabled:bg-gray-300 disabled:text-gray-500 dark:disabled:bg-slate-600/50 dark:disabled:text-slate-400 disabled:cursor-not-allowed disabled:opacity-70 disabled:shadow-none"
          >
            {t('common.save')}
          </button>

          <button
            type="button"
            onClick={handleTest}
            disabled={!isConfigured}
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium rounded-lg bg-sky-600/90 hover:bg-sky-700 text-white shadow-sm transition-colors disabled:bg-gray-300 dark:disabled:bg-slate-600/45 disabled:cursor-not-allowed disabled:opacity-50"
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
