#!/bin/bash
# Migration: Füge token_created_at und token_last_rotated Spalten hinzu

echo "🔄 Adding token rotation columns to proxmox_config..."

docker compose exec db psql -U user -d dashboard <<-EOSQL
    -- Füge Spalten hinzu (falls noch nicht vorhanden)
    ALTER TABLE proxmox_config 
    ADD COLUMN IF NOT EXISTS token_created_at TIMESTAMP DEFAULT NOW(),
    ADD COLUMN IF NOT EXISTS token_last_rotated TIMESTAMP;
    
    -- Setze token_created_at für existierende Einträge auf NOW (falls NULL)
    UPDATE proxmox_config 
    SET token_created_at = NOW() 
    WHERE token_created_at IS NULL;
    
    -- Füge Spalten zur audit_log hinzu (falls DB neu erstellt wurde)
    CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        timestamp TIMESTAMP DEFAULT NOW(),
        user_type VARCHAR(50),
        ip_address VARCHAR(45),
        action VARCHAR(100) NOT NULL,
        resource_type VARCHAR(50),
        resource_id VARCHAR(100),
        status VARCHAR(20),
        details TEXT,
        user_agent TEXT
    );
    
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
    CREATE INDEX IF NOT EXISTS idx_audit_ip ON audit_log(ip_address);
EOSQL

echo "✅ Migration complete!"
