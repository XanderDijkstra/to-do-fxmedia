"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead } from "@/lib/types";

interface UseLeadsFilters {
  list_id?: string;
  status?: string;
  search?: string;
  has_phone?: boolean;
  has_email?: boolean;
  page?: number;
  per_page?: number;
}

interface UseLeadsReturn {
  leads: Lead[];
  total: number;
  isLoading: boolean;
  refetch: () => void;
}

export function useLeads(filters: UseLeadsFilters = {}): UseLeadsReturn {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const {
    list_id,
    status,
    search,
    has_phone,
    has_email,
    page = 1,
    per_page = 50,
  } = filters;

  const fetchLeads = useCallback(async () => {
    try {
      setIsLoading(true);

      const params = new URLSearchParams();
      if (list_id) params.set("list_id", list_id);
      if (status) params.set("status", status);
      if (search) params.set("search", search);
      if (has_phone) params.set("has_phone", "true");
      if (has_email) params.set("has_email", "true");
      params.set("page", String(page));
      params.set("per_page", String(per_page));

      const res = await fetch(`/api/leads?${params.toString()}`);
      if (!res.ok) {
        throw new Error("Failed to fetch leads");
      }

      const data = await res.json();
      setLeads(data.leads || []);
      setTotal(data.total ?? 0);
    } catch (err) {
      console.error("useLeads error:", err);
      setLeads([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, [list_id, status, search, has_phone, has_email, page, per_page]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  return { leads, total, isLoading, refetch: fetchLeads };
}
