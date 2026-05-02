import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GearSix, Eye, EyeSlash, CaretDown, Lightbulb } from 'phosphor-react';

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
        className={`glass-btn flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-all ${
          open
            ? 'bg-blue-500/15 dark:bg-blue-400/10 night:bg-blue-950/50 text-blue-600 dark:text-blue-300 night:text-blue-200'
            : 'hover:bg-white/40 dark:hover:bg-white/10 night:hover:bg-sd-night-800/90 text-gray-700 dark:text-gray-300'
        }`}
        title={t('statusDashboard.visible_cards')}
        style={{ textShadow: '0 1px 3px rgba(0,0,0,0.3)' }}
      >
        <GearSix size={18} weight="bold" />
        <span className="hidden sm:inline">{t('statusDashboard.visible_cards')}</span>
        <span className="text-xs opacity-75">({visibleCount}/{totalCount})</span>
        <CaretDown size={14} weight="bold" className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-slate-900/95 dark:bg-slate-950/95 night:!bg-sd-night-950/96 backdrop-blur-xl rounded-2xl border border-white/12 dark:border-white/8 night:border-white/10 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 pt-4 pb-2 border-b border-white/10 dark:border-white/8">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white">
                {t('statusDashboard.visible_cards')}
              </h4>
              <div className="flex gap-1.5">
                <button
                  onClick={onShowAll}
                  className="px-2 py-1 text-xs font-medium bg-blue-500/25 dark:bg-blue-900/40 text-blue-200 dark:text-blue-300 rounded-lg hover:bg-blue-500/35 dark:hover:bg-blue-900/55 transition-colors"
                >
                  {t('statusDashboard.show_all')}
                </button>
                <button
                  onClick={onHideAll}
                  className="px-2 py-1 text-xs font-medium bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/70 text-gray-300 dark:text-gray-400 night:text-slate-200 rounded-lg hover:bg-white/15 dark:hover:bg-white/10 night:hover:bg-sd-night-700/80 transition-colors"
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
                    <span className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-500">
                      {t(category.labelKey)}
                    </span>
                    {isCephCategory && !cephAvailable && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-white/10 dark:bg-white/5 night:!bg-sd-night-800/70 text-gray-400 dark:text-gray-500 night:text-slate-300 rounded">
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
                              ? 'bg-blue-500/20 dark:bg-blue-900/25 text-white hover:bg-blue-500/30 dark:hover:bg-blue-900/35'
                              : 'text-gray-500 dark:text-gray-500 hover:bg-white/5 dark:hover:bg-white/5 night:hover:bg-sd-night-700/60'
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
            <div className="px-4 py-2.5 border-t border-white/10 dark:border-white/8 night:border-white/10 bg-white/5 dark:bg-white/5 sd-night-veil-flat">
              <p className="flex items-start gap-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
                <Lightbulb size={16} weight="duotone" className="shrink-0 mt-0.5 text-amber-400/80" aria-hidden />
                <span>{t('statusDashboard.ceph_auto_hidden')}</span>
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default CardVisibilityPanel;
