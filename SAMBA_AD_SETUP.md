# Samba AD DC — LXC Setup auf Proxmox

Anleitung zum Aufsetzen eines Samba Active Directory Domain Controllers als LXC Container auf Proxmox. Dient als Test-AD für die ServiceDock LDAP-Authentifizierung.

---

## 1. LXC Container erstellen

### Via Proxmox Web-UI

1. **Template herunterladen:** Datacenter → Storage (local) → CT Templates → Templates → `debian-12-standard` herunterladen
2. **Container erstellen:**
   - ID: z.B. `200`
   - Hostname: `samba-dc`
   - Password: sicheres Root-Passwort setzen
   - Template: `debian-12-standard`
   - Disk: `8 GB` reicht
   - CPU: `2 Cores`
   - RAM: `512 MB` (1024 MB empfohlen)
   - Network: Static IP empfohlen, z.B. `192.168.178.200/24`, Gateway `192.168.178.1`
   - DNS: `192.168.178.1` (dein Router) — wird später auf sich selbst umgestellt
3. **Wichtig:** ☑️ "Unprivileged container" → **NEIN** (privilegiert!). Samba AD braucht privilegierten Container.
4. **Starten:** Container starten und Console öffnen

### Alternativ via CLI auf Proxmox-Host

```bash
# Template herunterladen (falls nicht vorhanden)
pveam update
pveam download local debian-12-standard_12.7-1_amd64.tar.zst

# LXC erstellen (IPs anpassen!)
pct create 200 local:vztmpl/debian-12-standard_12.7-1_amd64.tar.zst \
  --hostname samba-dc \
  --memory 1024 \
  --cores 2 \
  --rootfs local-lvm:8 \
  --net0 name=eth0,bridge=vmbr0,ip=192.168.178.200/24,gw=192.168.178.1 \
  --nameserver 192.168.178.1 \
  --password \
  --unprivileged 0 \
  --features nesting=1

# Starten
pct start 200

# Console öffnen
pct enter 200
```

---

## 2. Samba AD DC installieren

Alle folgenden Befehle innerhalb des LXC Containers (`pct enter 200`):

### Pakete installieren

```bash
apt update && apt upgrade -y
apt install -y samba smbclient winbind krb5-user krb5-config dnsutils acl attr
```

Bei der Kerberos-Abfrage:
- **Default Realm:** `HOMELAB.LOCAL` (Großbuchstaben!)
- **Kerberos servers:** `samba-dc.homelab.local`
- **Admin server:** `samba-dc.homelab.local`

### Samba vorbereiten

```bash
# Bestehende Samba-Config sichern und Dienste stoppen
systemctl stop smbd nmbd winbind
systemctl disable smbd nmbd winbind
mv /etc/samba/smb.conf /etc/samba/smb.conf.bak
```

### Domain provisionieren

```bash
samba-tool domain provision \
  --realm=HOMELAB.LOCAL \
  --domain=HOMELAB \
  --server-role=dc \
  --dns-backend=SAMBA_INTERNAL \
  --adminpass='Passw0rd!' \
  --use-rfc2307
```

> ⚠️ **Passwort-Anforderung:** Mindestens 7 Zeichen, Großbuchstabe, Zahl oder Sonderzeichen.
> Das Admin-Passwort ist für den User `Administrator` im AD.

### Kerberos konfigurieren

```bash
cp /var/lib/samba/private/krb5.conf /etc/krb5.conf
```

### DNS auf sich selbst zeigen

```bash
# /etc/resolv.conf anpassen
cat > /etc/resolv.conf << 'EOF'
nameserver 127.0.0.1
search homelab.local
EOF
```

### Samba AD DC starten

```bash
# samba-ad-dc Dienst aktivieren
systemctl unmask samba-ad-dc
systemctl enable samba-ad-dc
systemctl start samba-ad-dc
```

### Verifizieren

```bash
# DNS Test
host -t A samba-dc.homelab.local 127.0.0.1

# LDAP Test
samba-tool domain info 127.0.0.1

# Kerberos Test
kinit Administrator
# → Passwort eingeben (Passw0rd!)
klist
```

Wenn alle drei Tests durchlaufen → AD läuft! 🎉

---

## 3. Test-User und Gruppen anlegen

