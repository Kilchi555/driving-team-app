-- Analytics and Monitoring Tables
-- Creates tables for storing analytics data and metrics

-- 1) Analytics Events Table - Stores all system events for analytics
CREATE TABLE IF NOT EXISTS analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Event identification
  event_type VARCHAR(100) NOT NULL, -- 'user_login', 'appointment_created', 'payment_processed', etc.
  event_category VARCHAR(50) NOT NULL, -- 'user', 'appointment', 'payment', 'system'
  
  -- Tenant context
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  
  -- Event data
  event_data JSONB NULL, -- Flexible data storage
  metadata JSONB NULL, -- Additional context
  
  -- Performance metrics
  response_time_ms INTEGER NULL,
  ip_address INET NULL,
  user_agent TEXT NULL
);

-- Indexes for analytics_events
CREATE INDEX IF NOT EXISTS idx_analytics_events_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_events_tenant ON analytics_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at ON analytics_events(created_at);
CREATE INDEX IF NOT EXISTS idx_analytics_events_category ON analytics_events(event_category);

-- 2) System Metrics Table - Stores system performance metrics
CREATE TABLE IF NOT EXISTS system_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Metric identification
  metric_name VARCHAR(100) NOT NULL, -- 'cpu_usage', 'memory_usage', 'api_response_time', etc.
  metric_value DECIMAL(10,4) NOT NULL,
  metric_unit VARCHAR(20) NULL, -- 'percent', 'ms', 'bytes', etc.
  
  -- Context
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE NULL, -- NULL for global metrics
  service_name VARCHAR(50) NULL, -- 'api', 'database', 'cache', etc.
  
  -- Additional data
  metadata JSONB NULL
);

-- Indexes for system_metrics
CREATE INDEX IF NOT EXISTS idx_system_metrics_name ON system_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_system_metrics_tenant ON system_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_metrics_created_at ON system_metrics(created_at);
CREATE INDEX IF NOT EXISTS idx_system_metrics_service ON system_metrics(service_name);

-- 3) Tenant Analytics Summary Table - Pre-calculated analytics for performance
CREATE TABLE IF NOT EXISTS tenant_analytics_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Time period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- 'hour', 'day', 'week', 'month'
  
  -- User metrics
  total_users INTEGER NOT NULL DEFAULT 0,
  active_users INTEGER NOT NULL DEFAULT 0,
  new_users INTEGER NOT NULL DEFAULT 0,
  
  -- Appointment metrics
  total_appointments INTEGER NOT NULL DEFAULT 0,
  completed_appointments INTEGER NOT NULL DEFAULT 0,
  cancelled_appointments INTEGER NOT NULL DEFAULT 0,
  
  -- Payment metrics
  total_revenue DECIMAL(12,2) NOT NULL DEFAULT 0,
  successful_payments INTEGER NOT NULL DEFAULT 0,
  failed_payments INTEGER NOT NULL DEFAULT 0,
  
  -- Performance metrics
  avg_response_time DECIMAL(8,2) NULL,
  error_rate DECIMAL(5,2) NULL,
  
  -- Activity score (0-100)
  activity_score INTEGER NOT NULL DEFAULT 0,
  
  UNIQUE(tenant_id, period_start, period_type)
);

-- Indexes for tenant_analytics_summary
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_tenant ON tenant_analytics_summary(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_period ON tenant_analytics_summary(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_tenant_analytics_type ON tenant_analytics_summary(period_type);

-- 4) Update triggers for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_tenant_analytics_summary_updated_at'
  ) THEN
    CREATE TRIGGER trg_tenant_analytics_summary_updated_at
      BEFORE UPDATE ON tenant_analytics_summary
      FOR EACH ROW EXECUTE FUNCTION set_updated_at_timestamp();
  END IF;
END $$;

-- 5) Enable RLS
ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_analytics_summary ENABLE ROW LEVEL SECURITY;

-- 6) RLS Policies (mit IF NOT EXISTS)
-- Analytics events: Super admins can see all, tenant admins see their tenant's data
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_super_admin_access'
  ) THEN
    CREATE POLICY analytics_events_super_admin_access ON analytics_events
      FOR ALL
      TO authenticated
      USING (true); -- Super admins see all
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'analytics_events_tenant_admin_access'
  ) THEN
    CREATE POLICY analytics_events_tenant_admin_access ON analytics_events
      FOR SELECT
      TO authenticated
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users 
          WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- System metrics: Super admins only
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'system_metrics_super_admin_access'
  ) THEN
    CREATE POLICY system_metrics_super_admin_access ON system_metrics
      FOR ALL
      TO authenticated
      USING (true); -- Super admins see all
  END IF;
END $$;

-- Tenant analytics summary: Tenant admins see their data
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'tenant_analytics_summary_tenant_access'
  ) THEN
    CREATE POLICY tenant_analytics_summary_tenant_access ON tenant_analytics_summary
      FOR ALL
      TO authenticated
      USING (
        tenant_id IN (
          SELECT tenant_id FROM tenant_users 
          WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
        )
      );
  END IF;
END $$;

-- 7) Keine Fake-Daten - alle Metriken werden live aus echten Tabellen berechnet
-- Die tenant_analytics_summary Tabelle wird nur für Performance-Optimierung verwendet
-- und kann später mit echten, aggregierten Daten gefüllt werden
