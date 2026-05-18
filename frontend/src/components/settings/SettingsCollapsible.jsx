import React, { useEffect, useId, useState } from 'react';
import PropTypes from 'prop-types';

/**
 * Height + opacity accordion using CSS grid 0fr/1fr.
 */
function SettingsCollapsible({ open, children, id: idProp, className = '', contentClassName = '' }) {
  const autoId = useId();
  const contentId = idProp ?? `settings-collapsible-${autoId}`;
  const [shouldRender, setShouldRender] = useState(open);
  const [visible, setVisible] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      const frame = requestAnimationFrame(() => setVisible(true));
      return () => cancelAnimationFrame(frame);
    }
    setVisible(false);
    const timer = setTimeout(() => setShouldRender(false), 300);
    return () => clearTimeout(timer);
  }, [open]);

  if (!shouldRender) return null;

  return (
    <div
      className={`settings-collapsible-grid grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
        visible ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
      } ${className}`}
      aria-hidden={!open}
    >
      <div className={`min-h-0 overflow-hidden ${contentClassName}`} id={contentId}>
        {children}
      </div>
    </div>
  );
}

SettingsCollapsible.propTypes = {
  open: PropTypes.bool.isRequired,
  children: PropTypes.node,
  id: PropTypes.string,
  className: PropTypes.string,
  contentClassName: PropTypes.string,
};

export default SettingsCollapsible;
