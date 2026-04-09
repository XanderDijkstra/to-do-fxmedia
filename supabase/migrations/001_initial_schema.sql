-- Contractor Lead Scraper — Initial Schema
-- Run this in your Supabase SQL Editor

-- ============================================
-- TABLES
-- ============================================

-- Leads table: stores all scraped business leads
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_name TEXT NOT NULL,
  phone_number TEXT,
  email TEXT,
  website_url TEXT,
  google_maps_url TEXT,
  address TEXT,
  city TEXT,
  postal_code TEXT,
  province TEXT,
  country TEXT CHECK (country IN ('NL', 'BE')),
  rating DECIMAL(2,1),
  review_count INTEGER DEFAULT 0,
  category TEXT,
  place_id TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'pushed_to_ghl', 'not_interested')),
  notes TEXT,
  data_source TEXT DEFAULT 'google_maps',
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Lists table: groups of leads from a scrape
CREATE TABLE lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  search_query TEXT,
  search_location TEXT,
  trade_type TEXT,
  country TEXT,
  lead_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Junction table: a lead can belong to multiple lists
CREATE TABLE list_leads (
  list_id UUID REFERENCES lists(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (list_id, lead_id)
);

-- Scrape jobs: queued/running/completed scrape tasks
CREATE TABLE scrape_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  query TEXT NOT NULL,
  location TEXT NOT NULL,
  country TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  total_results_estimate INTEGER,
  results_scraped INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_leads_place_id ON leads(place_id);
CREATE INDEX idx_leads_country ON leads(country);
CREATE INDEX idx_leads_city ON leads(city);
CREATE INDEX idx_leads_category ON leads(category);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_scrape_jobs_status ON scrape_jobs(status);
CREATE INDEX idx_list_leads_list ON list_leads(list_id);
CREATE INDEX idx_list_leads_lead ON list_leads(lead_id);

-- ============================================
-- REALTIME
-- ============================================

ALTER PUBLICATION supabase_realtime ADD TABLE scrape_jobs;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update lead_count on lists when list_leads changes
CREATE OR REPLACE FUNCTION update_list_lead_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET lead_count = (
      SELECT COUNT(*) FROM list_leads WHERE list_id = NEW.list_id
    ), updated_at = NOW() WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists SET lead_count = (
      SELECT COUNT(*) FROM list_leads WHERE list_id = OLD.list_id
    ), updated_at = NOW() WHERE id = OLD.list_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_list_lead_count
AFTER INSERT OR DELETE ON list_leads
FOR EACH ROW EXECUTE FUNCTION update_list_lead_count();

-- Auto-update updated_at on leads
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_lists_updated_at
BEFORE UPDATE ON lists
FOR EACH ROW EXECUTE FUNCTION update_updated_at();
