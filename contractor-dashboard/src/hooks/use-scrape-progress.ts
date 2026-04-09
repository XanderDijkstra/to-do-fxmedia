"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { ScrapeJob } from "@/lib/types";

interface UseScrapeProgressReturn {
  job: ScrapeJob | null;
  isLoading: boolean;
  isComplete: boolean;
  error: string | null;
}

export function useScrapeProgress(
  jobId: string | null
): UseScrapeProgressReturn {
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const isComplete =
    job?.status === "completed" || job?.status === "failed";

  const fetchJobStatus = useCallback(async () => {
    if (!jobId) return;

    try {
      const res = await fetch("/api/scrape/jobs?status=all");
      if (!res.ok) {
        throw new Error("Failed to fetch job status");
      }
      const data = await res.json();
      const jobs: ScrapeJob[] = data.jobs || [];
      const found = jobs.find((j) => j.id === jobId);
      if (found) {
        setJob(found);
      } else {
        setError("Job not found");
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch job status"
      );
    }
  }, [jobId]);

  useEffect(() => {
    if (!jobId) {
      setJob(null);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    // Initial fetch
    fetchJobStatus().finally(() => setIsLoading(false));

    // Start polling
    intervalRef.current = setInterval(() => {
      fetchJobStatus();
    }, 3000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobId, fetchJobStatus]);

  // Stop polling when complete
  useEffect(() => {
    if (isComplete && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, [isComplete]);

  return { job, isLoading, isComplete, error };
}
