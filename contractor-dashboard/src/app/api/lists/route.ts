import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: lists, error } = await supabase
      .from('lists')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch lists: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ lists });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, search_query, search_location, trade_type, country } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const insertData: Record<string, unknown> = { name };
    if (description !== undefined) insertData.description = description;
    if (search_query !== undefined) insertData.search_query = search_query;
    if (search_location !== undefined) insertData.search_location = search_location;
    if (trade_type !== undefined) insertData.trade_type = trade_type;
    if (country !== undefined) insertData.country = country;

    const { data: newList, error } = await supabase
      .from('lists')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to create list: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ list: newList }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
