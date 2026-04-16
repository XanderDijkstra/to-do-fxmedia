import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const AUTO_DELETE_STATUSES = ['converted'];

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { status, notes } = body;

    if (!status && notes === undefined) {
      return NextResponse.json(
        { error: 'At least one field (status or notes) must be provided' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // If status is a "done" status, delete the lead instead of updating
    if (status && AUTO_DELETE_STATUSES.includes(status)) {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) {
        return NextResponse.json(
          { error: `Failed to delete lead: ${error.message}` },
          { status: 500 }
        );
      }

      return NextResponse.json({ deleted: true, id });
    }

    const updateData: Record<string, unknown> = {};
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;

    const { data: lead, error } = await supabase
      .from('leads')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to update lead: ${error.message}` },
        { status: 500 }
      );
    }

    if (!lead) {
      return NextResponse.json(
        { error: 'Lead not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lead });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