```bash
# Gruppe für ServiceDock Admins erstellen
samba-tool group add ServiceDock-Admins

# Gruppe für ServiceDock Viewer (optional, readonly)
samba-tool group add ServiceDock-Viewers

# Test-User erstellen
samba-tool user create testadmin 'Test1234!' \
  --given-name="Test" \
  --surname="Admin" \
  --mail-address="testadmin@homelab.local"

samba-tool user create testviewer 'Test1234!' \
  --given-name="Test" \
  --surname="Viewer" \
  --mail-address="testviewer@homelab.local"

# User zu Gruppen hinzufügen
samba-tool group addmembers ServiceDock-Admins testadmin
samba-tool group addmembers ServiceDock-Viewers testviewer

# Verifizieren
samba-tool user list
samba-tool group listmembers ServiceDock-Admins
```

---

## 4. LDAP-Verbindung testen

### Vom Proxmox-Host oder einem anderen Rechner

```bash
# LDAP Bind Test (mit ldapsearch, falls installiert)
apt install -y ldap-utils   # falls nötig

# Anonymer Test (sollte Basis-Info zeigen)
ldapsearch -x -H ldap://192.168.178.200 -b "DC=homelab,DC=local" -s base

# Authentifizierter Bind als Administrator
ldapsearch -x -H ldap://192.168.178.200 \
  -D "CN=Administrator,CN=Users,DC=homelab,DC=local" \
  -w 'Passw0rd!' \
  -b "CN=Users,DC=homelab,DC=local" \
  "(sAMAccountName=testadmin)" \
  sAMAccountName memberOf mail displayName

# Bind als testadmin (so wie ServiceDock es machen wird)
ldapsearch -x -H ldap://192.168.178.200 \
  -D "CN=testadmin,CN=Users,DC=homelab,DC=local" \
  -w 'Test1234!' \
  -b "DC=homelab,DC=local" \
  "(sAMAccountName=testadmin)" \
  memberOf
```

### Erwartete LDAP-Werte für ServiceDock-Konfiguration

| Parameter | Wert |
|---|---|
| **LDAP Host** | `192.168.178.200` |
| **LDAP Port** | `389` (LDAP) oder `636` (LDAPS) |
| **Base DN** | `DC=homelab,DC=local` |
| **User Search Base** | `CN=Users,DC=homelab,DC=local` |
| **Bind User DN** | `CN=Administrator,CN=Users,DC=homelab,DC=local` |
| **Bind Passwort** | `Passw0rd!` |
| **User Attribut** | `sAMAccountName` |
| **Gruppen Attribut** | `memberOf` |
| **Admin-Gruppe DN** | `CN=ServiceDock-Admins,CN=Users,DC=homelab,DC=local` |
| **SSL** | Nein (intern im Homelab okay) |

---

## 5. Troubleshooting

### Samba startet nicht
```bash
# Logs prüfen
journalctl -u samba-ad-dc -e --no-pager | tail -30

# Config testen
samba-tool testparm

# DNS prüfen  
host -t SRV _ldap._tcp.homelab.local 127.0.0.1
```

### LDAP Bind schlägt fehl
```bash
# Port offen?
ss -tlnp | grep -E '389|636'

# Samba läuft?
samba-tool processes

# Firewall im LXC? (sollte standardmäßig offen sein)
iptables -L -n
```

### Passwort-Policy zu streng
```bash
# Policy anzeigen
samba-tool domain passwordsettings show

# Für Tests lockern (NICHT in Produktion!)
samba-tool domain passwordsettings set --complexity=off
samba-tool domain passwordsettings set --min-pwd-length=4
samba-tool domain passwordsettings set --min-pwd-age=0
samba-tool domain passwordsettings set --max-pwd-age=0
```

### Container nach Reboot — DNS-Fix
Falls `/etc/resolv.conf` nach einem Reboot überschrieben wird:
```bash
# Immutable Flag setzen
chattr +i /etc/resolv.conf
```

---

## 6. Aufräumen / Löschen

Wenn du den Test-AD nicht mehr brauchst:
```bash
# Auf dem Proxmox-Host
pct stop 200
pct destroy 200
```

---

## Zusammenfassung

Nach dieser Anleitung hast du:
- ✅ Einen laufenden Samba AD DC auf `192.168.178.200`
- ✅ Domain: `HOMELAB.LOCAL`  
- ✅ Administrator-Account + 2 Test-User
- ✅ 2 Gruppen: `ServiceDock-Admins` und `ServiceDock-Viewers`
- ✅ LDAP auf Port 389 erreichbar

ServiceDock kann dann gegen diesen AD per LDAP Bind authentifizieren — gleicher Code funktioniert später auch mit einem echten Windows AD.
