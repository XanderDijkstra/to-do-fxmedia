"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Search, Loader2, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/layout/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SimpleSelect } from "@/components/ui/select";
import { TRADE_TYPES } from "@/lib/constants";
import type { ScrapeJob } from "@/lib/types";
import { cn, formatNumber } from "@/lib/utils";

type CountrySelection = "NL" | "BE" | "BOTH";

export default function ScrapePage() {
  // Form state
  const [tradeType, setTradeType] = useState("");
  const [customTrade, setCustomTrade] = useState("");
  const [location, setLocation] = useState("");
  const [country, setCountry] = useState<CountrySelection>("NL");
  const [listName, setListName] = useState("");
  const [listNameManuallyEdited, setListNameManuallyEdited] = useState(false);

  // Submit / progress state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<ScrapeJob | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Build trade options for the select
  const tradeOptions = [
    ...TRADE_TYPES.map((t) => ({ value: t, label: t })),
    { value: "__custom__", label: "Custom" },
  ];

  // Derive the effective trade value
  const effectiveTrade = tradeType === "__custom__" ? customTrade : tradeType;

  // Auto-generate list name when trade or location changes (unless manually edited)
  useEffect(() => {
    if (!listNameManuallyEdited && (effectiveTrade || location)) {
      const parts = [effectiveTrade, location].filter(Boolean);
      setListName(parts.join(" \u2014 "));
    }
  }, [effectiveTrade, location, listNameManuallyEdited]);

  // Polling for job status — uses the jobs list endpoint and finds our job
  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/scrape/jobs?limit=10`);
        if (!res.ok) return;
        const data = await res.json();
        const jobs: ScrapeJob[] = data.jobs || [];
        const found = jobs.find((j) => j.id === jobId);
        if (!found) return;

        setJob(found);

        if (found.status === "completed" || found.status === "failed") {
          if (pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }
      } catch {
        // Silently fail on poll errors — will retry
      }
    },
    []
  );

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!effectiveTrade.trim()) {
      setError("Please select or enter a trade type.");
      return;
    }
    if (!location.trim()) {
      setError("Please enter a location.");
      return;
    }

    setIsSubmitting(true);

    try {
      const trimmedTrade = effectiveTrade.trim();
      const trimmedLocation = location.trim();
      const finalListName = listName.trim() || `${trimmedTrade} \u2014 ${trimmedLocation}`;
      const countryValue = country === "BOTH" ? "NL,BE" : country;

      const res = await fetch("/api/scrape/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: `${trimmedTrade} ${trimmedLocation}`,
          location: trimmedLocation,
          country: countryValue,
          trade_type: trimmedTrade,
          list_name: finalListName,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || `Request failed (${res.status})`);
      }

      const data = await res.json();
      const scrapeJob: ScrapeJob = data.job;
      // Store list_id from the response if the job doesn't have it yet
      if (!scrapeJob.list_id && data.list?.id) {
        scrapeJob.list_id = data.list.id;
      }
      setJob(scrapeJob);

      // Start polling every 3 seconds
      pollingRef.current = setInterval(() => {
        pollJobStatus(scrapeJob.id);
      }, 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusIcon = () => {
    if (!job) return null;
    switch (job.status) {
      case "pending":
        return <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />;
      case "running":
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-400" />;
      case "failed":
        return <AlertCircle className="h-5 w-5 text-red-400" />;
    }
  };

  const statusText = () => {
    if (!job) return "";
    switch (job.status) {
      case "pending":
        return "Waiting for scraper to pick up...";
      case "running":
        return "Running...";
      case "completed":
        return "Completed";
      case "failed":
        return `Failed: ${job.error_message || "Unknown error"}`;
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="New Scrape"
        description="Start a new Google Maps scrape for contractor leads"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Scrape Configuration</CardTitle>
          <CardDescription>
            Choose the trade type, location, and country to scrape.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Trade Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Trade Type
              </label>
              <SimpleSelect
                options={tradeOptions}
                value={tradeType}
                onChange={(val) => {
                  setTradeType(val);
                  if (val !== "__custom__") setCustomTrade("");
                }}
                placeholder="Select a trade type..."
              />
            </div>

            {/* Custom Trade (only when "Custom" is selected) */}
            {tradeType === "__custom__" && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Custom Trade
                </label>
                <Input
                  value={customTrade}
                  onChange={(e) => setCustomTrade(e.target.value)}
                  placeholder="Enter custom trade type..."
                />
              </div>
            )}

            {/* Location */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Location
              </label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g., Amsterdam, Rotterdam, Antwerpen"
              />
            </div>

            {/* Country Toggle */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Country
              </label>
              <div className="flex gap-2">
                {(["NL", "BE", "BOTH"] as const).map((opt) => (
                  <Button
                    key={opt}
                    type="button"
                    variant={country === opt ? "default" : "outline"}
                    className={cn(
                      "flex-1",
                      country === opt && "shadow-md"
                    )}
                    onClick={() => setCountry(opt)}
                  >
                    {opt === "NL"
                      ? "\ud83c\uddf3\ud83c\uddf1 NL"
                      : opt === "BE"
                      ? "\ud83c\udde7\ud83c\uddea BE"
                      : "Both"}
                  </Button>
                ))}
              </div>
            </div>

            {/* List Name */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                List Name
              </label>
              <Input
                value={listName}
                onChange={(e) => {
                  setListName(e.target.value);
                  setListNameManuallyEdited(true);
                }}
                placeholder="Auto-generated from trade and location"
              />
              {listNameManuallyEdited && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground hover:text-foreground underline"
                  onClick={() => {
                    setListNameManuallyEdited(false);
                    const parts = [effectiveTrade, location].filter(Boolean);
                    setListName(parts.join(" \u2014 "));
                  }}
                >
                  Reset to auto-generated name
                </button>
              )}
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !!job}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Start Scraping
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Progress Section */}
      {job && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-lg">
              {statusIcon()}
              Scrape Progress
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Status */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-4">
              <span className="text-sm text-muted-foreground">Status</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  job.status === "completed" && "text-green-400",
                  job.status === "failed" && "text-red-400",
                  job.status === "running" && "text-primary",
                  job.status === "pending" && "text-yellow-400"
                )}
              >
                {statusText()}
              </span>
            </div>

            {/* Leads found */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 p-4">
              <span className="text-sm text-muted-foreground">Leads Found</span>
              <span className="text-sm font-medium text-foreground">
                {formatNumber(job.leads_found)} leads found so far...
              </span>
            </div>

            {/* Completed summary */}
            {job.status === "completed" && job.list_id && (
              <div className="rounded-md border border-green-500/30 bg-green-500/10 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-green-400">
                      Scrape Completed!
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatNumber(job.leads_found)} leads have been added to
                      your list.
                    </p>
                  </div>
                  <Link href={`/lists/${job.list_id}`}>
                    <Button variant="outline" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                      View List
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Failed state */}
            {job.status === "failed" && (
              <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4">
                <p className="font-medium text-red-400">Scrape Failed</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {job.error_message || "An unknown error occurred."}
                </p>
                <Button
                  variant="outline"
                  className="mt-3 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  onClick={() => {
                    setJob(null);
                    setIsSubmitting(false);
                    setError(null);
                  }}
                >
                  Try Again
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
