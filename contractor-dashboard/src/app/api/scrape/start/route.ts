import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, location, country, trade_type, list_name } = body;

    if (!query || !location || !country || !trade_type || !list_name) {
      return NextResponse.json(
        { error: 'Missing required fields: query, location, country, trade_type, list_name' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    // Create a new list
    const { data: newList, error: listError } = await supabase
      .from('lists')
      .insert({
        name: list_name,
        search_query: query,
        search_location: location,
        trade_type,
        country,
      })
      .select()
      .single();

    if (listError) {
      return NextResponse.json(
        { error: `Failed to create list: ${listError.message}` },
        { status: 500 }
      );
    }

    // Create a new scrape job linked to the list
    const { data: scrapeJob, error: jobError } = await supabase
      .from('scrape_jobs')
      .insert({
        query,
        location,
        country,
        status: 'pending',
        list_id: newList.id,
      })
      .select()
      .single();

    if (jobError) {
      return NextResponse.json(
        { error: `Failed to create scrape job: ${jobError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ job: scrapeJob, list: newList }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
