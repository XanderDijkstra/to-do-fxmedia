-- Client reporting tables: multi-client marketing data layer
-- Data is pulled from GA4, Google Search Console, and Meta Ads on a daily schedule.

-- Clients: one row per agency client
CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  ga4_property_id TEXT,
  gsc_site_url TEXT,
  meta_ad_account_id TEXT,
  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_slug ON clients(slug);
CREATE INDEX idx_clients_active ON clients(active);

CREATE TRIGGER trigger_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- metrics_daily: denormalized daily metrics from all sources
-- source: 'ga4' | 'gsc' | 'meta'
-- dimensions: jsonb for source-specific breakdowns (campaign, page, query, device, etc.)
CREATE TABLE metrics_daily (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ga4', 'gsc', 'meta')),
  date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC,
  dimensions JSONB DEFAULT '{}'::jsonb,
  pulled_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Uniqueness: one row per (client, source, date, metric, dimension-set)
  UNIQUE (client_id, source, date, metric_name, dimensions)
);

CREATE INDEX idx_metrics_client_source_date ON metrics_daily(client_id, source, date DESC);
CREATE INDEX idx_metrics_date ON metrics_daily(date DESC);
CREATE INDEX idx_metrics_source ON metrics_daily(source);
CREATE INDEX idx_metrics_metric_name ON metrics_daily(metric_name);

-- pull_log: record of every data pull attempt for observability
CREATE TABLE pull_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('ga4', 'gsc', 'meta')),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'success', 'failed')),
  rows_pulled INTEGER DEFAULT 0,
  date_from DATE,
  date_to DATE,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX idx_pull_log_client ON pull_log(client_id, started_at DESC);
CREATE INDEX idx_pull_log_status ON pull_log(status);
