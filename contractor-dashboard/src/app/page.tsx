"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Users,
  TrendingUp,
  Search,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn, formatDate, formatNumber } from "@/lib/utils";
import type { ScrapeJob } from "@/lib/types";

interface StatsData {
  totalLeads: number;
  leadsThisWeek: number;
  nlLeads: number;
  beLeads: number;
  leadsByTrade: { trade: string; count: number }[];
  recentJobs: ScrapeJob[];
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  running: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  completed: "bg-green-500/20 text-green-400 border-green-500/30",
  failed: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function DashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        setIsLoading(true);
        setError(null);
        const res = await fetch("/api/stats");
        if (!res.ok) {
          throw new Error("Failed to fetch stats");
        }
        const data = await res.json();
        setStats(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stats");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStats();
  }, []);

  const maxTradeCount =
    stats?.leadsByTrade?.length
      ? Math.max(...stats.leadsByTrade.map((t) => t.count))
      : 0;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Dashboard"
          description="Overview of your lead scraping activity"
        />
        <Link href="/scrape">
          <Button size="lg" className="gap-2">
            <Search className="h-4 w-4" />
            Start New Scrape
          </Button>
        </Link>
      </div>

      {/* Error state */}
      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertCircle className="h-5 w-5 text-red-400" />
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Leads
            </CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats?.totalLeads ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leads This Week
            </CardTitle>
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats?.leadsThisWeek ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              NL Leads
            </CardTitle>
            <span className="text-lg" role="img" aria-label="Netherlands flag">
              🇳🇱
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats?.nlLeads ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              BE Leads
            </CardTitle>
            <span className="text-lg" role="img" aria-label="Belgium flag">
              🇧🇪
            </span>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-9 w-24 animate-pulse rounded bg-muted" />
            ) : (
              <p className="text-3xl font-bold text-foreground">
                {formatNumber(stats?.beLeads ?? 0)}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Leads by Trade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-semibold">
            Leads by Trade
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-4 w-28 animate-pulse rounded bg-muted" />
                  <div className="h-6 flex-1 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-10 animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
          ) : stats?.leadsByTrade?.length ? (
            <div className="space-y-3">
              {stats.leadsByTrade.map((item) => {
                const widthPercent =
                  maxTradeCount > 0
                    ? Math.max((item.count / maxTradeCount) * 100, 2)
                    : 0;
                return (
                  <div key={item.trade} className="flex items-center gap-4">
                    <span className="w-36 shrink-0 truncate text-sm text-muted-foreground">
                      {item.trade}
                    </span>
                    <div className="flex-1">
                      <div
                        className="h-6 rounded bg-primary/80 transition-all duration-500"
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <span className="w-12 shrink-0 text-right text-sm font-medium text-foreground">
                      {formatNumber(item.count)}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No trade data yet. Start scraping to see results.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Scrape Jobs */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Recent Scrape Jobs
          </CardTitle>
          <Link href="/jobs">
            <Button variant="ghost" size="sm">
              View All
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 w-full animate-pulse rounded bg-muted"
                />
              ))}
            </div>
          ) : stats?.recentJobs?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Query</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Results</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.recentJobs.map((job) => (
                  <TableRow
                    key={job.id}
                    className={cn(
                      job.list_id && "cursor-pointer"
                    )}
                  >
                    <TableCell className="font-medium">
                      {job.list_id ? (
                        <Link
                          href={`/lists/${job.list_id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {job.query}
                        </Link>
                      ) : (
                        job.query
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {job.location}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "capitalize",
                          STATUS_STYLES[job.status] || ""
                        )}
                      >
                        {job.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatNumber(job.results_scraped)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(job.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Search className="mb-3 h-10 w-10 text-muted-foreground/50" />
              <p className="text-sm text-muted-foreground">
                No scrape jobs yet. Start your first scrape to get leads.
              </p>
              <Link href="/scrape" className="mt-4">
                <Button>Start New Scrape</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
