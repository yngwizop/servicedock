import React, { useState, useEffect } from 'react';
import { Pencil } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';
import CustomSelect from '../CustomSelect';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

function DashboardsCard({ dashboards, activeDashboard, onDashboardsChange }) {
  const { t } = useTranslation();
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDesc, setDashboardDesc] = useState('');
  const [dashboardType, setDashboardType] = useState('default');
  const [dashboardShowProxmox, setDashboardShowProxmox] = useState(true);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [isSavingDashboard, setIsSavingDashboard] = useState(false);
  const [dashboardSaved, setDashboardSaved] = useState(false);

  // Sync editingDashboard state
  useEffect(() => {
    if (editingDashboard) {
      const currentDash = dashboards.find(d => d.id === editingDashboard.id);
      if (currentDash) {
        setDashboardName(currentDash.name);
        setDashboardDesc(currentDash.description || '');
        setDashboardType(currentDash.type || 'default');
        setDashboardShowProxmox(currentDash.show_proxmox === true);
      }
    }
  }, [editingDashboard, dashboards]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSavingDashboard(true);
    
    try {
      const payload = {
        name: dashboardName.trim(),
        description: dashboardDesc.trim() || null,
        type: dashboardType,
        show_proxmox: dashboardShowProxmox
      };
      
      if (editingDashboard) {
        const res = await authenticatedFetch(
          `${BACKEND_URL}/api/dashboards/${editingDashboard.id}`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...payload, is_active: editingDashboard.is_active })
          }
        );
        if (!res.ok) throw new Error('Update failed');
      } else {
        const res = await authenticatedFetch(
          `${BACKEND_URL}/api/dashboards`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        );
        if (!res.ok) throw new Error('Create failed');
      }
      
      await onDashboardsChange();
      setDashboardName('');
      setDashboardDesc('');
      setDashboardType('default');
      setDashboardShowProxmox(true);
      setEditingDashboard(null);
      setDashboardSaved(true);
      setTimeout(() => setDashboardSaved(false), 2000);
    } catch (err) {
      console.error('Dashboard save error:', err);
      alert(t('dashboards.save_error'));
    } finally {
      setIsSavingDashboard(false);
    }
  };

  const handleDelete = async (dashboard) => {
    if (!confirm(t('dashboards.delete_confirm', { name: dashboard.name }))) {
      return;
    }
    
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${dashboard.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Delete failed');
      }
      onDashboardsChange();
    } catch (err) {
      console.error('Dashboard delete error:', err);
      alert(t('dashboards.delete_error') + err.message);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1.5 flex items-center gap-2">
          📊 {t('dashboards.title')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
          {t('dashboards.description')}
        </p>
      </div>

      {/* Dashboard erstellen/bearbeiten */}
      <form
        onSubmit={handleSubmit}
        className="p-5 bg-white/70 dark:bg-white/5 backdrop-blur-md shadow-xl rounded-2xl border border-gray-400/60 dark:border-white/10"
      >
        <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3.5 flex items-center gap-2">
          <span className="text-lg">{editingDashboard ? '✏️' : '➕'}</span>
          {editingDashboard ? t('dashboards.edit_dashboard') : t('dashboards.create_dashboard')}
        </h4>
        <div className="space-y-3.5">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('dashboards.dashboard_name')}
            </label>
            <input
              placeholder="z.B. Work, Home, Gaming"
              value={dashboardName}
              onChange={(e) => setDashboardName(e.target.value)}
              required
              maxLength={100}
              className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('dashboards.description_label')}
            </label>
            <textarea
              placeholder={t('dashboards.description_placeholder')}
              value={dashboardDesc}
              onChange={(e) => setDashboardDesc(e.target.value)}
              maxLength={500}
              rows={2}
              className="border border-gray-300 dark:border-white/20 bg-white/50 dark:bg-white/5 dark:text-white dark:placeholder-gray-400 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('dashboards.type')}
            </label>
            <CustomSelect
              value={dashboardType}
              onChange={(val) => setDashboardType(val)}
              options={[
                { value: 'default', label: t('dashboards.type_default') },
                { value: 'work', label: t('dashboards.type_work') },
                { value: 'home', label: t('dashboards.type_home') },
                { value: 'gaming', label: 'Gaming' },
                { value: 'media', label: 'Media' },
                { value: 'dev', label: 'Development' },
              ]}
            />
          </div>

          <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={dashboardShowProxmox}
                onChange={(e) => setDashboardShowProxmox(e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">🖥️</span>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Proxmox Monitoring Tab</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('dashboards.show_proxmox')}</p>
              </div>
            </label>
          </div>
          
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isSavingDashboard || !dashboardName.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white p-3 rounded-xl font-semibold transition-all shadow-lg hover:shadow-xl hover:scale-[1.02]"
            >
              {isSavingDashboard ? t('dashboards.saving') : (editingDashboard ? t('dashboards.update') : t('dashboards.create'))}
            </button>
            
            {editingDashboard && (
              <button
                type="button"
                onClick={() => {
                  setEditingDashboard(null);
                  setDashboardName('');
                  setDashboardDesc('');
                  setDashboardType('default');
                  setDashboardShowProxmox(true);
                }}
                className="px-6 bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-xl font-semibold transition-all"
              >
                {t('common.cancel')}
              </button>
            )}
          </div>
          
          {dashboardSaved && (
            <div className="text-green-600 dark:text-green-400 font-medium text-center">
              {t('dashboards.saved')}
            </div>
          )}
        </div>
      </form>

      {/* Dashboard Liste */}
      <div>
        <h4 className="text-base font-semibold text-gray-800 dark:text-white mb-3">
          📋 {t('dashboards.my_dashboards')}
        </h4>
        
        {dashboards && dashboards.length > 0 ? (
          <div className="space-y-3">
            {dashboards.map(dashboard => (
              <div
                key={dashboard.id}
                className={`group relative overflow-hidden rounded-2xl transition-all duration-300 ${
                  dashboard.id === activeDashboard
                    ? 'ring-2 ring-blue-500'
                    : 'hover:scale-[1.01]'
                }`}
              >
                <div className={`absolute inset-0 ${
                  dashboard.id === activeDashboard
                    ? 'bg-gradient-to-br from-blue-500/20 via-blue-400/10 to-transparent dark:from-blue-400/30 dark:via-blue-500/20 dark:to-transparent'
                    : 'bg-gradient-to-br from-gray-500/10 via-transparent to-gray-400/5 dark:from-white/5 dark:via-transparent dark:to-white/5'
                }`} />
                <div className="relative backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 border border-gray-200/50 dark:border-white/10 p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <h5 className="text-base font-semibold text-gray-900 dark:text-white">
                          {dashboard.name}
                        </h5>
                        {dashboard.id === activeDashboard && (
                          <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-full font-medium">
                            {t('dashboards.active')}
                          </span>
                        )}
                        {dashboard.id === 1 && (
                          <span className="text-xs bg-gray-500 text-white px-2 py-1 rounded-full font-medium">
                            {t('dashboards.default')}
                          </span>
                        )}
                      </div>
                      {dashboard.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {dashboard.description}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => {
                          setEditingDashboard(dashboard);
                          setDashboardName(dashboard.name);
                          setDashboardDesc(dashboard.description || '');
                          setDashboardType(dashboard.type || 'default');
                          setDashboardShowProxmox(dashboard.show_proxmox !== undefined ? dashboard.show_proxmox : true);
                        }}
                        className="p-1.5 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={t('common.edit')}
                      >
                        <Pencil className="w-4 h-4" weight="bold" />
                      </button>
                      
                      {dashboards.length > 1 && (
                        <button
                          onClick={() => handleDelete(dashboard)}
                          className="p-1.5 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          title={t('common.delete')}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                      📦 {dashboard.service_count} Services
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                      🔗 {dashboard.shortcut_count} Shortcuts
                    </span>
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-700/50 text-gray-700 dark:text-gray-300 capitalize">
                      🏷️ {dashboard.type}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-600 dark:text-gray-400 text-center py-4">
            {t('dashboards.no_dashboards')}
          </p>
        )}
      </div>

      {/* Info-Hinweis */}
      <div className="p-4 bg-blue-50 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200 dark:border-blue-800 rounded-xl">
        <p className="text-sm text-blue-900 dark:text-blue-200">
          {t('dashboards.tip')}
        </p>
      </div>
    </div>
  );
}

export default DashboardsCard;
