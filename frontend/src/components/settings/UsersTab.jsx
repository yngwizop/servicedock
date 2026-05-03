import React, { useState, useEffect, useLayoutEffect, useCallback, useMemo } from 'react';
import SettingsTopicLayout from './SettingsTopicLayout';
import { useTranslation } from 'react-i18next';
import { Users, Plus, Trash, Key, WarningCircle } from 'phosphor-react';
import { authenticatedFetch } from '../../utils/auth';
import CustomSelect from '../CustomSelect';

/** Wie AppearanceTab — lesbare Felder im hellen & dunklen Settings-Glas */
const sectionCard =
  'bg-white/30 dark:bg-gray-800/55 sd-night-surface rounded-2xl p-5 border border-gray-200/25 dark:border-white/[0.07] night:border-white/[0.06] shadow-sm shadow-black/[0.03] dark:shadow-black/20 night:shadow-black/40';
const labelClass = 'block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5';
const controlClass =
  'w-full border border-gray-300/50 dark:border-white/10 bg-white/50 dark:bg-white/10 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 rounded-xl backdrop-blur-sm transition-all text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent';
const inputClass = `${controlClass} px-3 py-2.5`;

const BACKEND_URL =
  process.env.REACT_APP_BACKEND_URL ||
  (window.location.port === ''
    ? `${window.location.protocol}//${window.location.hostname}`
    : `${window.location.protocol}//${window.location.hostname}:8000`);

