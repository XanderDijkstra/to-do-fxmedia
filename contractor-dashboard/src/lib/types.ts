export interface Lead {
  id: string;
  list_id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  rating: number | null;
  reviews_count: number | null;
  google_maps_url: string | null;
  status: string;
  trade: string | null;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeJob {
  id: string;
  list_id: string | null;
  query: string;
  location: string;
  country: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  leads_found: number;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ListRecord {
  id: string;
  name: string;
  trade_type?: string;
  search_query?: string;
  search_location?: string;
  country?: string;
  lead_count?: number;
  leads_count?: number;
  description?: string;
  created_at: string;
  updated_at: string;
}
