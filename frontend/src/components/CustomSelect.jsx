import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { CaretDown } from 'phosphor-react';

function CustomSelect({ value, onChange, options, className = '', disabled = false, compact = false }) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  const selectedOption = options.find(o => o.value === value);

  // Position the dropdown when opening
  useEffect(() => {
    if (!isOpen || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, [isOpen]);

  // Reposition on scroll/resize while open
  useEffect(() => {
    if (!isOpen) return;
    const reposition = () => {
      if (!triggerRef.current) return;
      const rect = triggerRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + 6,
        left: rect.left,
        width: rect.width,
      });
    };
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [isOpen]);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (
        triggerRef.current && !triggerRef.current.contains(e.target) &&
        dropdownRef.current && !dropdownRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  useEffect(() => {
    if (disabled) setIsOpen(false);
  }, [disabled]);

  const triggerPad = compact ? 'px-3 py-2 text-xs' : 'px-4 py-3 text-sm';

  return (
    <div className={className}>
      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between gap-2 ${triggerPad} rounded-xl font-medium transition-all duration-200 border
          dark:bg-white/[0.12] sd-night-surface backdrop-blur-md
          border-gray-300/60 dark:border-white/15 night:border-white/10
          dark:hover:bg-white/20 night:hover:bg-sd-night-800/90
          text-gray-900 dark:text-white
          disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent dark:disabled:hover:bg-white/[0.12]
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500/50' : ''}
        `}
      >
        <span className="truncate">{selectedOption?.label || value}</span>
        <CaretDown
          size={compact ? 14 : 16}
          weight="bold"
          className={`shrink-0 text-gray-500 dark:text-gray-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown via Portal — renders at document.body to escape overflow clipping */}
      {isOpen && createPortal(
        <div
          ref={dropdownRef}
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 9999,
          }}
          className="bg-slate-900/92 dark:bg-slate-950/95 night:!bg-sd-night-950/96 backdrop-blur-2xl border border-white/12 dark:border-white/8 night:border-white/10 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
        >
          <div className="py-1 max-h-64 overflow-y-auto">
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm transition-all duration-150 flex items-center gap-2
                    ${isActive
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-gray-200 hover:bg-white/10 dark:hover:bg-white/10 night:hover:bg-white/5 font-medium'
                    }
                  `}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

export default CustomSelect;
