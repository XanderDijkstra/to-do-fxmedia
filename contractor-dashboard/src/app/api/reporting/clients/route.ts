import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: clients, error } = await supabase
      .from("clients")
      .select("*")
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch clients: ${error.message}` },
        { status: 500 }
      );
    }

    // Fetch latest pull per client per source
    const { data: latestPulls } = await supabase
      .from("pull_log")
      .select("*")
      .order("started_at", { ascending: false });

    const latestByClientSource = new Map<string, Record<string, unknown>>();
    (latestPulls || []).forEach((pull) => {
      const key = `${pull.client_id}:${pull.source}`;
      if (!latestByClientSource.has(key)) {
        latestByClientSource.set(key, pull);
      }
    });

    const clientsWithStatus = (clients || []).map((c) => ({
      ...c,
      last_pull: {
        ga4: latestByClientSource.get(`${c.id}:ga4`) || null,
        gsc: latestByClientSource.get(`${c.id}:gsc`) || null,
        meta: latestByClientSource.get(`${c.id}:meta`) || null,
      },
    }));

    return NextResponse.json({ clients: clientsWithStatus });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, ga4_property_id, gsc_site_url, meta_ad_account_id, notes } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: "name is required" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();
    const slug = slugify(name);

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        name: name.trim(),
        slug,
        ga4_property_id: ga4_property_id || null,
        gsc_site_url: gsc_site_url || null,
        meta_ad_account_id: meta_ad_account_id || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to create client: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ client }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
