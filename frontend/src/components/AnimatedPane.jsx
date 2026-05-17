import React from 'react';

/**
 * Remounts children when paneKey changes and plays a pane-in animation.
 *
 * @param {'slide' | 'fade'} variant
 *   slide — fade + translateY (settings panels, modals on opaque shells)
 *   fade — opacity only (main dashboard; transform on parent breaks backdrop-blur on glass cards)
 */
function AnimatedPane({ paneKey, children, className = '', variant = 'slide' }) {
  const animClass =
    variant === 'fade' ? 'animate-settings-pane-fade-in' : 'animate-settings-pane-in';
  const classes = [animClass, className].filter(Boolean).join(' ');

  return (
    <div key={paneKey} className={classes}>
      {children}
    </div>
  );
}

export default AnimatedPane;
