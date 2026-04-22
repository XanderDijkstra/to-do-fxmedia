import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    // Allow lookup by id OR slug
    const column = params.id.includes("-") && params.id.length === 36 ? "id" : "slug";

    const { data: client, error } = await supabase
      .from("clients")
      .select("*")
      .eq(column, params.id)
      .single();

    if (error || !client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name, ga4_property_id, gsc_site_url, meta_ad_account_id, notes, active } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (ga4_property_id !== undefined) updateData.ga4_property_id = ga4_property_id;
    if (gsc_site_url !== undefined) updateData.gsc_site_url = gsc_site_url;
    if (meta_ad_account_id !== undefined) updateData.meta_ad_account_id = meta_ad_account_id;
    if (notes !== undefined) updateData.notes = notes;
    if (active !== undefined) updateData.active = active;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "At least one field must be provided" },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: client, error } = await supabase
      .from("clients")
      .update(updateData)
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update client: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createServerClient();

    const { error } = await supabase
      .from("clients")
      .delete()
      .eq("id", params.id);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete client: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 }
    );
  }
}
