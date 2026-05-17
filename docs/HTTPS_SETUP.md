# HTTPS setup for Servicedock

## 🔒 Overview

Your dashboard runs with HTTPS behind an Nginx reverse proxy.

### What is configured

- ✅ **Nginx reverse proxy** as a Docker container
- ✅ **Self-signed SSL certificate** for local use
- ✅ **HTTP → HTTPS redirect** (automatic)
- ✅ **Modern TLS** (TLS 1.2 / 1.3)
- ✅ **Security headers** (HSTS, X-Frame-Options, etc.)

## 🌐 Access

### HTTPS (recommended)
```
https://10.10.10.50
```

### HTTP (redirects to HTTPS)
```
http://10.10.10.50
```

## 🎵 Spotify OAuth setup

### 1. Spotify Developer Dashboard

Add to your Spotify app:
```
https://10.10.10.50/api/spotify/callback
```

### 2. Servicedock dashboard

1. Open `https://10.10.10.50`
2. Accept the certificate warning (see below)
3. Settings → AddOns → Spotify
4. The redirect URI is shown correctly automatically
5. Click **Connect with Spotify**
6. Done! 🎉

## ⚠️ Browser warning

Because the certificate is self-signed, your browser shows a warning:

### Chrome / Edge
1. Click **Advanced**
2. Click **Proceed to 10.10.10.50 (unsafe)**

### Firefox
1. Click **Advanced**
2. Click **Accept the Risk and Continue**

### Safari
1. Click **Show Details**
2. Click **visit this website**

**This is normal and fine for local / homelab use.**

## 🔄 Regenerate certificate

If you change the IP or need a new certificate:

```bash
cd /home/webdashboard
./generate-ssl.sh
docker compose restart nginx
```

## 🔧 Configuration

### Nginx config
```
nginx/nginx.conf
```

### SSL certificates
```
nginx/ssl/cert.pem   (public certificate)
nginx/ssl/key.pem    (private key)
```

### Docker Compose
`docker-compose.yml` includes the `nginx` service.

## 📱 Access from other devices

You can reach the dashboard from **any device** on the network:

- ✅ PC: `https://10.10.10.50`
- ✅ Laptop: `https://10.10.10.50`
- ✅ Phone: `https://10.10.10.50`
- ✅ Tablet: `https://10.10.10.50`

**Important:** You must accept the certificate warning on each device once.

## 🚀 Container management

### Start everything
```bash
docker compose up -d
```

### Stop everything
```bash
docker compose down
```

### Restart Nginx only
```bash
docker compose restart nginx
```

### View logs
```bash
docker compose logs nginx
docker compose logs -f nginx   # follow
```

## 🔐 Security

### What is protected
- ✅ Encrypted connection (HTTPS)
- ✅ Security headers enabled
- ✅ Reachable only on your local network (typical setup)

### What to keep in mind
- ⚠️ The certificate is self-signed (browser warning is expected)
- ⚠️ Not exposed to the public internet (usually what you want)
- ⚠️ Use strong passwords

## 🎯 Ports

- **Port 80 (HTTP):** Redirects to HTTPS
- **Port 443 (HTTPS):** Main entry point
- **Ports 3000 / 8000:** Not exposed directly (traffic goes through Nginx)

## 💡 Tips

### Tired of certificate warnings?

Option 1: **Use mkcert** (no warning)
- Creates a local CA
- Browser trusts the certificate
- See mkcert documentation for setup

Option 2: **Accept the warning once** 😎
- Fine for personal homelab use
- One-time per browser

### Remote access from the internet?

You need:
1. Port forwarding on your router (443 → host:443)
2. Dynamic DNS (e.g. DuckDNS) for a stable hostname
3. A certificate for that hostname

For **local-only** use: **not required.**

## 📚 Further reading

- Nginx: https://nginx.org/en/docs/
- Docker Compose: https://docs.docker.com/compose/
- Let's Encrypt (real certificates): https://letsencrypt.org/

---

**Status:** ✅ HTTPS is active and working.  
**Access:** `https://10.10.10.50`
