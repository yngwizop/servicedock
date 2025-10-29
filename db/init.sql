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
    position INT DEFAULT 0 -- NEU: Reihenfolge/Priorität für Drag & Drop
);

-- HIER SIND DIE ÄNDERUNGEN (CREATE TABLE)
CREATE TABLE IF NOT EXISTS appearance (
    id INT PRIMARY KEY DEFAULT 1,
    bg_color VARCHAR(20) DEFAULT '#f0f2f5',
    bg_image_url TEXT,
    bg_opacity NUMERIC(3, 2) DEFAULT 1.0,
    shortcut_cols INT DEFAULT 6,
    service_cols INT DEFAULT 6,
    -- NEU: Spalten für Theme-Farben
    text_color_light VARCHAR(20) DEFAULT '#1f2937',
    text_color_dark VARCHAR(20) DEFAULT '#e5e7eb',
    -- NEU: Validierung für bg_opacity (0..1)
    CHECK (id = 1),
    CHECK (bg_opacity >= 0 AND bg_opacity <= 1)
);

-- HIER SIND DIE ÄNDERUNGEN (INSERT/UPDATE)
-- Fügt die Standard-Einstellungszeile ein/aktualisiert sie.
INSERT INTO appearance (id, bg_color, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark)
VALUES (1, '#f0f2f5', 1.0, 6, 6, '#1f2937', '#e5e7eb')
ON CONFLICT (id) DO UPDATE
SET
    bg_color = COALESCE(EXCLUDED.bg_color, appearance.bg_color),
    bg_opacity = COALESCE(EXCLUDED.bg_opacity, appearance.bg_opacity),
    shortcut_cols = COALESCE(EXCLUDED.shortcut_cols, appearance.shortcut_cols),
    service_cols = COALESCE(EXCLUDED.service_cols, appearance.service_cols),
    text_color_light = COALESCE(EXCLUDED.text_color_light, appearance.text_color_light),
    text_color_dark = COALESCE(EXCLUDED.text_color_dark, appearance.text_color_dark);


-- (Optional) Dummy-Daten (Unverändert)
INSERT INTO services (name, description, url, icon, position) VALUES
('Mein Mail', 'Postfach checken', 'https://mail.google.com', '✉️', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO shortcuts (name, url, icon, position) VALUES
('Google', 'https://google.com', 'https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google.svg', 1)
ON CONFLICT (id) DO NOTHING;