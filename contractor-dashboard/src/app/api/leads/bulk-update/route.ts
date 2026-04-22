import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const AUTO_DELETE_STATUSES = ['converted'];

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { lead_ids, status } = body;

    if (!Array.isArray(lead_ids) || lead_ids.length === 0 || !status) {
      return NextResponse.json(
        { error: 'lead_ids (array) and status are required' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // If status is a "done" status, delete the leads instead of updating
    if (AUTO_DELETE_STATUSES.includes(status)) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .in('id', lead_ids);

      if (error) {
        return NextResponse.json(
          { error: `Failed to delete leads: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ deleted: true, count: lead_ids.length });
    }

    const { error } = await supabase
      .from('leads')
      .update({ status })
      .in('id', lead_ids);

    if (error) {
      return NextResponse.json(
        { error: `Failed to update leads: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ updated: true, count: lead_ids.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
