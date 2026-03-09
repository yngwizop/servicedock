import React, { useState } from 'react';
import { CheckCircle, LockKey } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

/**
 * Card für Proxmox-Verbindungseinstellungen (für Modal)
 */
function ProxmoxConnectionCard({ activeDashboard, onSettingsChange, onClose }) {
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
        setTimeout(() => {
          setSaveStatus({ type: '', message: '' });
          if (onClose) onClose();
        }, 1500);
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
        setTimeout(() => {
          setSaveStatus({ type: '', message: '' });
          if (onClose) onClose();
        }, 1500);
      }
    } catch (err) {
      setSaveStatus({ type: 'error', message: t('proxmoxConnection.delete_error') });
    }
  };

  return (
    <div className="space-y-6">
      {/* Configured Status */}
      {isConfigured && (
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50/80 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
          <CheckCircle size={20} weight="fill" className="text-green-600 dark:text-green-400" />
          <span className="text-sm font-medium text-green-700 dark:text-green-300">
            {t('common.configured')}
          </span>
        </div>
      )}

      {/* Form */}
      <div className="space-y-4">
        {/* Host */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('proxmoxConnection.host_label')} <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={config.host}
            onChange={(e) => setConfig({ ...config, host: e.target.value })}
            placeholder={t('proxmoxConnection.host_placeholder')}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        {/* Port */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('proxmoxConnection.port_label')}
          </label>
          <input
            type="number"
            value={config.port}
            onChange={(e) => setConfig({ ...config, port: parseInt(e.target.value) })}
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        {/* Token Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('proxmoxConnection.token_name_label')} <span className="text-red-500">*</span>
            <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">{t('proxmoxConnection.token_name_format')}</span>
          </label>
          <input
            type="text"
            value={config.token_name}
            onChange={(e) => setConfig({ ...config, token_name: e.target.value })}
            placeholder="root@pam!mytoken"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        {/* Token Value */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {t('proxmoxConnection.token_secret_label')} <span className="text-red-500">*</span>
            <LockKey size={16} className="inline ml-1 text-orange-500" />
          </label>
          <input
            type="password"
            value={config.token_value}
            onChange={(e) => setConfig({ ...config, token_value: e.target.value })}
            placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div className="relative">
              <input
                type="checkbox"
                checked={config.verify_ssl}
                onChange={(e) => setConfig({ ...config, verify_ssl: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-orange-500 transition-all"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
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
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-600 rounded-full peer-checked:bg-orange-500 transition-all"></div>
              <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-all peer-checked:translate-x-5"></div>
            </div>
            <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors">
              {t('proxmoxConnection.cluster_mode')}
            </span>
          </label>
        </div>

        {/* Optional Node */}
        {config.is_cluster && (
          <div className="animate-fadeIn">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('proxmoxConnection.specific_node')}
            </label>
            <input
              type="text"
              value={config.node}
              onChange={(e) => setConfig({ ...config, node: e.target.value })}
              placeholder={t('proxmoxConnection.node_placeholder')}
              className="w-full px-4 py-2.5 rounded-xl border border-gray-300/50 dark:border-gray-600/50 bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 outline-none transition-all"
            />
          </div>
        )}

        {/* Status Messages */}
        {saveStatus.message && (
          <div className={`p-4 rounded-xl text-sm font-medium backdrop-blur-sm border ${
            saveStatus.type === 'success' ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300' :
            saveStatus.type === 'error' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300' :
            'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
          }`}>
            {saveStatus.message}
          </div>
        )}
        
        {testStatus.message && (
          <div className={`p-4 rounded-xl text-sm font-medium backdrop-blur-sm border ${
            testStatus.type === 'success' ? 'bg-green-50/80 dark:bg-green-900/20 border-green-200 dark:border-green-700 text-green-800 dark:text-green-300' :
            testStatus.type === 'error' ? 'bg-red-50/80 dark:bg-red-900/20 border-red-200 dark:border-red-700 text-red-800 dark:text-red-300' :
            'bg-blue-50/80 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-300'
          }`}>
            {testStatus.message}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={handleSave}
            disabled={!config.host || !config.token_name || !config.token_value}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {t('common.save')}
          </button>
          
          <button
            onClick={handleTest}
            disabled={!isConfigured}
            className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
          >
            {t('proxmoxConnection.test_connection')}
          </button>
          
          {isConfigured && (
            <button
              onClick={handleDelete}
              className="py-3 px-4 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition-all shadow-lg hover:shadow-xl"
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
