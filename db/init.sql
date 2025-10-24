-- /home/webdashboard/db/init.sql

CREATE TABLE IF NOT EXISTS shortcuts (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,  -- <-- KOMMA HINZUGEFÜGT
    icon TEXT
);

-- Tabelle für Services
CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    icon TEXT
);

-- NEU: Erstellt die 'appearance'-Tabelle
-- Wir nutzen 'id = 1' als "Singleton", es wird nur eine Zeile geben.
CREATE TABLE IF NOT EXISTS appearance (
    id INT PRIMARY KEY DEFAULT 1,
    bg_color VARCHAR(20) DEFAULT '#f0f2f5',
    bg_image_url TEXT,
    bg_opacity NUMERIC(3, 2) DEFAULT 1.0, -- z.B. 0.8
    CHECK (id = 1)
);

-- Fügt die Standard-Einstellungszeile ein, falls sie nicht existiert.
INSERT INTO appearance (id, bg_color, bg_opacity)
VALUES (1, '#f0f2f5', 1.0)
ON CONFLICT (id) DO NOTHING;

-- (Optional) Ein paar Dummy-Daten zum Testen, falls die Tabellen leer sind
INSERT INTO services (name, description, url, icon) VALUES
('Mein Mail', 'Postfach checken', 'https://mail.google.com', 'mail-icon.png')
ON CONFLICT (id) DO NOTHING;

INSERT INTO shortcuts (name, url) VALUES
('Google', 'https://google.com')
ON CONFLICT (id) DO NOTHING;