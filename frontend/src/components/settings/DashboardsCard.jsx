import React, { useMemo, useState, useLayoutEffect } from 'react';
import { Pencil, SquaresFour, Plus, Desktop, Trash, Tag, Package, Link as LinkIcon } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';
import { BACKEND_URL } from '../../utils/backendUrl';
import CustomSelect from '../CustomSelect';
import SettingsModalShell from './SettingsModalShell';
import SettingsTopicLayout from './SettingsTopicLayout';
import SettingsLastModifiedLine from './SettingsLastModifiedLine';

const inputClass = "w-full border border-gray-300/50 dark:border-white/15 bg-white/50 dark:bg-gray-700/70 dark:text-white dark:placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm";
const labelClass = "block text-sm font-semibold text-gray-800 dark:text-slate-100 mb-2";

// Wiederverwendbarer Toggle-Schalter (wie in AppearanceTab)
function ToggleSwitch({ checked, onChange, label, description }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div>
        <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{label}</div>
        {description && <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 ${
          checked ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-600'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform duration-200 ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}

function DashboardsCard({ dashboards, activeDashboard, onDashboardsChange, onTipsTopicChange }) {
  const { t } = useTranslation();
  const [activeTopic, setActiveTopic] = useState('overview');

  useLayoutEffect(() => {
    onTipsTopicChange?.('dashboards', activeTopic);
  }, [activeTopic, onTipsTopicChange]);
  const dashboardTopicGroups = useMemo(
    () => [
      {
        key: 'dashboards',
        label: t('dashboards.title'),
        items: [{ id: 'overview', label: t('settings.topicNav.dashboards_overview_item') }],
      },
    ],
    [t]
  );
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDesc, setDashboardDesc] = useState('');
  const [dashboardType, setDashboardType] = useState('default');
  const [dashboardShowProxmox, setDashboardShowProxmox] = useState(true);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSavingDashboard, setIsSavingDashboard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);

  // Modal öffnen für neues Dashboard
  const openCreateModal = () => {
    setEditingDashboard(null);
    setDashboardName('');
    setDashboardDesc('');
    setDashboardType('default');
    setDashboardShowProxmox(true);
    setShowModal(true);
  };

  // Modal öffnen für Dashboard bearbeiten
  const openEditModal = (dashboard) => {
    setEditingDashboard(dashboard);
    setDashboardName(dashboard.name);
    setDashboardDesc(dashboard.description || '');
    setDashboardType(dashboard.type || 'default');
    setDashboardShowProxmox(dashboard.show_proxmox !== undefined ? dashboard.show_proxmox : true);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingDashboard(null);
    setDashboardName('');
    setDashboardDesc('');
    setDashboardType('default');
    setDashboardShowProxmox(true);
  };

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
      closeModal();
    } catch (err) {
      console.error('Dashboard save error:', err);
      alert(t('dashboards.save_error'));
    } finally {
      setIsSavingDashboard(false);
    }
  };

  const handleDelete = async (dashboard) => {
    try {
      const res = await authenticatedFetch(
        `${BACKEND_URL}/api/dashboards/${dashboard.id}`,
        { method: 'DELETE' }
      );
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.detail || 'Delete failed');
      }
      setShowDeleteConfirm(null);
      onDashboardsChange();
    } catch (err) {
      console.error('Dashboard delete error:', err);
      alert(t('dashboards.delete_error') + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
          <SquaresFour size={22} weight="duotone" className="text-blue-400" />
          {t('dashboards.title')}
        </h3>
        <p className="text-gray-700 dark:text-gray-300 text-sm" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.5)' }}>
          {t('dashboards.description')}
        </p>
      </div>

      <SettingsTopicLayout
        groups={dashboardTopicGroups}
        activeId={activeTopic}
        onSelect={setActiveTopic}
        navAriaLabel={t('settings.topicNav.dashboards_nav_aria')}
      >
        {activeTopic === 'overview' && (
          <div className="space-y-5">
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed">{t('settings.topicNav.dashboards_overview_detail')}</p>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{t('settings.topicNav.dashboards_overview_item')}</span>
              <button
                type="button"
                onClick={openCreateModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/90 hover:bg-blue-600 text-white rounded-lg font-medium text-sm transition-colors shadow-sm shrink-0"
              >
                <Plus size={18} weight="bold" />
                {t('dashboards.add')}
              </button>
            </div>

            {dashboards && dashboards.length > 0 ? (
              <div className="space-y-3">
                {dashboards.map((dashboard) => (
                  <div
                    key={dashboard.id}
                    className={`group relative isolate overflow-hidden rounded-2xl transition-all duration-200 ease-out motion-safe:hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/[0.06] dark:hover:shadow-black/25 night:hover:shadow-black/35 ${
                      dashboard.id === activeDashboard ? 'ring-1 ring-inset ring-blue-400/30 dark:ring-blue-400/25' : ''
                    }`}
                  >
                    <div
                      className={`pointer-events-none absolute inset-0 ${
                        dashboard.id === activeDashboard
                          ? 'bg-gradient-to-br from-blue-500/15 via-blue-400/5 to-transparent dark:from-blue-400/35 dark:via-blue-500/15 dark:to-transparent'
                          : 'bg-gradient-to-br from-gray-500/5 via-transparent to-transparent dark:from-white/[0.06] dark:via-transparent dark:to-transparent'
                      }`}
                    />
                    <div className="relative rounded-2xl bg-white/30 dark:bg-white/[0.06] sd-night-surface border border-gray-200/25 dark:border-white/10 night:border-white/[0.08] p-4 shadow-sm shadow-black/[0.03] dark:shadow-black/10 night:shadow-black/30 transition-[background-color,border-color,box-shadow] duration-200 ease-out group-hover:bg-white/45 dark:group-hover:bg-white/[0.09] night:group-hover:bg-sd-night-900/85 group-hover:border-blue-400/30 dark:group-hover:border-blue-400/25 night:group-hover:border-white/[0.12] group-hover:shadow-md dark:group-hover:shadow-black/20">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="text-base font-semibold text-gray-900 dark:text-white truncate">{dashboard.name}</h5>
                            {dashboard.id === activeDashboard && (
                              <span className="text-[11px] bg-blue-500 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                {t('dashboards.active')}
                              </span>
                            )}
                            {dashboard.id === 1 && (
                              <span className="text-[11px] bg-gray-500/80 text-white px-2 py-0.5 rounded-full font-medium shrink-0">
                                {t('dashboards.default')}
                              </span>
                            )}
                          </div>
                          {dashboard.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{dashboard.description}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 ml-3 shrink-0">
                          <button
                            type="button"
                            onClick={() => openEditModal(dashboard)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                            title={t('common.edit')}
                          >
                            <Pencil size={16} weight="bold" />
                          </button>

                          {dashboards.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setShowDeleteConfirm(dashboard)}
                              className="p-2 text-gray-500 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                              title={t('common.delete')}
                            >
                              <Trash size={16} weight="bold" />
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-300">
                          <Package size={13} weight="duotone" />
                          {dashboard.service_count} Services
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300">
                          <LinkIcon size={13} weight="duotone" />
                          {dashboard.shortcut_count} Shortcuts
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-gray-500/10 text-gray-600 dark:text-gray-300 capitalize">
                          <Tag size={13} weight="duotone" />
                          {dashboard.type}
                        </span>
                        {dashboard.show_proxmox && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300">
                            <Desktop size={13} weight="duotone" />
                            Proxmox
                          </span>
                        )}
                      </div>
                      <SettingsLastModifiedLine iso={dashboard.updated_at} className="mt-3 border-t border-gray-200/30 pt-3 dark:border-white/[0.06]" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center">
                <SquaresFour size={40} weight="duotone" className="text-gray-400 dark:text-gray-500 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboards.no_dashboards')}</p>
                <button type="button" onClick={openCreateModal} className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline">
                  {t('dashboards.create_first')}
                </button>
              </div>
            )}

            <div className="p-3.5 bg-blue-500/8 dark:bg-blue-500/8 border border-blue-500/15 rounded-xl">
              <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">{t('dashboards.tip')}</p>
            </div>
          </div>
        )}
      </SettingsTopicLayout>

      <SettingsModalShell
        open={showModal}
        onClose={closeModal}
        maxWidthClass="max-w-lg"
        title={editingDashboard ? t('dashboards.edit_dashboard') : t('dashboards.create_dashboard')}
        subtitle={null}
        icon={
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center shrink-0 ring-1 ring-blue-500/20 dark:ring-blue-400/15">
            {editingDashboard ? (
              <Pencil size={24} weight="duotone" className="text-blue-600 dark:text-blue-300" />
            ) : (
              <Plus size={24} weight="duotone" className="text-blue-600 dark:text-blue-300" />
            )}
          </div>
        }
      >
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div>
                <label className={labelClass}>{t('dashboards.dashboard_name')}</label>
                <input
                  placeholder={t('dashboards.name_placeholder')}
                  value={dashboardName}
                  onChange={(e) => setDashboardName(e.target.value)}
                  required
                  maxLength={100}
                  autoFocus
                  className={inputClass}
                />
              </div>

              {/* Description */}
              <div>
                <label className={labelClass}>{t('dashboards.description_label')}</label>
                <textarea
                  placeholder={t('dashboards.description_placeholder')}
                  value={dashboardDesc}
                  onChange={(e) => setDashboardDesc(e.target.value)}
                  maxLength={500}
                  rows={2}
                  className={`${inputClass} resize-none`}
                />
              </div>

              {/* Type */}
              <div>
                <label className={labelClass}>{t('dashboards.type')}</label>
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

              {/* Proxmox Toggle */}
              <div className="bg-white/30 dark:bg-white/[0.05] sd-night-surface rounded-xl p-4 border border-gray-200/40 dark:border-white/10 night:border-white/[0.08] shadow-sm dark:shadow-black/10 night:shadow-black/30">
                <ToggleSwitch
                  checked={dashboardShowProxmox}
                  onChange={setDashboardShowProxmox}
                  label="Proxmox Monitoring Tab"
                  description={t('dashboards.show_proxmox')}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-200/70 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/15 transition-colors"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingDashboard || !dashboardName.trim()}
                  className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 disabled:bg-gray-400 dark:disabled:bg-slate-600/50 disabled:cursor-not-allowed text-white shadow-sm transition-colors min-w-[8.5rem]"
                >
                  {isSavingDashboard ? t('dashboards.saving') : (editingDashboard ? t('dashboards.update') : t('dashboards.create'))}
                </button>
              </div>
            </form>
      </SettingsModalShell>

      <SettingsModalShell
        open={Boolean(showDeleteConfirm)}
        onClose={() => setShowDeleteConfirm(null)}
        maxWidthClass="max-w-md"
        title={t('dashboards.delete_title')}
        subtitle={
          showDeleteConfirm
            ? t('dashboards.delete_confirm', { name: showDeleteConfirm.name })
            : ''
        }
        icon={
          <div className="w-12 h-12 rounded-xl bg-red-500/15 dark:bg-red-500/20 flex items-center justify-center shrink-0 ring-1 ring-red-500/20 dark:ring-red-400/15">
            <Trash size={24} weight="duotone" className="text-red-600 dark:text-red-400" />
          </div>
        }
        footer={
          <div className="flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(null)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-gray-200/70 dark:bg-white/10 text-gray-800 dark:text-gray-200 hover:bg-gray-300/80 dark:hover:bg-white/15 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={() => showDeleteConfirm && handleDelete(showDeleteConfirm)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-sm font-medium bg-red-500/90 hover:bg-red-600 text-white shadow-sm transition-colors"
            >
              {t('common.yes_delete')}
            </button>
          </div>
        }
      />
    </div>
  );
}

export default DashboardsCard;
