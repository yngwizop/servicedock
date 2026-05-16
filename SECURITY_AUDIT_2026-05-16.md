# Security Audit — ServiceDock

**Audit date:** 16 May 2026  
**Scope:** Full static review of `/home/servicedock` (backend FastAPI, frontend React, nginx, Docker, docs)  
**Prior audits:** [SECURITY_AUDIT_2025-12-05.md](SECURITY_AUDIT_2025-12-05.md) (claimed 9.5/10), [SECURITY_AUDIT_2025-11-14.md](SECURITY_AUDIT_2025-11-14.md)  
**Method:** Independent code review, grep for dangerous patterns, cross-check against `claude.md` claims  
**Auditor:** Security audit agent (2026 refresh)

---

## 1. Executive summary

### Security score: **6.8 / 10** — Adequate for trusted homelab; not “excellent production-ready”

ServiceDock has a **solid baseline**: httpOnly JWT cookies, bcrypt, Fernet for secrets, parameterized SQL in most paths, rate limiting, audit logging, Docker hardening, and no `eval()` / `dangerouslySetInnerHTML` in application code. Those strengths remain real.

This audit **downgrades** the December 2025 score (9.5/10) because several issues called out in parallel review work are **confirmed in source**, and documentation (`claude.md`) **overstates** JWT refresh rotation and DOMPurify coverage. The highest practical risks are:

1. **Stored CSS injection** via unvalidated `bg_image_url` (admin → all viewers).
2. **LDAP filter injection** when AD login is enabled.
3. **No refresh-token rotation or server-side revocation** (stolen refresh cookie valid until expiry).
4. **Authorization gaps** on reorder (cross-dashboard position tampering).

| Severity | Count |
|----------|------:|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 8 |

**Grep (application code):**

| Pattern | `frontend/src` | `backend/` |
|---------|----------------|------------|
| `dangerouslySetInnerHTML` | 0 | 0 |
| `eval(` | 0 | 0 |

**Recommendation:** Treat as deployable for **single-tenant homelab behind VPN/reverse proxy** after addressing High findings; do not assume “9.5/10 production-ready” without remediation.

---

## 2. API inventory

Base URL assumed: `https://<host>/api`. Auth: **Public** = no session; **Admin** = JWT `type=admin`; **Viewer** = JWT `type=viewer`; **Session** = any authenticated role.

