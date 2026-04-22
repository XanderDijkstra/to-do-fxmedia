export type ReportingSource = "ga4" | "gsc" | "meta";

export type PullStatus = "pending" | "running" | "success" | "failed";

export interface Client {
  id: string;
  name: string;
  slug: string;
  ga4_property_id: string | null;
  gsc_site_url: string | null;
  meta_ad_account_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MetricDaily {
  id: string;
  client_id: string;
  source: ReportingSource;
  date: string; // YYYY-MM-DD
  metric_name: string;
  metric_value: number | null;
  dimensions: Record<string, string | number>;
  pulled_at: string;
  created_at: string;
}

export interface PullLog {
  id: string;
  client_id: string;
  source: ReportingSource;
  status: PullStatus;
  rows_pulled: number;
  date_from: string | null;
  date_to: string | null;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
}

export interface ClientWithStatus extends Client {
  last_pull: {
    ga4: PullLog | null;
    gsc: PullLog | null;
    meta: PullLog | null;
  };
}
