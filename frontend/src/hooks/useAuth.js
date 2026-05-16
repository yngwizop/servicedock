import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { setAuthSession, clearAuthSession, authenticatedFetch } from '../utils/auth';
import { BACKEND_URL } from '../utils/backendUrl';

export function useAuth() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [sessionReady, setSessionReady] = useState(false);
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [loginError, setLoginError] = useState("");
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [loginDisabledUntil, setLoginDisabledUntil] = useState(null);
  
  // AD-Modus
  const [adEnabled, setAdEnabled] = useState(false);
  const [adDomain, setAdDomain] = useState(null);
  /** Mehrere lokale Benutzer → Login benötigt Benutzername */
  const [localUsernameRequired, setLocalUsernameRequired] = useState(false);
  
  // Rollen-Info — null until /api/auth/me confirms (no admin flash)
  const [userRole, setUserRole] = useState(null);
  const [displayName, setDisplayName] = useState(null);
  const [authMethod, setAuthMethod] = useState('local');
  /** Eingeloggter Benutzername (nicht das Login-Formularfeld `username`) */
  const [sessionUsername, setSessionUsername] = useState(null);

  // Force Password Change
  const [forcePasswordChange, setForcePasswordChange] = useState(false);
  
  const isAdmin = sessionReady && userRole === 'admin';
  const isViewer = sessionReady && userRole === 'viewer';

  const clearRoleStorage = useCallback(() => {
    localStorage.removeItem('servicedock_user_role');
    localStorage.removeItem('servicedock_auth_method');
    localStorage.removeItem('servicedock_display_name');
    localStorage.removeItem('servicedock_session_username');
  }, []);

  // Frage Auth-Modus beim Mount ab
  useEffect(() => {
    const fetchAuthMode = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/mode`);
        if (res.ok) {
          const data = await res.json();
          setAdEnabled(data.ad_enabled);
          setAdDomain(data.domain ?? null);
          setLocalUsernameRequired(Boolean(data.local_username_required));
        }
      } catch (err) {
        // Silently fail — Local-only Mode
      }
    };
    fetchAuthMode();
  }, []);

  useEffect(() => {
    const onMode = (e) => {
      const d = e.detail;
      if (!d) return;
      if (d.local_username_required != null) setLocalUsernameRequired(Boolean(d.local_username_required));
      if (d.ad_enabled != null) setAdEnabled(Boolean(d.ad_enabled));
      if (d.domain !== undefined) setAdDomain(d.domain);
    };
    window.addEventListener('servicedock-auth-mode', onMode);
    return () => window.removeEventListener('servicedock-auth-mode', onMode);
  }, []);

  const syncSessionFromMe = useCallback((data) => {
    const uname = data.username ?? null;
    setSessionUsername(uname);
    if (uname) localStorage.setItem('servicedock_session_username', uname);
    else localStorage.removeItem('servicedock_session_username');

    const name = data.display_name || null;
    setDisplayName(name);
    if (name) localStorage.setItem('servicedock_display_name', name);
    else localStorage.removeItem('servicedock_display_name');

    const role = data.role || 'admin';
    setUserRole(role);
    localStorage.setItem('servicedock_user_role', role);

    const method = data.auth_method || 'local';
    setAuthMethod(method);
    localStorage.setItem('servicedock_auth_method', method);

    if (method === 'ad') {
      setForcePasswordChange(false);
    } else {
      setForcePasswordChange(Boolean(data.force_password_change));
    }
    setSessionReady(true);
  }, []);

  /** Session nur über httpOnly-Cookie + /api/auth/me (kein localStorage-Hint) */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, { credentials: 'include' });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setAuthSession();
          setIsLoggedIn(true);
          syncSessionFromMe(data);
        } else {
          clearAuthSession();
          setIsLoggedIn(false);
          setUserRole(null);
          setDisplayName(null);
          setSessionUsername(null);
          setAuthMethod('local');
          setForcePasswordChange(false);
          clearRoleStorage();
          setSessionReady(true);
        }
      } catch {
        if (!cancelled) {
          clearAuthSession();
          setIsLoggedIn(false);
          setForcePasswordChange(false);
          clearRoleStorage();
          setSessionReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [syncSessionFromMe, clearRoleStorage]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginDisabled) {
      const remainingTime = Math.ceil((loginDisabledUntil - Date.now()) / 1000);
      setLoginError(t('login.too_many_attempts', { seconds: remainingTime }));
      return;
    }

    try {
      const body = { password };
      if (username.trim()) {
        body.username = username.trim();
      }
      
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        const data = await res.json();
        setAuthSession();
        setIsLoggedIn(true);
        setPassword("");
        setUsername("");
        setLoginError("");
        setFailedLoginAttempts(0);
        syncSessionFromMe({
          username: data.username,
          display_name: data.display_name,
          role: data.role,
          auth_method: data.auth_method,
          force_password_change: data.force_password_change,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        const newAttempts = failedLoginAttempts + 1;
        setFailedLoginAttempts(newAttempts);

        if (newAttempts >= 3) {
          const disabledUntil = Date.now() + 30000;
          setLoginDisabled(true);
          setLoginDisabledUntil(disabledUntil);
          setLoginError(t('login.login_locked'));

          setTimeout(() => {
            setLoginDisabled(false);
            setLoginDisabledUntil(null);
            setFailedLoginAttempts(0);
          }, 30000);
        } else {
          // detail kann ein String ("Invalid credentials") oder ein Pydantic Array sein
          let errorMsg = t('login.wrong_password', { attempts: newAttempts });
          if (typeof errorData.detail === 'string') {
            errorMsg = errorData.detail;
          }
          setLoginError(errorMsg);
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setLoginError(t('login.backend_error'));
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${BACKEND_URL}/api/logout`, {
        method: "POST",
        credentials: "include"
      });
    } catch (err) {
      console.error("Logout error:", err);
    }
    clearAuthSession();
    setIsLoggedIn(false);
    setSessionReady(true);
    setUserRole(null);
    setAuthMethod('local');
    setDisplayName(null);
    setSessionUsername(null);
    setForcePasswordChange(false);
    clearRoleStorage();
  };

  // Helper: call this when an authenticated request fails with session expired
  const onSessionExpired = () => {
    clearAuthSession();
    setIsLoggedIn(false);
    setUserRole(null);
    setForcePasswordChange(false);
    clearRoleStorage();
    setSessionReady(true);
  };

  return {
    isLoggedIn,
    sessionReady,
    password,
    setPassword,
    username,
    setUsername,
    loginError,
    setLoginError,
    loginDisabled,
    handleLogin,
    handleLogout,
    onSessionExpired,
    // AD
    adEnabled,
    adDomain,
    localUsernameRequired,
    // Rollen
    userRole,
    isAdmin,
    isViewer,
    displayName,
    authMethod,
    sessionUsername,
    // Force Password Change
    forcePasswordChange,
    setForcePasswordChange,
  };
}
