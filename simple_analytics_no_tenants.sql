-- Vereinfachte Analytics ohne Tenant-Komplexität
-- Passt zu deiner bestehenden users/appointments Struktur

-- 1) Analytics Events Table (ohne tenant_id)
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Event identification
  event_type VARCHAR(100) NOT NULL,
  event_category VARCHAR(50) NOT NULL,
  
  -- User context (deine bestehende Struktur)
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event data
  event_data JSONB NULL,
  metadata JSONB NULL,
  
  -- Performance metrics
  response_time_ms INTEGER NULL,
  ip_address INET NULL,
  user_agent TEXT NULL
);

-- 2) System Metrics Table (ohne tenant_id)
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metric identification
  metric_name VARCHAR(100) NOT NULL,
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20) NULL,
  
  -- Service context
  service_name VARCHAR(50) NULL,
  
  -- Additional data
  metadata JSONB NULL
);

-- 3) Indexes
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);

CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name);

-- 4) Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;

-- 5) Einfache RLS Policies
DO $$ BEGIN
  -- Analytics events: Alle authentifizierten Benutzer
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_access'
  ) THEN
    CREATE POLICY analytics_events_access ON analytics_events
      FOR ALL
      TO authenticated
      USING (true);
  END IF;
  
  -- System metrics: Alle authentifizierten Benutzer
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'system_metrics_access'
  ) THEN
    CREATE POLICY system_metrics_access ON system_metrics
      FOR ALL
      TO authenticated
      USING (true);
  END IF;
END $$;
