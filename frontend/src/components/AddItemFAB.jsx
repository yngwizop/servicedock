import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Package, LinkSimple } from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';
import SettingsModalShell from './settings/SettingsModalShell';
import IconUrlHint from './IconUrlHint';
import { labelClass, inputClass } from './serviceShortcutModalStyles';
import AnimatedPane from './AnimatedPane';

function AddItemFAB({ activeDashboard, onItemAdded }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState('service');
  const [showFAB, setShowFAB] = useState(false);

  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [serviceIcon, setServiceIcon] = useState('');
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutIcon, setShortcutIcon] = useState('');

  useEffect(() => {
    const timerId = setTimeout(() => setShowFAB(true), 50);
    return () => clearTimeout(timerId);
  }, []);

  const resetServiceForm = () => {
    setServiceName('');
    setServiceDesc('');
    setServiceUrl('');
    setServiceIcon('');
  };

  const resetShortcutForm = () => {
    setShortcutName('');
    setShortcutUrl('');
    setShortcutIcon('');
  };

  const handleClose = () => {
    setIsOpen(false);
    setActiveForm('service');
  };

  const handleServiceSubmit = async (e) => {
    e.preventDefault();
    if (!serviceName || !serviceUrl) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/services`, {
        method: 'POST',
        body: JSON.stringify({
          name: serviceName,
          description: serviceDesc,
          url: serviceUrl,
          icon: serviceIcon,
          dashboard_id: activeDashboard,
        }),
      });
      resetServiceForm();
      onItemAdded();
      handleClose();
    } catch (err) {
      console.error('Error adding service:', err);
    }
  };

  const handleShortcutSubmit = async (e) => {
    e.preventDefault();
    if (!shortcutName || !shortcutUrl) return;
    try {
      await authenticatedFetch(`${BACKEND_URL}/api/shortcuts`, {
        method: 'POST',
        body: JSON.stringify({
          name: shortcutName,
          url: shortcutUrl,
          icon: shortcutIcon,
          dashboard_id: activeDashboard,
        }),
      });
      resetShortcutForm();
      onItemAdded();
      handleClose();
    } catch (err) {
      console.error('Error adding shortcut:', err);
    }
  };

  const tabClass = (active) =>
    `flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
      active
        ? 'bg-blue-600 text-white shadow-md'
        : 'text-gray-700 dark:text-gray-300 hover:bg-white/60 dark:hover:bg-white/10'
    }`;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-8 right-8 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-2xl hover:shadow-blue-500/40 flex items-center justify-center transition-all duration-500 ease-out ${
          showFAB
            ? 'translate-y-0 opacity-100 scale-100'
            : 'translate-y-16 opacity-0 scale-75 pointer-events-none'
        } hover:scale-110 active:scale-95`}
        title={t('addItem.add_title')}
      >
        <Plus size={28} weight="bold" />
      </button>

      <SettingsModalShell
        open={isOpen}
        onClose={handleClose}
        maxWidthClass="max-w-lg"
        title={t('addItem.add_heading')}
        subtitle={t('addItem.add_title')}
        icon={
          <div className="w-12 h-12 rounded-xl bg-blue-500/15 dark:bg-blue-400/20 flex items-center justify-center shrink-0 ring-1 ring-blue-500/20 dark:ring-blue-400/15">
            <Plus size={24} weight="duotone" className="text-blue-600 dark:text-blue-300" />
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex gap-1 bg-white/40 dark:bg-white/[0.06] rounded-xl p-1 border border-gray-200/40 dark:border-white/10">
            <button
              type="button"
              onClick={() => setActiveForm('service')}
              className={tabClass(activeForm === 'service')}
            >
              <Package size={18} weight={activeForm === 'service' ? 'fill' : 'duotone'} />
              {t('addItem.tab_service')}
            </button>
            <button
              type="button"
              onClick={() => setActiveForm('shortcut')}
              className={tabClass(activeForm === 'shortcut')}
            >
              <LinkSimple size={18} weight={activeForm === 'shortcut' ? 'fill' : 'duotone'} />
              {t('addItem.tab_shortcut')}
            </button>
          </div>

          <AnimatedPane paneKey={activeForm}>
          {activeForm === 'service' ? (
            <form onSubmit={handleServiceSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>{t('addItem.service_name')}</label>
                <input
                  placeholder={t('addItem.service_name_placeholder')}
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('addItem.description')}</label>
                <input
                  placeholder={t('addItem.description_placeholder')}
                  value={serviceDesc}
                  onChange={(e) => setServiceDesc(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>URL</label>
                <input
                  type="url"
                  placeholder={t('addItem.url_placeholder_service')}
                  value={serviceUrl}
                  onChange={(e) => setServiceUrl(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('serviceIcon.label')}</label>
                <input
                  type="url"
                  placeholder={t('serviceIcon.placeholder')}
                  value={serviceIcon}
                  onChange={(e) => setServiceIcon(e.target.value)}
                  className={inputClass}
                />
              </div>
              <IconUrlHint />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm transition-colors"
              >
                {t('addItem.add_service')}
              </button>
            </form>
          ) : (
            <form onSubmit={handleShortcutSubmit} className="space-y-4">
              <div>
                <label className={labelClass}>{t('addItem.shortcut_name')}</label>
                <input
                  placeholder={t('addItem.shortcut_name_placeholder')}
                  value={shortcutName}
                  onChange={(e) => setShortcutName(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>URL</label>
                <input
                  type="url"
                  placeholder={t('addItem.url_placeholder_shortcut')}
                  value={shortcutUrl}
                  onChange={(e) => setShortcutUrl(e.target.value)}
                  className={inputClass}
                  required
                />
              </div>
              <div>
                <label className={labelClass}>{t('serviceIcon.label')}</label>
                <input
                  type="url"
                  placeholder={t('serviceIcon.placeholder')}
                  value={shortcutIcon}
                  onChange={(e) => setShortcutIcon(e.target.value)}
                  className={inputClass}
                />
              </div>
              <IconUrlHint />
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center px-5 py-2.5 rounded-lg text-sm font-medium bg-blue-500/90 hover:bg-blue-600 text-white shadow-sm transition-colors"
              >
                {t('addItem.add_shortcut')}
              </button>
            </form>
          )}
          </AnimatedPane>
        </div>
      </SettingsModalShell>
    </>
  );
}

export default AddItemFAB;
