# Spotify add-on setup guide

## 🎵 Overview

The Spotify add-on adds a **Now Playing** widget to your Servicedock dashboard. It shows the current track in real time with album art, artist, title, and a progress bar.

### Features

- Real-time now playing
- Album art with track metadata (title, artist, album)
- Progress bar with time
- OAuth 2.0 with encrypted tokens
- Automatic token refresh in the background

## 📋 Prerequisites

1. **Spotify account** (Free or Premium)
2. **Spotify Developer account** (free)
3. **Servicedock** with admin access

## 🚀 Setup

### Step 1: Create a Spotify app

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Sign in with your Spotify account
3. Click **Create app**
4. Fill in the form:
   - **App name:** `servicedock` (or any name)
   - **App description:** e.g. `Now playing widget for my dashboard`
   - **Redirect URIs:**
     - **HTTP (local only):** `http://127.0.0.1:8000/api/spotify/callback`
     - **HTTPS (LAN):** `https://10.10.10.50/api/spotify/callback`
     - **HTTPS (your domain):** `https://your-domain.com/api/spotify/callback`
   - ⚠️ **Spotify allows HTTP only for `127.0.0.1` and `localhost`.**
   - **Website:** optional
   - **Which API/SDKs are you planning to use?** select **Web API**
5. Accept the terms
6. Click **Save**

**Tip:** For purely local use you can register only `http://127.0.0.1:8000/api/spotify/callback`.

### Step 2: Copy client credentials

1. In your app, open **Settings**
2. Copy **Client ID**
3. Click **View client secret** and copy **Client secret**
4. **Never** publish the client secret

### Step 3: Configure Servicedock

1. Open the dashboard (e.g. `http://127.0.0.1:3000` or your HTTPS URL)
2. Sign in as **admin**
3. Open **Settings** (⚙️)
4. Go to **AddOns**
5. Find the **Spotify** card
6. Fill in:
   - **Client ID**
   - **Client secret**
   - **Redirect URI:** e.g. `https://10.10.10.50/api/spotify/callback` (often prefilled when using HTTPS on the LAN)
7. Click **Save configuration**

**Important:** For other devices on your LAN you should open the dashboard at **`https://10.10.10.50`** (or your HTTPS URL) so the OAuth redirect matches what Spotify expects.

### Step 4: Connect your Spotify account

1. After saving, click **Connect with Spotify**
2. A new tab/window opens
3. Complete Spotify login if prompted, then **Agree**
4. You should see a success page
5. The window closes after a few seconds (or close it manually)
6. Back in Servicedock the status should show **Connected**

**Note:** You can close the callback tab after success; playback polling runs server-side.

### Step 5: Use the widget

1. The widget appears on the dashboard (next to the tab bar)
2. It refreshes about every 5 seconds
3. When nothing is playing it shows a “no music” state

## 🔒 Security & rate limits

### Encryption

Sensitive values are stored encrypted:
- Client secret (Fernet AES-128)
- Access token (refreshed automatically)
- Refresh token

### Token lifecycle

- Access tokens expire after ~1 hour
- Refresh happens ~5 minutes before expiry
- No manual refresh needed

### Rate limiting

- **Now playing:** max 30 requests/minute
- **Admin install/uninstall:** max 5 requests/minute

### Scopes

- `user-read-currently-playing`
- `user-read-playback-state`

## 🐛 Troubleshooting

### Widget is empty

- Settings → AddOns: confirm **Connected**
- If not, use **Connect with Spotify** again
- Hard refresh the page (Ctrl+F5)

### “No music playing”

- Start playback in Spotify
- Wait up to ~5 seconds for the next poll

### OAuth: `INVALID_CLIENT: Insecure redirect URI`

- HTTP is only allowed for `127.0.0.1` / `localhost`
- For `http://192.168.x.x` you **must** use HTTPS
- Either use `http://127.0.0.1:3000` locally, or HTTPS via Nginx/reverse proxy

### OAuth: `Redirect URI mismatch`

1. Spotify app **Settings** → redirect URIs must **exactly** match Servicedock (scheme, host, port, path, no stray slash)
2. Copy the URI shown in Servicedock AddOns into Spotify

### Reconnect

1. Settings → AddOns → Spotify
2. **Remove Spotify**
3. Save new credentials if needed
4. **Connect with Spotify** again

## 🏭 Production (optional)

1. Terminate TLS with a real certificate (e.g. Let’s Encrypt)
2. In the Spotify app, add `https://your-domain.com/api/spotify/callback`
3. Servicedock will surface the correct redirect when opened on that host
4. Connect again

You can register **multiple** redirect URIs in Spotify (local + production).

## 📝 Access & OAuth rules

**Spotify rule:** HTTP callbacks are only allowed for `127.0.0.1` and `localhost`.

**Patterns:**

1. **On the server machine:** `http://127.0.0.1:3000` → OAuth ✅  
2. **Another device via `http://192.168.x.x`** → HTTP to a LAN IP → OAuth ❌  
   - Fix: use **`https://10.10.10.50`** (or your HTTPS URL), or SSH port forwarding to `127.0.0.1`
3. **HTTPS + domain:** `https://your-domain.com` → OAuth ✅

### SSH port forwarding (LAN without HTTPS)

On your laptop:

```bash
ssh -L 3000:localhost:3000 -L 8000:localhost:8000 user@192.168.x.x
```

Then open `http://127.0.0.1:3000` — Spotify sees `127.0.0.1`.

## 💬 Support

1. Use the troubleshooting section above
2. Backend logs: `docker compose logs backend`
3. Browser devtools (F12) for frontend errors

---

**Enjoy your Now Playing widget! 🎵**
