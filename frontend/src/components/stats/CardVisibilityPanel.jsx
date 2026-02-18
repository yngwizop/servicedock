import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GearSix, Eye, EyeSlash, CaretDown } from 'phosphor-react';

/**
 * Card-Definitionen mit Kategorien für das Status-Dashboard
 */
export const CARD_DEFINITIONS = [
  // Status
  { id: 'nodes', category: 'status', labelKey: 'statusDashboard.card_nodes' },
  { id: 'vms', category: 'status', labelKey: 'statusDashboard.card_vms' },
  { id: 'lxcs', category: 'status', labelKey: 'statusDashboard.card_lxcs' },
  { id: 'tasks', category: 'status', labelKey: 'statusDashboard.card_tasks' },
  // Usage
  { id: 'top-cpu', category: 'usage', labelKey: 'statusDashboard.card_top_cpu' },
  { id: 'top-memory', category: 'usage', labelKey: 'statusDashboard.card_top_memory' },
  { id: 'top-disk', category: 'usage', labelKey: 'statusDashboard.card_top_disk' },
  // Storage
  { id: 'storage-total', category: 'storage', labelKey: 'statusDashboard.card_storage_total' },
  { id: 'storage-by-node', category: 'storage', labelKey: 'statusDashboard.card_storage_by_node' },
  { id: 'storage-by-type', category: 'storage', labelKey: 'statusDashboard.card_storage_by_type' },
  // Ceph
  { id: 'ceph-health', category: 'ceph', labelKey: 'statusDashboard.card_ceph_health' },
  { id: 'ceph-osd', category: 'ceph', labelKey: 'statusDashboard.card_ceph_osd' },
];

const ALL_CARD_IDS = CARD_DEFINITIONS.map(c => c.id);
const CEPH_CARD_IDS = CARD_DEFINITIONS.filter(c => c.category === 'ceph').map(c => c.id);

const CATEGORIES = [
  { id: 'status', labelKey: 'statusDashboard.category_status' },
  { id: 'usage', labelKey: 'statusDashboard.category_usage' },
  { id: 'storage', labelKey: 'statusDashboard.category_storage' },
  { id: 'ceph', labelKey: 'statusDashboard.category_ceph' },
];

const STORAGE_KEY = 'proxmox_visible_cards';

/**
 * Lade sichtbare Cards aus localStorage (Fallback/Cache).
 * null = noch nie konfiguriert (Auto-Detect soll greifen)
 */
export function loadVisibleCards() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch (e) {
    console.error('Error loading visible cards:', e);
  }
  return null; // null = Auto-Detect
}

/**
 * Speichere sichtbare Cards in localStorage (als Cache)
 */
export function saveVisibleCardsLocal(cardIds) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cardIds));
}

/**
 * Berechne Default-Sichtbarkeit basierend auf Ceph-Verfügbarkeit
 */
export function getDefaultVisibleCards(cephAvailable) {
  if (cephAvailable) return [...ALL_CARD_IDS];
  return ALL_CARD_IDS.filter(id => !CEPH_CARD_IDS.includes(id));
}

/**
 * Dropdown-Panel zum Togglen der Card-Sichtbarkeit
 */
function CardVisibilityPanel({ visibleCards, onToggle, onShowAll, onHideAll, cephAvailable }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);

  // Click-outside schließt Panel
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Escape schließt Panel
  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open]);

  const visibleSet = new Set(visibleCards);
  const visibleCount = visibleCards.length;
  const totalCount = ALL_CARD_IDS.length;

  return (
    <div className="relative" ref={panelRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
          open
            ? 'bg-blue-600 text-white shadow-lg'
            : 'bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 backdrop-blur-md border border-gray-300/50 dark:border-white/10 text-gray-700 dark:text-gray-200 shadow-lg hover:shadow-xl'
        }`}
        title={t('statusDashboard.visible_cards')}
      >
        <GearSix size={18} weight="bold" />
        <span className="hidden sm:inline">{t('statusDashboard.visible_cards')}</span>
        <span className="text-xs opacity-75">({visibleCount}/{totalCount})</span>
        <CaretDown size={14} weight="bold" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white/95 dark:bg-gray-800/95 backdrop-blur-xl rounded-2xl border border-gray-300/50 dark:border-white/15 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 border-b border-gray-200/50 dark:border-white/10">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-gray-800 dark:text-white">
                {t('statusDashboard.visible_cards')}
              </h4>
              <div className="flex gap-1.5">
                <button
                  onClick={onShowAll}
                  className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                >
                  {t('statusDashboard.show_all')}
                </button>
                <button
                  onClick={onHideAll}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  {t('statusDashboard.hide_all')}
                </button>
              </div>
            </div>
          </div>

          {/* Card List */}
          <div className="p-3 max-h-80 overflow-y-auto space-y-3">
            {CATEGORIES.map(category => {
              const cardsInCategory = CARD_DEFINITIONS.filter(c => c.category === category.id);
              const isCephCategory = category.id === 'ceph';

              return (
                <div key={category.id}>
                  {/* Kategorie Header */}
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      {t(category.labelKey)}
                    </span>
                    {isCephCategory && !cephAvailable && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400 rounded">
                        N/A
                      </span>
                    )}
                  </div>

                  {/* Card Toggles */}
                  <div className="space-y-0.5">
                    {cardsInCategory.map(card => {
                      const isVisible = visibleSet.has(card.id);
                      const isCephCard = CEPH_CARD_IDS.includes(card.id);
                      const dimmed = isCephCard && !cephAvailable && !isVisible;

                      return (
                        <button
                          key={card.id}
                          onClick={() => onToggle(card.id)}
                          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm transition-all ${
                            isVisible
                              ? 'bg-blue-50 dark:bg-blue-900/20 text-gray-800 dark:text-white hover:bg-blue-100 dark:hover:bg-blue-900/30'
                              : 'text-gray-400 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700/30'
                          } ${dimmed ? 'opacity-50' : ''}`}
                        >
                          {isVisible ? (
                            <Eye size={16} weight="fill" className="text-blue-500 dark:text-blue-400 shrink-0" />
                          ) : (
                            <EyeSlash size={16} weight="regular" className="shrink-0" />
                          )}
                          <span className={`font-medium ${isVisible ? '' : 'line-through'}`}>
                            {t(card.labelKey)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ceph auto-hidden hint */}
          {!cephAvailable && !visibleCards.some(id => CEPH_CARD_IDS.includes(id)) && (
            <div className="px-4 py-2.5 border-t border-gray-200/50 dark:border-white/10 bg-gray-50/50 dark:bg-gray-900/30">
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                💡 {t('statusDashboard.ceph_auto_hidden')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CardVisibilityPanel;