| Method | Endpoint | Auth | Notes |
|--------|----------|------|-------|
| GET | `/` | Public | Health (main.py) |
| GET | `/api/info` | Public | Dev only (`ENVIRONMENT != production`) |
| POST | `/api/login` | Public | Rate limit 5/min; IP lockout |
| POST | `/api/refresh` | Session (refresh cookie) | Issues new access + refresh cookies; **no rotation/revocation** |
| POST | `/api/logout` | Public | Clears cookies (no server denylist) |
| GET | `/api/auth/mode` | Public | AD enabled, domain, local user count |
| GET | `/api/auth/me` | Admin + Viewer | Session metadata |
| PUT | `/api/auth/password` | Admin + Viewer | Local users only; AD blocked |
| GET | `/api/services` | Admin + Viewer | Query: `dashboard_id` |
| POST | `/api/services` | Admin | |
| PUT | `/api/services/reorder` | Admin | **No `dashboard_id` scope** |
| PUT | `/api/services/{id}` | Admin | **No `dashboard_id` on update** |
| DELETE | `/api/services/{id}` | Admin | |
| GET | `/api/shortcuts` | Admin + Viewer | Query: `dashboard_id` |
| POST | `/api/shortcuts` | Admin | |
| PUT | `/api/shortcuts/reorder` | Admin | **No `dashboard_id` scope** |
| PUT | `/api/shortcuts/{id}` | Admin | |
| DELETE | `/api/shortcuts/{id}` | Admin | |
| GET | `/api/appearance` | Admin + Viewer | |
| GET | `/api/appearance/wallpaper` | **Public** | Login background |
| PUT | `/api/appearance` | Admin | `bg_image_url` not URL-validated |
| GET | `/api/wallpapers` | Admin + Viewer | List uploads |
| POST | `/api/wallpapers/upload` | Admin | MIME/ext only; **no magic bytes** |
| GET | `/api/wallpapers/{filename}` | **Public** | Path traversal mitigated |
| DELETE | `/api/wallpapers/{filename}` | Admin | |
| GET | `/api/dashboards` | Admin + Viewer | |
| POST | `/api/dashboards` | Admin | |
| PUT | `/api/dashboards/{id}` | Admin | |
| DELETE | `/api/dashboards/{id}` | Admin | |
| GET | `/api/dashboards/{id}/proxmox-layout` | Admin + Viewer | |
| PUT | `/api/dashboards/{id}/proxmox-layout` | Admin | |
| DELETE | `/api/dashboards/{id}/proxmox-layout` | Admin | |
| GET | `/api/dashboards/{id}/proxmox-visible-cards` | Admin + Viewer | |
| PUT | `/api/dashboards/{id}/proxmox-visible-cards` | Admin | |
| GET | `/api/proxmox/config` | Admin | |
| PUT | `/api/proxmox/config` | Admin | |
| DELETE | `/api/proxmox/config` | Admin | |
| POST | `/api/proxmox/test` | Admin | |
| GET | `/api/proxmox/vms` | Admin | |
| POST | `/api/proxmox/vm/{vmid}/start` | Admin | |
| POST | `/api/proxmox/vm/{vmid}/stop` | Admin | |
| POST | `/api/proxmox/vm/{vmid}/reboot` | Admin | |
| GET | `/api/proxmox/cluster-stats` | Admin | |
| GET | `/api/admin/audit-logs` | Admin | `filter_type` in f-string SQL |
| GET | `/api/admin/audit-stats` | Admin | |
| POST | `/api/admin/audit-logs/cleanup` | Admin | |
| POST | `/api/admin/audit-logs/delete-all` | Admin | Password confirm |
| GET | `/api/admin/proxmox/token-info` | Admin | Proxmox token age (not JWT) |
| GET | `/api/admin/rate-limit-usage` | Admin | Derived from audit log |
| POST | `/api/admin/proxmox/rotate-token` | Admin | Proxmox API token only |
| GET | `/api/spotify/status` | Admin | |
| POST | `/api/spotify/install` | Admin | |
| GET | `/api/spotify/auth-url` | Admin | OAuth state stored |
| GET | `/api/spotify/callback` | **Public** | CSRF `state` required |
| GET | `/api/spotify/now-playing` | Admin | |
| DELETE | `/api/spotify/uninstall` | Admin | |
| GET | `/api/ldap/config` | Admin | |
| PUT | `/api/ldap/config` | Admin | |
| POST | `/api/ldap/test` | Admin | |
| DELETE | `/api/ldap/config` | Admin | |
| GET | `/api/config/export` | Admin | |
| POST | `/api/config/import` | Admin | Replace needs `X-Confirm-Password` |
| POST | `/api/config/validate` | Admin | |
| GET | `/api/docs/help` | Admin (viewer if LDAP off) | Whitelist |
| GET | `/api/docs/help/{doc_id}` | Admin (viewer if LDAP off) | Path traversal guarded |
| GET | `/api/users` | Admin | |
| POST | `/api/users` | Admin | Blocked if LDAP sign-in enabled |
| PUT | `/api/users/{id}` | Admin | Blocked if LDAP sign-in enabled |
| DELETE | `/api/users/{id}` | Admin | Blocked if LDAP sign-in enabled |
| GET | `/api/integrations/health` | Admin + Viewer | |

---

## 3. Findings by severity

### High

#### SEC-2026-001 — LDAP filter injection via username

