import React, { useState } from 'react';
import { LinkSimple, CheckCircle, WarningCircle, LockKey } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/**
 * Card für Proxmox-Verbindungseinstellungen
 */
function ProxmoxConnectionCard({ activeDashboard, onSettingsChange }) {
  const { t } = useTranslation();
  const [config, setConfig] = useState({
    host: '',
    port: 8006,
    token_name: '',
    token_value: '',
    verify_ssl: false,
    node: '',
    is_cluster: false
  });
  const [saveStatus, setSaveStatus] = useState({ type: '', message: '' });
  const [testStatus, setTestStatus] = useState({ type: '', message: '' });
  const [isConfigured, setIsConfigured] = useState(false);

  // Lade Proxmox-Konfiguration
  React.useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`);
        const data = await res.json();
        
        if (data.configured) {
          setConfig({
            host: data.host || '',
            port: data.port || 8006,
            token_name: data.token_name || '',
            token_value: '',
            verify_ssl: data.verify_ssl || false,
            node: data.node || '',
            is_cluster: data.is_cluster || false
          });
          setIsConfigured(true);
        } else {
          setIsConfigured(false);
        }
      } catch (err) {
        console.error('Error loading config:', err);
      }
    };
    loadConfig();
  }, [activeDashboard]);

  const handleSave = async () => {
    setSaveStatus({ type: 'loading', message: t('proxmoxConnection.saving') });
    
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      
      if (res.ok) {
        setSaveStatus({ type: 'success', message: t('proxmoxConnection.save_success') });
        setIsConfigured(true);
        if (onSettingsChange) onSettingsChange();
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      } else {
        const error = await res.json();
        setSaveStatus({ type: 'error', message: error.detail || t('proxmoxConnection.save_error') });
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: t('common.network_error') });
    }
  };

  const handleTest = async () => {
    setTestStatus({ type: 'loading', message: t('proxmoxConnection.testing') });
    
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/test?dashboard_id=${activeDashboard}`, {
        method: 'POST'
      });
      const data = await res.json();
      
      if (data.success) {
        setTestStatus({ 
          type: 'success', 
          message: t('proxmoxConnection.test_success', { count: data.nodes?.length || 0 })
        });
      } else {
        setTestStatus({ type: 'error', message: data.error || t('proxmoxConnection.test_failed') });
      }
    } catch (err) {
      setTestStatus({ type: 'error', message: t('proxmoxConnection.test_error') });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(t('proxmoxConnection.delete_confirm'))) return;
    
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/proxmox/config?dashboard_id=${activeDashboard}`, {
        method: 'DELETE'
      });
      
      if (res.ok) {
        setConfig({
          host: '',
          port: 8006,
          token_name: '',
          token_value: '',
          verify_ssl: false,
          node: '',
          is_cluster: false
        });
        setIsConfigured(false);
        setSaveStatus({ type: 'success', message: t('proxmoxConnection.delete_success') });
        if (onSettingsChange) onSettingsChange();
        setTimeout(() => setSaveStatus({ type: '', message: '' }), 3000);
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: t('proxmoxConnection.delete_error') });
    }
  };

  return (
    <div className="bg-white/40 dark:bg-slate-800/40 backdrop-blur-md rounded-xl p-6 border border-orange-500/50 dark:border-orange-500/40 transition-all duration-200">
      {/* Header */}
      <div className="flex items-center gap-4 mb-4">
        <div className="bg-orange-500/10 p-3 rounded-xl">
          <LinkSimple size={32} weight="duotone" className="text-orange-500" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            {t('proxmoxConnection.title')}
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            {t('proxmoxConnection.description')}
          </p>
          {isConfigured && (
            <span className="inline-flex items-center gap-1 text-xs text-green-600 dark:text-green-400 mt-1">
              <CheckCircle size={14} weight="fill" />
              {t('common.configured')}
            </span>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="space-y-4">
        {/* Host */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('proxmoxConnection.host_label')}
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder={t('proxmoxConnection.host_placeholder')}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Port */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('proxmoxConnection.port_label')}
          </label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Token Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('proxmoxConnection.token_name_label')} <span className="text-xs text-slate-500">{t('proxmoxConnection.token_name_format')}</span>
          </label>
          <input
            type="text"
            value={config.token_name}
            onChange={(e) => setConfig({ ...config, token_name: e.target.value })}
            placeholder="root@pam!mytoken"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Token Value */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            {t('proxmoxConnection.token_secret_label')} <LockKey size={16} className="inline ml-1 text-orange-500" />
          </label>
          <input
            type="password"
            value={config.token_value}
            onChange={(e) => setConfig({ ...config, token_value: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.verify_ssl}
              onChange={(e) => setConfig({ ...config, verify_ssl: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('proxmoxConnection.verify_ssl')}</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={config.is_cluster}
              onChange={(e) => setConfig({ ...config, is_cluster: e.target.checked })}
              className="rounded"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">{t('proxmoxConnection.cluster_mode')}</span>
          </label>
        </div>

        {/* Optional Node */}
        {config.is_cluster && (
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              {t('proxmoxConnection.specific_node')}
            </label>
            <input
              type="text"
              value={config.node}
              onChange={(e) => setConfig({ ...config, node: e.target.value })}
              placeholder={t('proxmoxConnection.node_placeholder')}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white/60 dark:bg-slate-700/60 text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-orange-500 outline-none"
            />
          </div>
        )}

        {/* Status Messages */}
        {saveStatus.message && (
          <div className={`p-3 rounded-lg text-sm ${
            saveStatus.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            saveStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
          }`}>
            {saveStatus.message}
          </div>
        )}
        
        {testStatus.message && (
          <div className={`p-3 rounded-lg text-sm ${
            testStatus.type === 'success' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
            testStatus.type === 'error' ? 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300' :
            'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
          }`}>
            {testStatus.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={!config.host || !config.token_name || !config.token_value}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {t('common.save')}
          </button>
          
          <button
            onClick={handleTest}
            disabled={!isConfigured}
            className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {t('proxmoxConnection.test_connection')}
          </button>
          
          {isConfigured && (
            <button
              onClick={handleDelete}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
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
