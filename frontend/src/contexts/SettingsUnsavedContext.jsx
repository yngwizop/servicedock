import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SettingsUnsavedDialog from '../components/settings/SettingsUnsavedDialog';

const SettingsUnsavedContext = createContext(null);

export function SettingsUnsavedProvider({ children }) {
  const dirtyMapRef = useRef(new Map());
  const [version, setVersion] = useState(0);
  const [dialog, setDialog] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const registerDirty = useCallback((id, dirty) => {
    const map = dirtyMapRef.current;
    const had = map.has(id);
    if (dirty) {
      if (had) return;
      map.set(id, true);
    } else {
      if (!had) return;
      map.delete(id);
    }
    setVersion((v) => v + 1);
  }, []);

  const unregisterDirty = useCallback((id) => {
    const map = dirtyMapRef.current;
    if (!map.has(id)) return;
    map.delete(id);
    setVersion((v) => v + 1);
  }, []);

  const isDirty = useMemo(() => dirtyMapRef.current.size > 0, [version]);

  const clearDirty = useCallback((id) => {
    registerDirty(id, false);
  }, [registerDirty]);

  const confirmLeave = useCallback((onProceed, options = {}) => {
    if (!dirtyMapRef.current.size) {
      onProceed?.();
      return;
    }
    setDialog({
      onProceed,
      onDiscard: options.onDiscard ?? null,
      onSave: options.onSave ?? null,
    });
  }, []);

  const handleStay = useCallback(() => {
    setDialog(null);
  }, []);

  const handleDiscard = useCallback(() => {
    const { onDiscard, onProceed } = dialog || {};
    onDiscard?.();
    setDialog(null);
    onProceed?.();
  }, [dialog]);

  const handleSave = useCallback(async () => {
    if (!dialog?.onSave) return;
    setIsSaving(true);
    try {
      await dialog.onSave();
      setDialog(null);
      dialog.onProceed?.();
    } finally {
      setIsSaving(false);
    }
  }, [dialog]);

  useEffect(() => {
    const onBeforeUnload = (e) => {
      if (!dirtyMapRef.current.size) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, []);

  const value = useMemo(
    () => ({
      registerDirty,
      unregisterDirty,
      clearDirty,
      isDirty,
      confirmLeave,
    }),
    [registerDirty, unregisterDirty, clearDirty, isDirty, confirmLeave]
  );

  return (
    <SettingsUnsavedContext.Provider value={value}>
      {children}
      {dialog ? (
        <SettingsUnsavedDialog
          onStay={handleStay}
          onDiscard={handleDiscard}
          onSave={dialog.onSave || null}
          isSaving={isSaving}
        />
      ) : null}
    </SettingsUnsavedContext.Provider>
  );
}

export function useSettingsUnsaved() {
  const ctx = useContext(SettingsUnsavedContext);
  if (!ctx) {
    throw new Error('useSettingsUnsaved must be used within SettingsUnsavedProvider');
  }
  return ctx;
}

/** Safe when provider is optional (e.g. tests). */
export function useSettingsUnsavedOptional() {
  return useContext(SettingsUnsavedContext);
}