| Field | Detail |
|-------|--------|
| **Files** | `backend/core/ldap_auth.py` (lines 181, 304) |
| **Description** | User-supplied `username` is interpolated into LDAP filters without escaping RFC 4515 special characters (`*`, `(`, `)`, `\`, NUL). Attacker can alter filter logic (e.g. broad match or bypass intent). Same pattern in `test_ldap_connection` for `distinguishedName={group_dn}` if config is attacker-controlled. |
| **Reproduction** | Enable LDAP. Login with username such as `*)(uid=*))(|(uid=*` or `admin)(|(password=*` and observe search/bind behavior vs. normal user. |
| **Recommendation** | Use `ldap3.utils.conv.escape_filter_chars(username)` (and escape `group_dn` in test). Prefer parameterized filters or allowlist `^[A-Za-z0-9._-]+$` for sAMAccountName-style logins. |

#### SEC-2026-002 — Stored CSS injection via `bg_image_url`

| Field | Detail |
|-------|--------|
| **Files** | `backend/models/appearance.py`, `backend/routers/appearance.py`, `backend/routers/config.py` (import), `frontend/src/App.jsx`, `frontend/src/components/LoginModal.jsx`, `frontend/src/components/ChangePasswordModal.jsx` |
| **Description** | `bg_image_url` accepts arbitrary string (max 1000 chars). Rendered as `backgroundImage: \`url(${bg.bg_image_url})\`` in inline styles. Payloads like `x"); position:fixed; inset:0; background:red; z-index:99999; /*` break out of `url()` and inject CSS affecting all users (including login screen via public wallpaper endpoint). |
| **Reproduction** | As admin: Settings → Appearance → set background URL to `"); background:url(https://evil.example/pwned.png); /*` or use config import. Reload app; observe injected layout/CSS. |
| **Recommendation** | Validate server-side: allow only relative paths matching `^/api/wallpapers/[a-zA-Z0-9._-]+$` or `^/wallpapers/` presets; reject `)`, `"`, `;`, `\`. Frontend: use `CSS.escape()` on URL or set wallpaper via `<img src>` + object-fit instead of raw `url()` interpolation. |

#### SEC-2026-003 — No refresh-token rotation or revocation

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/auth.py` (`_set_auth_cookies`, `/api/refresh`, `/api/logout`), `claude.md` (claims rotation) |
| **Description** | Refresh endpoint decodes valid refresh JWT and issues **new** access + refresh cookies but does not invalidate prior refresh tokens (no jti, no DB/Redis denylist). Logout only deletes cookies client-side. Stolen refresh cookie works until `REFRESH_TOKEN_EXPIRE_DAYS` (default 7). |
| **Reproduction** | Login in browser A; copy `refresh_token` cookie. Logout in A. POST `/api/refresh` from B with stolen cookie → still succeeds. |
| **Recommendation** | Store refresh session server-side (jti + user + expiry); rotate jti on each refresh; revoke on logout/password change; optional refresh token family reuse detection. |

---

### Medium

#### SEC-2026-004 — localStorage role hint → UI privilege flash

| Field | Detail |
|-------|--------|
| **Files** | `frontend/src/hooks/useAuth.js`, `frontend/src/components/Sidebar.jsx`, `frontend/src/App.jsx` |
| **Description** | `servicedock_user_role` defaults to `'admin'` on cold load. `isAdmin` gates Security, Settings, Proxmox tab, edit FAB **before** `/api/auth/me` completes. Viewer may briefly see admin chrome; API still returns 403. |
| **Reproduction** | Login as AD viewer; hard refresh. Observe Security/Settings tabs until `/api/auth/me` returns `role: viewer`. |
| **Recommendation** | Default role to `null` / `unknown`; hide privileged UI until `auth/me` resolves; or derive UI only from server response (no localStorage role). |

#### SEC-2026-005 — Wallpaper upload: no magic-byte validation

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/wallpapers.py` |
| **Description** | Trusts `Content-Type` and file extension only. Non-image polyglot can be stored and served as `image/*` with `public` cache headers. |
| **Reproduction** | Upload file with `.jpg` extension and `image/jpeg` header but HTML/script body; fetch `/api/wallpapers/custom-….jpg`. |
| **Recommendation** | Verify magic bytes (e.g. Pillow `Image.open`, or `filetype`); re-encode to strip metadata; optional ClamAV. |

#### SEC-2026-006 — Help markdown links without `href` sanitization

| Field | Detail |
|-------|--------|
| **Files** | `frontend/src/components/settings/HelpTab.jsx` |
| **Description** | Custom `<a>` spreads `{...props}` including `href` from repo Markdown. `javascript:` / `data:` links in curated docs could execute in older browsers or if doc whitelist is expanded carelessly. |
| **Reproduction** | Add `[click](javascript:alert(1))` to a whitelisted help `.md`; open Help tab. |
| **Recommendation** | Wrap link renderer: allow only `http:`, `https:`, `mailto:`; use `sanitizeUrl()` from `sanitize.js`. |

#### SEC-2026-007 — Reorder endpoints ignore `dashboard_id`

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/services.py`, `backend/routers/shortcuts.py`, `backend/models/reorder.py` |
| **Description** | `PUT …/reorder` updates `position` for IDs globally with no `WHERE dashboard_id = ?`. Admin on dashboard A can reorder IDs belonging to dashboard B (integrity / IDOR-lite). |
| **Reproduction** | Create items on dashboards 1 and 2. Call reorder with IDs only from dashboard 2 while UI is on dashboard 1. Positions change cross-dashboard. |
| **Recommendation** | Require `dashboard_id` query/body; SQL: `UPDATE … WHERE id = %s AND dashboard_id = %s`. |

#### SEC-2026-008 — Audit log `filter_type` embedded in SQL f-string

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/admin.py` |
| **Description** | `where_clause` built from fixed enum branches then `f"""SELECT … {where_clause}"""`. Safe **today** (no user string in clause). Fragile if extended with user input. |
| **Recommendation** | Map `filter_type` to static query constants; add regression test; never interpolate user input. |

#### SEC-2026-009 — DOMPurify coverage gap (documentation vs code)

| Field | Detail |
|-------|--------|
| **Files** | `frontend/src/utils/sanitize.js`, `ServiceCard.jsx`, `ShortcutLink.jsx`; **not** used in `HelpTab.jsx`, appearance CSS, `EditModal`, Proxmox labels |
| **Description** | `sanitizeHtml` / `sanitizeObject` exist but are unused outside service/shortcut cards. claude.md implies broad XSS protection. |
| **Recommendation** | Document exact coverage; sanitize help links; avoid inline CSS from DB strings. |

---

### Low

#### SEC-2026-010 — `auth_session` in localStorage

| Field | Detail |
|-------|--------|
| **Files** | `frontend/src/utils/auth.js` |
| **Description** | Session hint in localStorage is not the secret, but XSS could keep UI in “logged in” state until refresh fails. |
| **Recommendation** | Optional: rely solely on `/api/auth/me` probe. |

#### SEC-2026-011 — LDAP TLS `CERT_NONE`

| Field | Detail |
|-------|--------|
| **Files** | `backend/core/ldap_auth.py` |
| **Description** | `Tls(validate=ssl.CERT_NONE)` enables MITM on LDAPS/StartTLS. |
| **Recommendation** | Configurable CA bundle; document homelab tradeoff. |

#### SEC-2026-012 — Spotify OAuth callback unauthenticated (by design)

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/spotify.py` |
| **Description** | Public callback mitigated by one-time `state` in Redis/memory. Weak if Redis down and multi-worker race. |
| **Recommendation** | Ensure Redis in production; document single-worker dev fallback risk. |

#### SEC-2026-013 — Proxmox token rotate uses `WHERE id = 1`

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/admin.py` |
| **Description** | `rotate-token` updates `proxmox_config` by `id = 1`, not `dashboard_id` from request — wrong row in multi-dashboard setups. |
| **Recommendation** | Align with `dashboard_id` parameter like `token-info`. |

#### SEC-2026-014 — Service/shortcut update without dashboard scope

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/services.py`, `shortcuts.py` |
| **Description** | Update/delete by `id` only; no check that item belongs to caller’s dashboard context. |
| **Recommendation** | Add `dashboard_id` to UPDATE/DELETE WHERE clause. |

#### SEC-2026-015 — Config import overwrites appearance without URL validation on `bg_image_url`

| Field | Detail |
|-------|--------|
| **Files** | `backend/routers/config.py` |
| **Description** | Import validates service/shortcut URL schemes but not appearance background (amplifies SEC-2026-002). |
| **Recommendation** | Reuse appearance validators on import. |

#### SEC-2026-016 — Development CSP allows `unsafe-eval`

| Field | Detail |
|-------|--------|
| **Files** | `backend/middleware/security.py` |
| **Description** | Non-production CSP includes `'unsafe-eval'` for Vite. |
| **Recommendation** | Ensure `ENVIRONMENT=production` in real deploys. |

#### SEC-2026-017 — Rate-limit / lockout in-memory without Redis

| Field | Detail |
|-------|--------|
| **Files** | `backend/core/rate_limiting.py`, `core/limiter.py` |
| **Description** | Login lockout and slowapi limits reset on restart / do not span workers without Redis. |
| **Recommendation** | Run Redis in production (`REDIS_URL`). |

---

## 4. `claude.md` claims vs reality

| Claim (claude.md) | Reality (May 2026) | Verdict |
|-------------------|-------------------|---------|
| **Token rotation** — “Refresh Tokens werden bei jedem Refresh erneuert” | New cookies issued on refresh; **no invalidation** of old refresh tokens; **not** OAuth-style rotation | **Misleading** — partial (new cookie) not rotation |
| **Security Dashboard — Token-Rotation** | UI rotates **Proxmox API** tokens (`/api/admin/proxmox/rotate-token`), not session JWTs | **Misleading** naming |
| **DOMPurify XSS protection** | Used in `ServiceCard` / `ShortcutLink` only; not Help, appearance, markdown | **Overstated** |
| **Viewer roles** — AD viewer + `require_any_role` on GET | Backend enforces viewer on reads; frontend hides admin UI via `isAdmin` with **localStorage flash** (SEC-2026-004) | **Partial** |
| **Cookie-based auth (httpOnly)** | Access/refresh in httpOnly cookies; `auth_session` + role in localStorage | **Mostly true** |
| **LDAP optional add-on** | Implemented; filter injection if enabled (SEC-2026-001) | **True with caveat** |
| **Parameterized SQL** | Dominant pattern; admin audit filter uses safe f-string enum | **Mostly true** |
| **Single-flight refresh** (`authenticatedFetch`) | Implemented in `frontend/src/utils/auth.js` | **True** |
| **Viewer: no Settings/Security/Proxmox** | Sidebar filters tabs when `isAdmin`; race on load | **Partial** |
| **Public wallpaper for login** | `/api/appearance/wallpaper` + `/api/wallpapers/{file}` public | **True** (attack surface for SEC-2026-002) |
| **Production docs/OpenAPI disabled** | `main.py` when `ENVIRONMENT == production` | **True** |
| **Test coverage “baseline”** | 6 pytest files, minimal vitest | **True** |

---

## 5. Prioritized fix backlog

| Priority | ID | Effort | Fix |
|----------|-----|--------|-----|
| P0 | SEC-2026-002 | M | Validate/sanitize `bg_image_url` server + safe CSS application client |
| P0 | SEC-2026-001 | S | LDAP filter escaping |
| P0 | SEC-2026-003 | L | Refresh token jti store + rotation + logout revocation |
| P1 | SEC-2026-007 | S | Reorder + CRUD scoped by `dashboard_id` |
| P1 | SEC-2026-004 | S | Remove admin-default role flash |
| P1 | SEC-2026-005 | M | Magic-byte image validation on upload |
| P1 | SEC-2026-006 | S | Sanitize Help markdown `href` |
| P2 | SEC-2026-008 | S | Refactor audit filter SQL |
| P2 | SEC-2026-013 | S | Proxmox rotate by `dashboard_id` |
| P2 | SEC-2026-009 | M | Align docs + expand sanitization policy |
| P2 | SEC-2026-011 | M | LDAP TLS verify option |
| P3 | SEC-2026-010, 016, 017 | S–M | Hardening / ops |

---

## 6. Regression test backlog

### pytest (backend)

| Test | Covers |
|------|--------|
| `test_ldap_filter_escape_metacharacters` | Username with `*)(` does not broaden LDAP search (mock ldap3) |
| `test_appearance_bg_image_url_rejects_css` | Reject `");`, `javascript:`, bare `http` if policy is relative-only |
| `test_refresh_invalidates_old_refresh_jti` | After refresh/logout, old refresh cookie → 401 |
| `test_reorder_respects_dashboard_id` | Reorder IDs on dashboard B unchanged when scoped to dashboard A |
| `test_wallpaper_upload_rejects_non_image_bytes` | PE/html bytes with `.jpg` → 400 |
| `test_audit_logs_filter_type_sql_injection` | `filter_type=foo'; DROP--` → 422/400, no error |
| `test_config_import_appearance_bg_url` | Import with malicious `bg_image_url` rejected |
| `test_help_docs_viewer_forbidden_when_ldap_enabled` | `require_help_docs_access` |
| `test_users_write_blocked_when_ldap_enabled` | Existing pattern in users router |

### vitest (frontend)

| Test | Covers |
|------|--------|
| `useAuth defaults role unknown until auth/me` | No admin tabs before sync |
| `sanitizeUrl blocks javascript in Help link component` | Extract link renderer test |
| `App background style uses safe URL` | Mock appearance with malicious URL |
| `authenticatedFetch single-flight refresh` | Extend `authenticatedFetch.test.js` |
| `useDashboards fetchData race` | Rapid `activeDashboard` switch keeps correct data |

---

## 7. Logic bugs (non-security but user-impacting)

### LOGIC-001 — Theme vs text color

| Item | Detail |
|------|--------|
| **Files** | `frontend/src/hooks/useAppearance.js` |
| **Issue** | `getTextColor()` always returns `appearance.text_color_dark` even when `theme === 'light'`. Light-mode users never get `text_color_light` on main UI (`App.jsx` passes `getTextColor()` to headers/grids). |
| **Fix** | `return theme === 'dark' ? appearance.text_color_dark : appearance.text_color_light`. |

### LOGIC-002 — Default appearance hides theme mesh

| Item | Detail |
|------|--------|
| **Files** | `frontend/src/App.jsx` (`shouldShowAppearanceColorTint`), `useAppearance.js` defaults |
| **Issue** | Default `bg_color` `#f0f2f5` + `bg_opacity: 1` with no image suppresses tint (by design) but fresh installs may show flat gray over mesh inconsistently until API load. |
| **Fix** | Default `bg_opacity` &lt; 1 for tint or align defaults with `init.sql`. |

### LOGIC-003 — Dashboard / data fetch race

| Item | Detail |
|------|--------|
| **Files** | `frontend/src/hooks/useServices.js`, `frontend/src/App.jsx` |
| **Issue** | On login, `fetchDashboards()` and `fetchData()` run concurrently; `fetchData` uses `activeDashboard` from localStorage without waiting for dashboard list. Fast dashboard switching has no abort: stale responses can overwrite newer state. |
| **Fix** | Sequence: load dashboards → set active → fetch services; use `AbortController` or request id in `fetchData`. |

### LOGIC-004 — `html` always has `class="dark"`

| Item | Detail |
|------|--------|
| **Files** | `frontend/src/hooks/useAppearance.js` |
| **Issue** | Comment says Tailwind `dark:` always applies; `theme` only toggles `data-sd-theme` dim/night. “Light mode” is not literal light Tailwind — confusing for appearance color settings. |
| **Fix** | Document in UI or toggle `dark` class with theme. |

### LOGIC-005 — Optimistic appearance save rolls back oddly

| Item | Detail |
|------|--------|
| **Files** | `frontend/src/hooks/useAppearance.js` |
| **Issue** | `saveAppearance` sets local state optimistically then always calls `fetchAppearance()` in `finally`, which can briefly revert UI if server lags. |
| **Fix** | Only refetch on error or merge server response. |

### LOGIC-006 — Admin audit “failed logins” filter mismatch

| Item | Detail |
|------|--------|
| **Files** | `backend/routers/admin.py` |
| **Issue** | Filter `failed_logins` uses `action = 'LOGIN'` but audit writes `LOGIN_FAILED`, `LOGIN_SUCCESS`, etc. Filter may return empty sets. |
| **Fix** | Use `action IN ('LOGIN_FAILED', 'LOGIN_BLOCKED')` or align action names. |

---

## 8. Positive controls (unchanged strengths)

- httpOnly cookies, `SameSite=strict`, secure flag in production  
- bcrypt (local users), Fernet for Proxmox/Spotify/LDAP bind password  
- Parameterized queries on CRUD paths  
- slowapi limits on routers; login IP lockout (Redis-capable)  
- OAuth state for Spotify; path traversal checks on wallpapers and help docs  
- nginx CSP (production), TLS 1.2+, Docker `read_only` / `no-new-privileges`  
- No `eval` / `dangerouslySetInnerHTML` in app source  
- Service/shortcut URL scheme blocking (backend + frontend `sanitizeUrl`)  
- LDAP sign-in disables local user writes (`users.py`)  
- Help docs whitelist + `is_relative_to` guard  

---

## 9. Comparison to December 2025 audit

The 2025-12-05 report rated **9.5/10** with **zero** High/Medium findings. This 2026 audit **reconciles** that with current code:

- Async/threadpool and Docker hardening claims still hold.  
- **New or unreported issues** (LDAP filter, CSS injection, refresh semantics, reorder scope, DOMPurify scope) warrant a **lower** score until fixed.  
- Do **not** treat “PRODUCTION READY / GO LIVE” from 2025 as still valid without P0 fixes.

---

## 10. Sign-off

| Item | Status |
|------|--------|
| Report file | `SECURITY_AUDIT_2026-05-16.md` |
| Plan file edited | No (`security_logic_audit_74b90fb3.plan.md` untouched) |
| Independent codebase read | Yes |
| Known-issue checklist | Verified (see findings above) |

**Next audit suggested:** After P0/P1 backlog merged; add CI running pytest security tests.

---

## 11. Remediation status (16 May 2026)

| ID | Status | Notes |
|----|--------|-------|
| SEC-2026-001 | **Fixed** | LDAP filter escaping |
| SEC-2026-002 | **Fixed** | Server + client `bg_image_url` validation |
| SEC-2026-003 | **Fixed** | Refresh jti store, rotation, logout/password revoke |
| SEC-2026-004 | **Fixed** | `sessionReady` + role null until `/api/auth/me` |
| SEC-2026-005 | **Fixed** | Pillow magic-byte check on upload |
| SEC-2026-006 | **Fixed** | Help link `href` sanitization |
| SEC-2026-007 | **Fixed** | Reorder scoped by `dashboard_id` |
| SEC-2026-008 | **Fixed** | `failed_logins` filter action names |
| SEC-2026-009 | **Fixed** | Help/CSS + ProxmoxCard labels sanitized |
| SEC-2026-010 | **Fixed** | Session bootstrap via `/api/auth/me` only (no localStorage hint on init) |
| SEC-2026-011 | **Fixed** | Configurable LDAP TLS |
| SEC-2026-012 | **Fixed** | postMessage + Redis docs; callback remains public by OAuth design |
| SEC-2026-013 | **Fixed** | Proxmox rotate uses `dashboard_id` |
| SEC-2026-014 | **Fixed** | Service/shortcut update/delete scoped by `dashboard_id` |
| SEC-2026-015 | **Fixed** | Config import appearance validation |
| SEC-2026-016 | **Fixed** | Production compose + `settings.py` enforce `ENVIRONMENT=production` |
| SEC-2026-017 | **Fixed** | `REDIS_URL` required in production; compose/setup defaults |

See `SECURITY_FIX_PLAN_2026-05-16.md` for file-level checklist.

---

*End of report.*
