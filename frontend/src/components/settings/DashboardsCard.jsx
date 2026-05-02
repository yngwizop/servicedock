import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Pencil, SquaresFour, Plus, Desktop, X, Trash, Tag, Package, Link as LinkIcon } from 'phosphor-react';
import { useTranslation } from 'react-i18next';
import { authenticatedFetch } from '../../utils/auth';
import CustomSelect from '../CustomSelect';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

const inputClass = "w-full border border-gray-300/50 dark:border-white/15 bg-white/50 dark:bg-gray-700/70 dark:text-white dark:placeholder-gray-400 p-3 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm";
const labelClass = "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2";

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

function DashboardsCard({ dashboards, activeDashboard, onDashboardsChange }) {
  const { t } = useTranslation();
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDesc, setDashboardDesc] = useState('');
  const [dashboardType, setDashboardType] = useState('default');
  const [dashboardShowProxmox, setDashboardShowProxmox] = useState(true);
  const [editingDashboard, setEditingDashboard] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isSavingDashboard, setIsSavingDashboard] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const modalRef = useRef(null);

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

  // Klick außerhalb des Modals → schließen
  useEffect(() => {
    if (!showModal) return;
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        closeModal();
      }
    };
    const handleEsc = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [showModal]);

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
      {/* Header mit Add-Button */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-1 flex items-center gap-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
            <SquaresFour size={22} weight="duotone" className="text-blue-400" />
            {t('dashboards.title')}
          </h3>
          <p className="text-gray-700 dark:text-gray-300 text-sm" style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6), 0 0 8px rgba(255,255,255,0.5)' }}>
            {t('dashboards.description')}
          </p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl hover:scale-[1.02] shrink-0"
        >
          <Plus size={18} weight="bold" />
          {t('dashboards.add')}
        </button>
      </div>

      {/* Dashboard-Liste */}
      {dashboards && dashboards.length > 0 ? (
        <div className="space-y-3">
          {dashboards.map(dashboard => (
            <div
              key={dashboard.id}
              className={`group relative isolate overflow-hidden rounded-2xl transition-all duration-300 ${
                dashboard.id === activeDashboard
                  ? 'ring-1 ring-inset ring-blue-400/30 dark:ring-blue-400/25'
                  : ''
              }`}
            >
              <div className={`absolute inset-0 ${
                dashboard.id === activeDashboard
                  ? 'bg-gradient-to-br from-blue-500/15 via-blue-400/5 to-transparent dark:from-blue-400/35 dark:via-blue-500/15 dark:to-transparent'
                  : 'bg-gradient-to-br from-gray-500/5 via-transparent to-transparent dark:from-white/[0.06] dark:via-transparent dark:to-transparent'
              }`} />
              <div className="relative rounded-2xl bg-white/30 dark:bg-gray-800/55 border border-gray-200/25 dark:border-white/[0.07] p-4 shadow-sm shadow-black/[0.03] dark:shadow-black/15">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="text-base font-semibold text-gray-900 dark:text-white truncate">
                        {dashboard.name}
                      </h5>
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
                      <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                        {dashboard.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1.5 ml-3 shrink-0">
                    <button
                      onClick={() => openEditModal(dashboard)}
                      className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-500/10 rounded-lg transition-all"
                      title={t('common.edit')}
                    >
                      <Pencil size={16} weight="bold" />
                    </button>
                    
                    {dashboards.length > 1 && (
                      <button
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
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <SquaresFour size={40} weight="duotone" className="text-gray-400 dark:text-gray-500 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">{t('dashboards.no_dashboards')}</p>
          <button
            onClick={openCreateModal}
            className="mt-3 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:underline"
          >
            {t('dashboards.create_first')}
          </button>
        </div>
      )}

      {/* Info-Hinweis */}
      <div className="p-3.5 bg-blue-500/8 dark:bg-blue-500/8 border border-blue-500/15 rounded-xl">
        <p className="text-sm text-blue-800 dark:text-blue-200 leading-relaxed">
          {t('dashboards.tip')}
        </p>
      </div>

      {/* ===== Create/Edit Modal ===== */}
      {showModal && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div
            ref={modalRef}
            className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-content-in"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-200/30 dark:border-white/[0.06]">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2.5" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                {editingDashboard ? (
                  <><Pencil size={20} weight="duotone" className="text-blue-400" /> {t('dashboards.edit_dashboard')}</>
                ) : (
                  <><Plus size={20} weight="duotone" className="text-blue-400" /> {t('dashboards.create_dashboard')}</>
                )}
              </h3>
              <button
                onClick={closeModal}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/20 dark:hover:bg-white/10 rounded-lg transition-all"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
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
              <div className="bg-white/30 dark:bg-gray-800/45 rounded-xl p-4 border border-gray-200/40 dark:border-white/10">
                <ToggleSwitch
                  checked={dashboardShowProxmox}
                  onChange={setDashboardShowProxmox}
                  label="Proxmox Monitoring Tab"
                  description={t('dashboards.show_proxmox')}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-3 bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-300/60 dark:hover:bg-white/15 transition-all"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isSavingDashboard || !dashboardName.trim()}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-xl font-semibold text-sm transition-all shadow-lg hover:shadow-xl"
                >
                  {isSavingDashboard ? t('dashboards.saving') : (editingDashboard ? t('dashboards.update') : t('dashboards.create'))}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* ===== Delete Confirmation Modal ===== */}
      {showDeleteConfirm && createPortal(
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
          <div className="backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-gray-200/50 dark:border-white/10 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-content-in">
            <div className="px-6 pt-5 pb-4">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/15 rounded-xl">
                  <Trash size={22} weight="duotone" className="text-red-500" />
                </div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                  {t('dashboards.delete_title')}
                </h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-line">
                {t('dashboards.delete_confirm', { name: showDeleteConfirm.name })}
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 bg-gray-200/60 dark:bg-white/10 text-gray-700 dark:text-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-300/60 dark:hover:bg-white/15 transition-all"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold text-sm transition-all shadow-lg"
              >
                {t('common.yes_delete')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default DashboardsCard;
