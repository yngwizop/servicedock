-- /home/webdashboard/db/init.sql

CREATE TABLE IF NOT EXISTS shortcuts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    icon TEXT
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon TEXT
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
    CHECK (id = 1)
);

-- HIER SIND DIE ÄNDERUNGEN (INSERT/UPDATE)
-- Fügt die Standard-Einstellungszeile ein/aktualisiert sie.
INSERT INTO appearance (id, bg_color, bg_opacity, shortcut_cols, service_cols, text_color_light, text_color_dark)
VALUES (1, '#f0f2f5', 1.0, 6, 6, '#1f2937', '#e5e7eb')
ON CONFLICT (id) DO UPDATE
SET
    bg_color = COALESCE(appearance.bg_color, '#f0f2f5'),
    bg_opacity = COALESCE(appearance.bg_opacity, 1.0),
    shortcut_cols = COALESCE(appearance.shortcut_cols, 6),
    service_cols = COALESCE(appearance.service_cols, 6),
    -- NEU: Update-Logik für Theme-Farben
    text_color_light = COALESCE(appearance.text_color_light, '#1f2937'),
    text_color_dark = COALESCE(appearance.text_color_dark, '#e5e7eb');


-- (Optional) Dummy-Daten (Unverändert)
INSERT INTO services (name, description, url, icon) VALUES
('Mein Mail', 'Postfach checken', 'https://mail.google.com', '✉️')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shortcuts (name, url, icon) VALUES
('Google', 'https://google.com', 'https://cdn.jsdelivr.net/gh/selfhst/icons/svg/google.svg')
ON CONFLICT (id) DO NOTHING;