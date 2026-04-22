import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: docs, error } = await supabase
      .from('docs')
      .select('*')
      .order('pinned', { ascending: false })
      .order('updated_at', { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch docs: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ docs: docs || [] });
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
    const { title, type, url, content, icon } = body;

    if (!title || !type) {
      return NextResponse.json(
        { error: 'title and type are required' },
        { status: 400 }
      );
    }

    if (type === 'link' && !url) {
      return NextResponse.json(
        { error: 'url is required for link type' },
        { status: 400 }
      );
    }

    const supabase = createServerClient();

    const { data: doc, error } = await supabase
      .from('docs')
      .insert({ title, type, url: url || null, content: content || null, icon: icon || null })
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to create doc: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ doc }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
