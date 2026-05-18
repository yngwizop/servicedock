import React, { useCallback, useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import {
  settingsSegmentContainer,
  settingsSegmentPillActive,
  settingsSegmentButtonActive,
  settingsSegmentButtonInactive,
} from './settingsSurfaces';

const PILL_TRANSITION = 'transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none';

/**
 * Horizontal topic switcher with sliding pill indicator (same pattern as ProxmoxGrid workloads/status).
 */
function SettingsTopicSegmented({ items, activeId, onSelect, ariaLabel }) {
  const [pillStyle, setPillStyle] = useState(null);
  const containerRef = useRef(null);

  const measurePill = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const btn = container.querySelector(`[data-topic-id="${activeId}"]`);
    if (btn) {
      const parentRect = container.getBoundingClientRect();
      const btnRect = btn.getBoundingClientRect();
      setPillStyle({
        left: btnRect.left - parentRect.left,
        width: btnRect.width,
      });
    }
  }, [activeId]);

  const setContainerRef = useCallback(
    (node) => {
      containerRef.current = node;
      if (node) measurePill();
    },
    [measurePill]
  );

  useEffect(() => {
    measurePill();
  }, [measurePill, items]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(() => measurePill());
    ro.observe(container);
    return () => ro.disconnect();
  }, [measurePill]);

  if (!items?.length) return null;

  return (
    <div
      ref={setContainerRef}
      className={settingsSegmentContainer}
      role="tablist"
      aria-label={ariaLabel}
    >
      {pillStyle && (
        <div
          aria-hidden
          className={`${settingsSegmentPillActive} ${PILL_TRANSITION}`}
          style={{
            left: pillStyle.left,
            width: pillStyle.width,
          }}
        />
      )}
      {items.map((item) => {
        const active = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            data-topic-id={item.id}
            aria-selected={active}
            onClick={() => onSelect(item.id)}
            className={`flex-1 min-w-[8rem] rounded-lg px-3 py-2 text-sm font-medium leading-snug transition-colors duration-200 ${
              active ? settingsSegmentButtonActive : settingsSegmentButtonInactive
            }`}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

SettingsTopicSegmented.propTypes = {
  items: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
    })
  ).isRequired,
  activeId: PropTypes.string.isRequired,
  onSelect: PropTypes.func.isRequired,
  ariaLabel: PropTypes.string,
};

export default SettingsTopicSegmented;
