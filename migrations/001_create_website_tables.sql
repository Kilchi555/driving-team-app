-- Website Builder Tables for SEO-Optimized Multi-Tenant Websites

-- 1. Website Tenant Configuration
CREATE TABLE IF NOT EXISTS website_tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Domain Configuration
  custom_domain VARCHAR UNIQUE,
  subdomain VARCHAR UNIQUE NOT NULL,
  is_published BOOLEAN DEFAULT false,
  
  -- SEO Global Settings
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  seo_keywords VARCHAR(200),
  
  -- Design Settings
  primary_color VARCHAR(7) DEFAULT '#2563eb',
  secondary_color VARCHAR(7) DEFAULT '#ffffff',
  accent_color VARCHAR(7) DEFAULT '#f59e0b',
  font_family VARCHAR(50) DEFAULT 'system',
  logo_url TEXT,
  favicon_url TEXT,
  
  -- Analytics & Integration
  google_analytics_id VARCHAR,
  ga4_measurement_id VARCHAR,
  google_search_console_token VARCHAR,
  
  -- Vercel Deployment
  vercel_project_id VARCHAR,
  vercel_deployment_url VARCHAR,
  last_deployed_at TIMESTAMP,
  last_published_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(tenant_id)
);

CREATE INDEX idx_website_tenants_tenant_id ON website_tenants(tenant_id);
CREATE INDEX idx_website_tenants_subdomain ON website_tenants(subdomain);
CREATE INDEX idx_website_tenants_custom_domain ON website_tenants(custom_domain);

-- 2. Website Pages
CREATE TABLE IF NOT EXISTS website_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES website_tenants(id) ON DELETE CASCADE,
  
  -- Page Info
  title VARCHAR NOT NULL,
  slug VARCHAR NOT NULL,
  is_home BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  
  -- SEO
  seo_title VARCHAR(60),
  seo_description VARCHAR(160),
  seo_keywords VARCHAR(200),
  og_image VARCHAR,
  
  -- Content
  blocks JSONB DEFAULT '[]'::jsonb,
  
  -- Publishing
  published_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(website_id, slug)
);

CREATE INDEX idx_website_pages_website_id ON website_pages(website_id);
CREATE INDEX idx_website_pages_slug ON website_pages(slug);
CREATE INDEX idx_website_pages_published ON website_pages(is_published);

-- 3. Content Blocks (for detailed tracking and AI suggestions)
CREATE TABLE IF NOT EXISTS website_content_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  page_id UUID NOT NULL REFERENCES website_pages(id) ON DELETE CASCADE,
  
  -- Block Info
  block_type VARCHAR NOT NULL, -- 'hero', 'services', 'testimonials', 'faq', 'cta', 'contact', etc.
  block_order INTEGER NOT NULL,
  
  -- Content
  content JSONB NOT NULL,
  
  -- AI Optimization
  ai_suggestions JSONB,
  last_ai_suggestion_at TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_website_blocks_page_id ON website_content_blocks(page_id);
CREATE INDEX idx_website_blocks_type ON website_content_blocks(block_type);

-- 4. AI Optimization History (for logging and analytics)
CREATE TABLE IF NOT EXISTS website_ai_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES website_tenants(id) ON DELETE CASCADE,
  
  -- Content Info
  content_type VARCHAR, -- 'title', 'description', 'headline', 'bio', 'service_description', etc.
  original_content TEXT,
  
  -- AI Response
  ai_suggestions JSONB, -- Array of suggestions from Claude
  selected_suggestion TEXT,
  
  -- Metrics
  tokens_used INTEGER,
  optimization_type VARCHAR, -- 'seo', 'conversion', 'readability'
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_ai_history_website_id ON website_ai_history(website_id);
CREATE INDEX idx_ai_history_content_type ON website_ai_history(content_type);

-- 5. Website Analytics (simple, privacy-friendly tracking)
CREATE TABLE IF NOT EXISTS website_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES website_tenants(id) ON DELETE CASCADE,
  
  -- Event Data
  event_type VARCHAR NOT NULL, -- 'page_view', 'cta_click', 'form_submit', 'booking_click'
  event_url VARCHAR,
  event_data JSONB,
  
  -- User Info (anonymized)
  referrer VARCHAR,
  user_agent VARCHAR,
  ip_hash VARCHAR, -- Hashed for privacy
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_analytics_website_id ON website_analytics_events(website_id);
CREATE INDEX idx_analytics_event_type ON website_analytics_events(event_type);
CREATE INDEX idx_analytics_created ON website_analytics_events(created_at);

-- 6. Website Settings & Customizations
CREATE TABLE IF NOT EXISTS website_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  website_id UUID NOT NULL REFERENCES website_tenants(id) ON DELETE CASCADE,
  
  -- Settings
  setting_key VARCHAR NOT NULL,
  setting_value JSONB,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(website_id, setting_key)
);

CREATE INDEX idx_website_settings_website_id ON website_settings(website_id);

-- RLS Policies for website_tenants
ALTER TABLE website_tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own website tenant"
  ON website_tenants FOR SELECT
  USING (
    auth.uid()::text = (
      SELECT user_id::text FROM tenants WHERE id = tenant_id LIMIT 1
    )
  );

CREATE POLICY "Users can update their own website tenant"
  ON website_tenants FOR UPDATE
  USING (
    auth.uid()::text = (
      SELECT user_id::text FROM tenants WHERE id = tenant_id LIMIT 1
    )
  );

CREATE POLICY "Users can insert website tenant if they own the tenant"
  ON website_tenants FOR INSERT
  WITH CHECK (
    auth.uid()::text = (
      SELECT user_id::text FROM tenants WHERE id = tenant_id LIMIT 1
    )
  );

-- RLS Policies for website_pages
ALTER TABLE website_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit pages for their website"
  ON website_pages FOR ALL
  USING (
    website_id IN (
      SELECT id FROM website_tenants 
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for website_content_blocks
ALTER TABLE website_content_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit blocks for their pages"
  ON website_content_blocks FOR ALL
  USING (
    page_id IN (
      SELECT id FROM website_pages 
      WHERE website_id IN (
        SELECT id FROM website_tenants 
        WHERE tenant_id IN (
          SELECT id FROM tenants WHERE user_id = auth.uid()
        )
      )
    )
  );

-- RLS Policies for website_ai_history
ALTER TABLE website_ai_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view AI history for their website"
  ON website_ai_history FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM website_tenants 
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for website_analytics_events
ALTER TABLE website_analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view analytics for their website"
  ON website_analytics_events FOR SELECT
  USING (
    website_id IN (
      SELECT id FROM website_tenants 
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );

-- RLS Policies for website_settings
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view/edit settings for their website"
  ON website_settings FOR ALL
  USING (
    website_id IN (
      SELECT id FROM website_tenants 
      WHERE tenant_id IN (
        SELECT id FROM tenants WHERE user_id = auth.uid()
      )
    )
  );
