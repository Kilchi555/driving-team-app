-- External Calendars System
-- Ermöglicht Staff-Mitgliedern, ihre privaten Kalender zu verbinden

-- 1. External Calendars Tabelle
CREATE TABLE IF NOT EXISTS external_calendars (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'microsoft', 'apple', 'ics', 'caldav')),
  account_identifier VARCHAR(255) NOT NULL, -- Email oder Account-Name
  connection_type VARCHAR(20) NOT NULL CHECK (connection_type IN ('oauth', 'ics_url', 'caldav')),
  
  -- OAuth Credentials (verschlüsselt)
  access_token TEXT, -- Verschlüsselt gespeichert
  refresh_token TEXT, -- Verschlüsselt gespeichert
  token_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- ICS/Caldav Credentials
  ics_url TEXT, -- Für ICS-Import
  caldav_url TEXT, -- Für CalDAV
  caldav_username TEXT, -- Verschlüsselt
  caldav_password TEXT, -- Verschlüsselt
  
  -- Sync Status
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_token TEXT, -- Für Delta-Sync
  etag TEXT, -- Für HTTP-ETag
  sync_enabled BOOLEAN DEFAULT true,
  
  -- Metadata
  calendar_name VARCHAR(255), -- Name des Kalenders
  calendar_color VARCHAR(7), -- Hex-Farbe
  timezone VARCHAR(50) DEFAULT 'Europe/Zurich',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  UNIQUE(tenant_id, staff_id, provider, account_identifier)
);

-- 2. External Busy Times Tabelle
CREATE TABLE IF NOT EXISTS external_busy_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  external_calendar_id UUID NOT NULL REFERENCES external_calendars(id) ON DELETE CASCADE,
  
  -- Event Details
  external_event_id VARCHAR(255) NOT NULL, -- ID im externen System
  event_title VARCHAR(255), -- Optional, für Debugging
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Sync Info
  last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sync_source VARCHAR(20) NOT NULL, -- 'google', 'microsoft', etc.
  
  -- Constraints
  UNIQUE(tenant_id, staff_id, external_calendar_id, external_event_id, start_time)
);

-- 3. Indizes für Performance
CREATE INDEX IF NOT EXISTS idx_external_calendars_tenant_staff 
  ON external_calendars(tenant_id, staff_id);

CREATE INDEX IF NOT EXISTS idx_external_calendars_sync 
  ON external_calendars(sync_enabled, last_sync_at) 
  WHERE sync_enabled = true;

CREATE INDEX IF NOT EXISTS idx_external_busy_times_staff_date 
  ON external_busy_times(staff_id, start_time, end_time);

CREATE INDEX IF NOT EXISTS idx_external_busy_times_tenant 
  ON external_busy_times(tenant_id);

-- 4. RLS Policies
ALTER TABLE external_calendars ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_busy_times ENABLE ROW LEVEL SECURITY;

-- External Calendars RLS
CREATE POLICY external_calendars_tenant_isolation ON external_calendars
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- External Busy Times RLS  
CREATE POLICY external_busy_times_tenant_isolation ON external_busy_times
  FOR ALL TO authenticated
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));

-- 5. Trigger für updated_at
CREATE OR REPLACE FUNCTION update_external_calendars_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_external_calendars_updated_at
  BEFORE UPDATE ON external_calendars
  FOR EACH ROW
  EXECUTE FUNCTION update_external_calendars_updated_at();

-- 6. Cleanup alte Busy Times (älter als 90 Tage)
CREATE OR REPLACE FUNCTION cleanup_old_external_busy_times()
RETURNS void AS $$
BEGIN
  DELETE FROM external_busy_times 
  WHERE start_time < NOW() - INTERVAL '90 days';
END;
$$ LANGUAGE plpgsql;

-- 7. Kommentare
COMMENT ON TABLE external_calendars IS 'Verbindungen zu externen Kalendern (Google, Microsoft, Apple, ICS)';
COMMENT ON TABLE external_busy_times IS 'Gebuchte Zeiten aus externen Kalendern für Verfügbarkeitsprüfung';
COMMENT ON COLUMN external_calendars.access_token IS 'OAuth Access Token (verschlüsselt)';
COMMENT ON COLUMN external_calendars.refresh_token IS 'OAuth Refresh Token (verschlüsselt)';
COMMENT ON COLUMN external_calendars.ics_url IS 'ICS-URL für Import (z.B. Google/Outlook ICS Export)';
COMMENT ON COLUMN external_busy_times.event_title IS 'Titel des externen Events (nur für Debugging)';
