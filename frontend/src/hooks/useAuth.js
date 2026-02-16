import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { setAuthSession, clearAuthSession, isAuthenticated } from '../utils/auth';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.port === '' ? 
    `${window.location.protocol}//${window.location.hostname}` :
    `${window.location.protocol}//${window.location.hostname}:8000`
  );

export function useAuth() {
  const { t } = useTranslation();
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [failedLoginAttempts, setFailedLoginAttempts] = useState(0);
  const [loginDisabled, setLoginDisabled] = useState(false);
  const [loginDisabledUntil, setLoginDisabledUntil] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");

    if (loginDisabled) {
      const remainingTime = Math.ceil((loginDisabledUntil - Date.now()) / 1000);
      setLoginError(t('login.too_many_attempts', { seconds: remainingTime }));
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/api/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setAuthSession();
        setIsLoggedIn(true);
        setPassword("");
        setLoginError("");
        setFailedLoginAttempts(0);
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
          setLoginError(errorData.detail || t('login.wrong_password', { attempts: newAttempts }));
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
  };

  // Helper: call this when an authenticated request fails with session expired
  const onSessionExpired = () => setIsLoggedIn(false);

  return {
    isLoggedIn,
    password,
    setPassword,
    loginError,
    setLoginError,
    loginDisabled,
    handleLogin,
    handleLogout,
    onSessionExpired,
  };
}
