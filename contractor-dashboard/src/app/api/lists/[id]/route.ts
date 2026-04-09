import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServerClient();

    // Fetch the list
    const { data: list, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', id)
      .single();

    if (listError) {
      if (listError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'List not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to fetch list: ${listError.message}` },
        { status: 500 }
      );
    }

    // Get lead count for this list
    const { count, error: countError } = await supabase
      .from('list_leads')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id);

    if (countError) {
      return NextResponse.json(
        { error: `Failed to count leads: ${countError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      list: {
        ...list,
        lead_count: count ?? 0,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, description } = body;

    if (name === undefined && description === undefined) {
      return NextResponse.json(
        { error: 'At least one field (name or description) must be provided' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data: list, error } = await supabase
      .from('lists')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'List not found' },
          { status: 404 }
        );
      }
      return NextResponse.json(
        { error: `Failed to update list: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ list });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const supabase = createServerClient();

    // Delete the list (cascade should handle list_leads)
    const { error } = await supabase
      .from('lists')
      .delete()
      .eq('id', id);

    if (error) {
      return NextResponse.json(
        { error: `Failed to delete list: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
