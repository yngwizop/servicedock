import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, X } from 'phosphor-react';
import { authenticatedFetch } from '../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

function AddItemFAB({ activeDashboard, onItemAdded }) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [activeForm, setActiveForm] = useState('service');
  const [showFAB, setShowFAB] = useState(false);

  // Form state (self-contained)
  const [serviceName, setServiceName] = useState('');
  const [serviceDesc, setServiceDesc] = useState('');
  const [serviceUrl, setServiceUrl] = useState('');
  const [serviceIcon, setServiceIcon] = useState('');
  const [shortcutName, setShortcutName] = useState('');
  const [shortcutUrl, setShortcutUrl] = useState('');
  const [shortcutIcon, setShortcutIcon] = useState('');

  // Slide-in Animation beim Mounten (Edit Mode wird aktiviert)
  useEffect(() => {
    const timerId = setTimeout(() => setShowFAB(true), 50);
    return () => clearTimeout(timerId);
  }, []);

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
      setServiceName(''); setServiceDesc(''); setServiceUrl(''); setServiceIcon('');
      onItemAdded();
      setIsOpen(false);
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
      setShortcutName(''); setShortcutUrl(''); setShortcutIcon('');
      onItemAdded();
      setIsOpen(false);
    } catch (err) {
      console.error('Error adding shortcut:', err);
    }
  };

  return (
    <>
      {/* FAB Button – slides in when scrolled to bottom */}
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

      {/* Modal */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 transition-opacity duration-300"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              className="w-full max-w-md bg-slate-900/75 dark:bg-slate-950/90 backdrop-blur-2xl rounded-2xl shadow-2xl border border-white/12 dark:border-white/8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 dark:border-white/8">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Plus size={22} weight="bold" className="text-blue-400" />
                  {t('addItem.add_heading')}
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-white/10 dark:hover:bg-white/10 transition-colors text-gray-400"
                >
                  <X size={20} weight="bold" />
                </button>
              </div>

              {/* Tab Toggle */}
              <div className="px-6 pt-4">
                <div className="flex gap-1 bg-white/10 dark:bg-white/5 rounded-xl p-1">
                  <button
                    onClick={() => setActiveForm('service')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                      activeForm === 'service'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-300 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/10'
                    }`}
                  >
                    📦 Service
                  </button>
                  <button
                    onClick={() => setActiveForm('shortcut')}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                      activeForm === 'shortcut'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-gray-300 dark:text-gray-400 hover:bg-white/10 dark:hover:bg-white/10'
                    }`}
                  >
                    🔗 Shortcut
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <div className="px-6 py-5">
                {activeForm === 'service' ? (
                  <form onSubmit={handleServiceSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        {t('addItem.service_name')}
                      </label>
                      <input
                        placeholder={t('addItem.service_name_placeholder')}
                        value={serviceName}
                        onChange={(e) => setServiceName(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        {t('addItem.description')}
                      </label>
                      <input
                        placeholder={t('addItem.description_placeholder')}
                        value={serviceDesc}
                        onChange={(e) => setServiceDesc(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        URL
                      </label>
                      <input
                        placeholder={t('addItem.url_placeholder_service')}
                        value={serviceUrl}
                        onChange={(e) => setServiceUrl(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        Icon
                      </label>
                      <input
                        placeholder={t('addItem.icon_placeholder')}
                        value={serviceIcon}
                        onChange={(e) => setServiceIcon(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium w-full transition-all shadow-md hover:shadow-lg"
                    >
                      {t('addItem.add_service')}
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                      💡 {t('addItem.icons_tip')}{' '}
                      <a href="https://selfh.st/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 transition-colors">
                        selfh.st/icons
                      </a>
                      {' '}{t('addItem.icons_tip_suffix')}
                    </p>
                  </form>
                ) : (
                  <form onSubmit={handleShortcutSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        {t('addItem.shortcut_name')}
                      </label>
                      <input
                        placeholder={t('addItem.shortcut_name_placeholder')}
                        value={shortcutName}
                        onChange={(e) => setShortcutName(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        URL
                      </label>
                      <input
                        placeholder={t('addItem.url_placeholder_shortcut')}
                        value={shortcutUrl}
                        onChange={(e) => setShortcutUrl(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 dark:text-gray-400 mb-1.5">
                        Icon
                      </label>
                      <input
                        placeholder={t('addItem.icon_placeholder')}
                        value={shortcutIcon}
                        onChange={(e) => setShortcutIcon(e.target.value)}
                        className="border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 text-white placeholder-gray-400 dark:placeholder-gray-500 p-3 w-full rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent backdrop-blur-sm transition-all"
                      />
                    </div>
                    <button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl font-medium w-full transition-all shadow-md hover:shadow-lg"
                    >
                      {t('addItem.add_shortcut')}
                    </button>
                    <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                      💡 {t('addItem.icons_tip')}{' '}
                      <a href="https://selfh.st/icons/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-300 transition-colors">
                        selfh.st/icons
                      </a>
                      {' '}{t('addItem.icons_tip_suffix')}
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default AddItemFAB;
