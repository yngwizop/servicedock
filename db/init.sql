-- /home/webdashboard/db/init.sql

CREATE TABLE IF NOT EXISTS shortcuts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT,
    position INT DEFAULT 0 -- NEU: Reihenfolge/Priorität für Drag & Drop
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon TEXT,
    position INT DEFAULT 0, -- NEU: Reihenfolge/Priorität für Drag & Drop
    is_favorite BOOLEAN DEFAULT FALSE
);

-- HIER SIND DIE ÄNDERUNGEN (CREATE TABLE)
CREATE TABLE IF NOT EXISTS appearance (
    id INT PRIMARY KEY DEFAULT 1,
    bg_color VARCHAR(20) DEFAULT '#4e575f',
    bg_image_url TEXT,
    bg_opacity NUMERIC(3, 2) DEFAULT 1.0,
    shortcut_cols INT DEFAULT 6,
    service_cols INT DEFAULT 6,
    -- NEU: Spalten für Theme-Farben
    text_color_light VARCHAR(20) DEFAULT '#1f2937',
    text_color_dark VARCHAR(20) DEFAULT '#e5e7eb',
    -- NEU: Uhrenformat (12h oder 24h)
    clock_format VARCHAR(3) DEFAULT '24h',
    -- NEU: Stadt für Wetter-Widget
    weather_city VARCHAR(100) DEFAULT 'Berlin',
    -- NEU: Auswahl der Wetterfelder als JSON-Array
    weather_fields JSONB DEFAULT '["temperature", "humidity"]',
    -- NEU: Widget Visibility Toggles
    show_spotify BOOLEAN DEFAULT TRUE,
    show_weather BOOLEAN DEFAULT TRUE,
    show_clock BOOLEAN DEFAULT TRUE,
    -- Constraints mit Namen für bessere Fehlermeldungen
    CONSTRAINT appearance_single_row CHECK (id = 1),
    CONSTRAINT appearance_opacity_range CHECK (bg_opacity >= 0 AND bg_opacity <= 1),
    CONSTRAINT appearance_clock_format_valid CHECK (clock_format IN ('12h', '24h')),
    CONSTRAINT appearance_cols_range CHECK (shortcut_cols >= 1 AND shortcut_cols <= 12 AND service_cols >= 1 AND service_cols <= 12)
);

-- Indizes für bessere Performance beim Sortieren
CREATE INDEX IF NOT EXISTS idx_services_position ON services(position);
CREATE INDEX IF NOT EXISTS idx_shortcuts_position ON shortcuts(position);

-- NEU: Proxmox-Konfigurationstabelle (Multi-Dashboard Support)
CREATE TABLE IF NOT EXISTS proxmox_config (
    id SERIAL PRIMARY KEY,
    host VARCHAR(255) NOT NULL,
    port INT DEFAULT 8006,
    token_name VARCHAR(255) NOT NULL,  -- z.B. "root@pam!mytoken"
    token_value TEXT NOT NULL,         -- Der API Token Secret (verschlüsselt)
    verify_ssl BOOLEAN DEFAULT FALSE,
    node VARCHAR(100),                 -- Optional: spezifischer Node-Name
    is_cluster BOOLEAN DEFAULT FALSE,  -- NEU: Ist es ein Cluster?
    token_created_at TIMESTAMP DEFAULT NOW(),  -- NEU: Wann wurde Token erstellt
    token_last_rotated TIMESTAMP,               -- NEU: Letzte Rotation
    dashboard_id INT DEFAULT 1,                 -- Multi-Dashboard Support
    UNIQUE(dashboard_id)                        -- Pro Dashboard nur eine Proxmox-Config
);

-- NEU: Audit-Log Tabelle für API-Zugriffe
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    user_type VARCHAR(50),              -- 'admin', 'guest', 'system'
    ip_address VARCHAR(45),             -- IPv4 oder IPv6
    action VARCHAR(100) NOT NULL,       -- 'START_VM', 'STOP_VM', 'VIEW_VMS', etc.
    resource_type VARCHAR(50),          -- 'vm', 'lxc', 'config'
    resource_id VARCHAR(100),           -- VM ID, Config ID, etc.
    status VARCHAR(20),                 -- 'success', 'failed', 'denied'
    details TEXT,                       -- Zusätzliche Infos (JSON)
    user_agent TEXT                     -- Browser/Client Info
);

-- Index für schnelle Abfragen
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_log(ip_address);

