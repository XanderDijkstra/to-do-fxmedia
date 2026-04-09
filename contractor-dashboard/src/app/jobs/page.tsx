"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RefreshCw,
  History,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { cn, formatDate } from "@/lib/utils";
import type { ScrapeJob } from "@/lib/types";

type FilterStatus = "all" | "pending" | "running" | "completed" | "failed";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  running: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  running: <RefreshCw className="h-3 w-3 animate-spin" />,
  completed: <CheckCircle className="h-3 w-3" />,
  failed: <XCircle className="h-3 w-3" />,
};

const FILTER_TABS: { label: string; value: FilterStatus }[] = [
  { label: "All", value: "all" },
  { label: "Pending", value: "pending" },
  { label: "Running", value: "running" },
  { label: "Completed", value: "completed" },
  { label: "Failed", value: "failed" },
];

function formatDuration(
  startedAt: string | null,
  completedAt: string | null
): string {
  if (!startedAt) return "\u2014";
  const start = new Date(startedAt).getTime();
  const end = completedAt ? new Date(completedAt).getTime() : Date.now();
  const diffMs = end - start;
  if (diffMs < 0) return "\u2014";
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function JobsPage() {
  const [jobs, setJobs] = useState<ScrapeJob[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterStatus>("all");
  const [rerunningId, setRerunningId] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  const fetchJobs = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);
      setError(null);
      const res = await fetch("/api/scrape/jobs");
      if (!res.ok) throw new Error("Failed to fetch jobs");
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchJobs(true);
  }, [fetchJobs]);

  // Auto-refresh polling when there are running jobs
  useEffect(() => {
    const hasRunningJobs = jobs.some(
      (j) => j.status === "running" || j.status === "pending"
    );

    if (hasRunningJobs) {
      pollingRef.current = setInterval(() => {
        fetchJobs(false);
      }, 10000);
    } else if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [jobs, fetchJobs]);

  const handleRerun = async (job: ScrapeJob) => {
    try {
      setRerunningId(job.id);
      const res = await fetch("/api/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: job.query,
          location: job.location,
          country: job.country || "NL",
          trade_type: job.query,
          list_name: `${job.query} - ${job.location} (re-run)`,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to re-run scrape");
      }

      await fetchJobs(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to re-run job");
    } finally {
      setRerunningId(null);
    }
  };

  const filteredJobs =
    filter === "all" ? jobs : jobs.filter((j) => j.status === filter);

  const getFilterCount = (status: FilterStatus) => {
    if (status === "all") return jobs.length;
    return jobs.filter((j) => j.status === status).length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Scrape History"
        description="View all past and current scrape jobs"
      />

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <XCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={cn(
              "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors",
              filter === tab.value
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-xs",
                filter === tab.value
                  ? "bg-primary/20 text-primary"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {getFilterCount(tab.value)}
            </span>
          </button>
        ))}
      </div>

      {/* Loading skeleton */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-16 w-full animate-pulse rounded-lg bg-muted"
            />
          ))}
        </div>
      ) : filteredJobs.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center rounded-lg border border-border py-16">
          <History className="mb-4 h-12 w-12 text-muted-foreground/40" />
          <h3 className="text-lg font-medium text-foreground">
            {filter === "all"
              ? "No scrape jobs yet"
              : `No ${filter} jobs`}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {filter === "all"
              ? "Start a new scrape to begin collecting leads."
              : `There are no jobs with status "${filter}" right now.`}
          </p>
          {filter === "all" && (
            <Link href="/scrape" className="mt-4">
              <Button>Start New Scrape</Button>
            </Link>
          )}
        </div>
      ) : (
        /* Jobs table */
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Query</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Results</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Completed</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="font-medium">{job.query}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.location}
                  </TableCell>
                  <TableCell>
                    <span className="text-sm">
                      {job.country === "NL"
                        ? "🇳🇱 NL"
                        : job.country === "BE"
                        ? "🇧🇪 BE"
                        : job.country || "\u2014"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "gap-1 capitalize",
                        STATUS_STYLES[job.status] || ""
                      )}
                    >
                      {STATUS_ICONS[job.status]}
                      {job.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {job.results_scraped}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.started_at ? formatDate(job.started_at) : "\u2014"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {job.completed_at
                      ? formatDate(job.completed_at)
                      : "\u2014"}
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground">
                    {formatDuration(job.started_at, job.completed_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      {job.list_id && (
                        <Link href={`/lists/${job.list_id}`}>
                          <Button variant="ghost" size="sm">
                            View List
                          </Button>
                        </Link>
                      )}
                      {job.status === "failed" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRerun(job)}
                          disabled={rerunningId === job.id}
                          className="gap-1"
                        >
                          <RefreshCw
                            className={cn(
                              "h-3 w-3",
                              rerunningId === job.id && "animate-spin"
                            )}
                          />
                          Re-run
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Running jobs indicator */}
      {jobs.some((j) => j.status === "running" || j.status === "pending") && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span>Auto-refreshing every 10 seconds while jobs are active</span>
        </div>
      )}
    </div>
  );
}