function UsersTab({ onTipsTopicChange }) {
  const { t } = useTranslation();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('viewer');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [adEnabled, setAdEnabled] = useState(false);
  const [activeTopic, setActiveTopic] = useState('accounts');

  useLayoutEffect(() => {
    onTipsTopicChange?.('users', activeTopic);
  }, [activeTopic, onTipsTopicChange]);

  const usersTopicGroups = useMemo(
    () => [
      {
        key: 'users',
        label: t('settings.users.title'),
        items: [{ id: 'accounts', label: t('settings.users.list_heading') }],
      },
    ],
    [t]
  );

  useEffect(() => {
    const loadMode = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/mode`);
        if (res.ok) {
          const data = await res.json();
          setAdEnabled(Boolean(data.ad_enabled));
        }
      } catch {
        /* ignore */
      }
    };
    void loadMode();
    const onMode = (e) => {
      const d = e.detail;
      if (d && d.ad_enabled != null) setAdEnabled(Boolean(d.ad_enabled));
    };
    window.addEventListener('servicedock-auth-mode', onMode);
    return () => window.removeEventListener('servicedock-auth-mode', onMode);
  }, []);

  const load = useCallback(async () => {
    setError('');
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/users`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.detail || res.statusText);
      }
      setUsers(await res.json());
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createUser = async (e) => {
    e.preventDefault();
    setError('');
    setBusyId(-1);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
          display_name: newDisplayName.trim() || null,
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail));
      setNewUsername('');
      setNewPassword('');
      setNewRole('viewer');
      setNewDisplayName('');
      await load();
      try {
        const modeRes = await fetch(`${BACKEND_URL}/api/auth/mode`);
        if (modeRes.ok) {
          const m = await modeRes.json();
          window.dispatchEvent(new CustomEvent('servicedock-auth-mode', { detail: m }));
        }
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const patchUser = async (id, body) => {
    setError('');
    setBusyId(id);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail));
      await load();
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const deleteUser = async (id) => {
    if (!window.confirm(t('settings.users.delete_confirm'))) return;
    setError('');
    setBusyId(id);
    try {
      const res = await authenticatedFetch(`${BACKEND_URL}/api/users/${id}`, { method: 'DELETE' });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(typeof d.detail === 'string' ? d.detail : JSON.stringify(d.detail));
      await load();
      try {
        const modeRes = await fetch(`${BACKEND_URL}/api/auth/mode`);
        if (modeRes.ok) {
          const m = await modeRes.json();
          window.dispatchEvent(new CustomEvent('servicedock-auth-mode', { detail: m }));
        }
      } catch {
        /* ignore */
      }
    } catch (e) {
      setError(e.message || String(e));
    } finally {
      setBusyId(null);
    }
  };

  const resetPassword = async (id) => {
    const pw = window.prompt(t('settings.users.reset_password_prompt'));
    if (!pw || pw.length < 8) return;
    await patchUser(id, { new_password: pw });
  };

  const roleOptions = useMemo(
    () => [
      { value: 'viewer', label: t('settings.users.role_viewer') },
      { value: 'admin', label: t('settings.users.role_admin') },
    ],
    [t]
  );

  const ldapBlocksLocal = adEnabled;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Users size={28} className="text-blue-500 dark:text-blue-400 shrink-0" weight="duotone" />
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white" style={{ textShadow: '0 1px 3px rgba(0,0,0,0.25)' }}>
            {t('settings.users.title')}
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{t('settings.users.subtitle')}</p>
        </div>
      </div>

      <SettingsTopicLayout
        groups={usersTopicGroups}
        activeId={activeTopic}
        onSelect={setActiveTopic}
        navAriaLabel={t('settings.topicNav.users_nav_aria')}
      >
        {activeTopic === 'accounts' && (
          <div className="space-y-6">
            <p className="text-sm text-gray-700 dark:text-slate-200/95 leading-relaxed">{t('settings.topicNav.users_accounts_detail')}</p>

            {error && (
              <div
                className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-3 text-sm text-red-800 dark:text-red-200"
                role="alert"
              >
                {error}
              </div>
            )}

            {ldapBlocksLocal && (
              <div
                className="rounded-xl border border-amber-500/45 bg-amber-500/10 dark:bg-amber-500/15 px-4 py-3 text-sm text-amber-950 dark:text-amber-100 flex gap-3 items-start"
                role="status"
              >
                <WarningCircle className="shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" size={22} weight="fill" />
                <div>
                  <p className="font-semibold text-amber-950 dark:text-amber-50">{t('settings.users.ldap_active_title')}</p>
                  <p className="mt-1 text-amber-900/90 dark:text-amber-100/90 leading-relaxed">
                    {t('settings.users.ldap_active_notice', { addonsTab: t('settings.tabs.addons') })}
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={createUser} className={`${sectionCard} space-y-4 ${ldapBlocksLocal ? 'opacity-75' : ''}`}>
        <fieldset disabled={ldapBlocksLocal} className="space-y-4 min-w-0 border-0 p-0 m-0 disabled:pointer-events-none">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-white flex items-center gap-2">
            <Plus size={18} weight="bold" className="text-blue-500 dark:text-blue-400" />
            {t('settings.users.create_heading')}
          </h3>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>{t('settings.users.field_username')}</label>
              <input
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className={inputClass}
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.users.field_password')}</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={inputClass}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div>
              <label className={labelClass}>{t('settings.users.field_role')}</label>
              <CustomSelect value={newRole} onChange={setNewRole} options={roleOptions} className="w-full" />
            </div>
            <div>
              <label className={labelClass}>{t('settings.users.field_display_name')}</label>
              <input
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                className={inputClass}
                autoComplete="off"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={busyId === -1}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus size={18} weight="bold" />
            {t('settings.users.create_submit')}
          </button>
        </fieldset>
      </form>

      <div className={`${sectionCard} overflow-hidden p-0 ${ldapBlocksLocal ? 'opacity-75' : ''}`}>
        <div className="px-5 py-3 border-b border-gray-200/30 dark:border-white/[0.08] text-sm font-semibold text-gray-800 dark:text-white">
          {t('settings.users.list_heading')}
        </div>
        {loading ? (
          <div className="p-6 text-sm text-gray-500">{t('settings.users.loading')}</div>
        ) : (
          <div className={`overflow-x-auto ${ldapBlocksLocal ? 'pointer-events-none' : ''}`}>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-white/15 dark:border-white/[0.06]">
                  <th className="px-4 py-2">{t('settings.users.col_user')}</th>
                  <th className="px-4 py-2">{t('settings.users.col_role')}</th>
                  <th className="px-4 py-2">{t('settings.users.col_enabled')}</th>
                  <th className="px-4 py-2 text-right">{t('settings.users.col_actions')}</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-white/10 dark:border-white/[0.04] last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">{u.username}</div>
                      {u.display_name && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{u.display_name}</div>
                      )}
                      {u.force_change && (
                        <span className="text-xs text-amber-600 dark:text-amber-400">
                          {t('settings.users.must_change_password')}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <CustomSelect
                        value={u.role}
                        onChange={(val) => patchUser(u.id, { role: val })}
                        options={roleOptions}
                        className="min-w-[9rem] w-full max-w-[11rem]"
                        disabled={busyId === u.id || ldapBlocksLocal}
                        compact
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label
                        className={`inline-flex items-center gap-2 ${ldapBlocksLocal ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                      >
                        <input
                          type="checkbox"
                          checked={u.enabled}
                          disabled={busyId === u.id || ldapBlocksLocal}
                          onChange={(e) => patchUser(u.id, { enabled: e.target.checked })}
                          className="rounded border-gray-300"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">
                          {u.enabled ? t('settings.users.enabled_yes') : t('settings.users.enabled_no')}
                        </span>
                      </label>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => resetPassword(u.id)}
                        disabled={busyId === u.id || ldapBlocksLocal}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-300/60 dark:border-white/15 bg-white/40 dark:bg-white/5 px-2 py-1 text-xs text-gray-800 dark:text-gray-200 hover:bg-white/60 dark:hover:bg-white/10"
                        title={t('settings.users.reset_password')}
                      >
                        <Key size={14} />
                        {t('settings.users.reset_password')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteUser(u.id)}
                        disabled={busyId === u.id || ldapBlocksLocal}
                        className="inline-flex items-center gap-1 rounded-lg border border-red-400/40 px-2 py-1 text-xs text-red-700 dark:text-red-300 hover:bg-red-500/10"
                      >
                        <Trash size={14} />
                        {t('settings.users.delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
          </div>
        )}
      </SettingsTopicLayout>
    </div>
  );
}

export default UsersTab;