-- NEU: Spotify-Konfigurationstabelle für AddOn
CREATE TABLE IF NOT EXISTS spotify_config (
    id INT PRIMARY KEY DEFAULT 1,
    client_id VARCHAR(255) NOT NULL,
    client_secret TEXT NOT NULL,          -- Verschlüsselt (wie Proxmox Token)
    redirect_uri VARCHAR(500) NOT NULL,
    access_token TEXT,                    -- Verschlüsselt
    refresh_token TEXT,                   -- Verschlüsselt
    token_expires_at TIMESTAMP,           -- Wann läuft Access Token ab
    scope TEXT,                           -- Spotify Scopes (z.B. 'user-read-currently-playing user-read-playback-state')
    connected BOOLEAN DEFAULT FALSE,      -- Ist OAuth Flow abgeschlossen?
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT spotify_single_row CHECK (id = 1)
);

-- Index für schnelle Token-Abfrage
CREATE INDEX IF NOT EXISTS idx_spotify_connected ON spotify_config(connected);

-- NEU: Multi-Dashboard Support
CREATE TABLE IF NOT EXISTS dashboards (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT DEFAULT 'dashboard',
    is_active BOOLEAN DEFAULT TRUE,
    show_proxmox BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- NEU: Dashboard-Zuordnung für Services, Shortcuts, Proxmox
-- Services und Shortcuts brauchen dashboard_id
ALTER TABLE services ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE shortcuts ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;
ALTER TABLE proxmox_config ADD COLUMN IF NOT EXISTS dashboard_id INT DEFAULT 1 REFERENCES dashboards(id) ON DELETE CASCADE;

-- Indizes für bessere Performance
CREATE INDEX IF NOT EXISTS idx_services_dashboard ON services(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_shortcuts_dashboard ON shortcuts(dashboard_id);
CREATE INDEX IF NOT EXISTS idx_proxmox_dashboard ON proxmox_config(dashboard_id);

-- NEU: Proxmox Dashboard Layout Speicherung (Pro Dashboard ein Layout)
CREATE TABLE IF NOT EXISTS proxmox_dashboard_layouts (
    dashboard_id INT PRIMARY KEY REFERENCES dashboards(id) ON DELETE CASCADE,
    layout JSONB NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Default Dashboard erstellen (WICHTIG: Nutzt SERIAL, damit Sequence automatisch mitzählt!)
INSERT INTO dashboards (id, name, description, type, is_active, show_proxmox)
VALUES (1, 'Main Dashboard', 'Default Dashboard', 'dashboard', TRUE, TRUE)
ON CONFLICT (id) DO NOTHING;

-- ✅ WICHTIG: Sequence auf den nächsten Wert setzen (falls Dashboard 1 manuell inserted wurde)
SELECT setval('dashboards_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dashboards), true);

-- HIER SIND DIE ÄNDERUNGEN (INSERT/UPDATE)
-- Fügt die Standard-Einstellungszeile ein/aktualisiert sie.
INSERT INTO appearance (id, bg_color, bg_image_url, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark, clock_format, weather_city, weather_fields, show_spotify, show_weather, show_clock)
VALUES (1, '#1a1f2e', 'https://images.unsplash.com/photo-1485470733090-0aae1788d5af?q=80&w=1517&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', 0.6, 6, 6, '#ffffff', '#ffffff', '24h', 'Berlin', '["temperature", "humidity"]'::jsonb, TRUE, TRUE, TRUE)
ON CONFLICT (id) DO UPDATE
SET
    bg_color = COALESCE(EXCLUDED.bg_color, appearance.bg_color),
    bg_image_url = COALESCE(EXCLUDED.bg_image_url, appearance.bg_image_url),
    bg_opacity = COALESCE(EXCLUDED.bg_opacity, appearance.bg_opacity),
    shortcut_cols = COALESCE(EXCLUDED.shortcut_cols, appearance.shortcut_cols),
    service_cols = COALESCE(EXCLUDED.service_cols, appearance.service_cols),
    text_color_light = COALESCE(EXCLUDED.text_color_light, appearance.text_color_light),
    text_color_dark = COALESCE(EXCLUDED.text_color_dark, appearance.text_color_dark),
    clock_format = COALESCE(EXCLUDED.clock_format, appearance.clock_format),
    weather_city = COALESCE(EXCLUDED.weather_city, appearance.weather_city),
    weather_fields = COALESCE(EXCLUDED.weather_fields, appearance.weather_fields),
    show_spotify = COALESCE(EXCLUDED.show_spotify, appearance.show_spotify),
    show_weather = COALESCE(EXCLUDED.show_weather, appearance.show_weather),
    show_clock = COALESCE(EXCLUDED.show_clock, appearance.show_clock);


-- (Optional) Dummy-Daten (Unverändert)
INSERT INTO services (name, description, url, icon, position) VALUES
('Mein Mail', 'Postfach checken', 'https://mail.google.com', '✉️', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shortcuts (name, url, icon, position) VALUES
('Google', 'https://google.com', 'https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google.svg', 1)
ON CONFLICT (id) DO NOTHING;