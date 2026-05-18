import React, { useEffect, useRef, useState } from 'react';

const EXIT_MS = 150;

const ANIM = {
  slide: { in: 'animate-settings-pane-in', out: 'animate-settings-pane-out' },
  fade: { in: 'animate-settings-pane-fade-in', out: 'animate-settings-pane-fade-out' },
};

/**
 * Remounts children when paneKey changes and plays a pane-in animation.
 *
 * @param {'remount' | 'crossfade'} mode
 *   remount — instant swap + enter animation (default)
 *   crossfade — exit animation, then swap key + enter animation
 * @param {'slide' | 'fade'} variant
 *   slide — fade + translateY (settings panels, modals on opaque shells)
 *   fade — opacity only (transform on parent breaks descendant backdrop-blur)
 */
function AnimatedPane({
  paneKey,
  children,
  className = '',
  variant = 'slide',
  mode = 'remount',
}) {
  const { in: inClass, out: outClass } = ANIM[variant] ?? ANIM.slide;

  if (mode === 'remount') {
    const classes = [inClass, className].filter(Boolean).join(' ');
    return (
      <div key={paneKey} className={classes}>
        {children}
      </div>
    );
  }

  return (
    <CrossfadePane
      paneKey={paneKey}
      className={className}
      inClass={inClass}
      outClass={outClass}
    >
      {children}
    </CrossfadePane>
  );
}

function CrossfadePane({ paneKey, children, className, inClass, outClass }) {
  const [displayKey, setDisplayKey] = useState(paneKey);
  const [content, setContent] = useState(children);
  const [animClass, setAnimClass] = useState(inClass);
  const exitingRef = useRef(false);
  const timerRef = useRef(null);
  const latestRef = useRef({ key: paneKey, children });

  latestRef.current = { key: paneKey, children };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const finishExit = () => {
    exitingRef.current = false;
    const { key, children: nextChildren } = latestRef.current;
    setDisplayKey(key);
    setContent(nextChildren);
    setAnimClass(inClass);
  };

  const beginExit = () => {
    if (exitingRef.current) return;
    exitingRef.current = true;
    setAnimClass(outClass);
    clearTimer();
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      finishExit();
    }, EXIT_MS);
  };

  useEffect(() => {
    if (paneKey === displayKey) {
      if (!exitingRef.current) setContent(children);
      return;
    }
    beginExit();
  }, [paneKey, children, displayKey]);

  useEffect(() => () => clearTimer(), []);

  const classes = [animClass, className].filter(Boolean).join(' ');

  return <div className={classes}>{content}</div>;
}

export default AnimatedPane;
