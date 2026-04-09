export interface Lead {
  id: string;
  business_name: string;
  phone_number: string | null;
  email: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string;
  rating: number | null;
  review_count: number | null;
  category: string | null;
  place_id: string | null;
  status: string;
  notes: string | null;
  data_source: string;
  scraped_at: string;
  created_at: string;
  updated_at: string;
}

export interface ScrapedLead {
  business_name: string;
  phone_number: string | null;
  email: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  province: string | null;
  country: string;
  rating: number | null;
  review_count: number | null;
  category: string | null;
  place_id: string | null;
  data_source: string;
  scraped_at: string;
}

export interface ScrapeJob {
  id: string;
  list_id: string;
  query: string;
  location: string;
  country: string;
  status: string;
  total_results_estimate: number | null;
  results_scraped: number;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
}

export interface ListRecord {
  id: string;
  name: string;
  description: string | null;
  search_query: string | null;
  search_location: string | null;
  trade_type: string | null;
  country: string;
  lead_count: number;
  created_at: string;
  updated_at: string;
}

export interface ScrapeOptions {
  trade: string;
  location: string;
  country: string;
  headed?: boolean;
  listName?: string;
}

export interface BrowserConfig {
  headless: boolean;
  language: string;
  viewport: {
    width: number;
    height: number;
  };
}
