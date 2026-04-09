import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET() {
  try {
    const supabase = createServerClient();

    // Run all queries in parallel
    const [
      totalLeadsResult,
      weekLeadsResult,
      nlLeadsResult,
      beLeadsResult,
      tradeCountsResult,
      recentJobsResult,
    ] = await Promise.all([
      // Total leads
      supabase.from("leads").select("*", { count: "exact", head: true }),

      // Leads this week
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .gte(
          "created_at",
          new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000
          ).toISOString()
        ),

      // NL leads
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("country", "NL"),

      // BE leads
      supabase
        .from("leads")
        .select("*", { count: "exact", head: true })
        .eq("country", "BE"),

      // Leads by trade (category)
      supabase
        .from("leads")
        .select("category"),

      // Recent scrape jobs
      supabase
        .from("scrape_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    // Aggregate trade counts from raw data
    const tradeCounts: Record<string, number> = {};
    if (tradeCountsResult.data) {
      for (const row of tradeCountsResult.data) {
        const category = row.category || "Unknown";
        tradeCounts[category] = (tradeCounts[category] || 0) + 1;
      }
    }

    // Sort trades by count and take top 10
    const leadsByTrade = Object.entries(tradeCounts)
      .map(([trade, count]) => ({ trade, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return NextResponse.json({
      totalLeads: totalLeadsResult.count ?? 0,
      leadsThisWeek: weekLeadsResult.count ?? 0,
      nlLeads: nlLeadsResult.count ?? 0,
      beLeads: beLeadsResult.count ?? 0,
      leadsByTrade,
      recentJobs: recentJobsResult.data ?? [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
