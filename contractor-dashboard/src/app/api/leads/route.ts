import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const list_id = searchParams.get('list_id');
    const status = searchParams.get('status');
    const city = searchParams.get('city');
    const country = searchParams.get('country');
    const has_phone = searchParams.get('has_phone');
    const has_email = searchParams.get('has_email');
    const has_website = searchParams.get('has_website');
    const search = searchParams.get('search');
    const sort_by = searchParams.get('sort_by') || 'created_at';
    const sort_order = searchParams.get('sort_order') || 'desc';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const per_page = parseInt(searchParams.get('per_page') || '50', 10);

    const supabase = createServerClient();

    const from = (page - 1) * per_page;
    const to = from + per_page - 1;

    // Build the query depending on whether we filter by list_id
    let query;
    let countQuery;

    if (list_id) {
      // Join through list_leads to get leads belonging to a specific list
      query = supabase
        .from('list_leads')
        .select('lead_id, leads(*)', { count: 'exact' })
        .eq('list_id', list_id);

      countQuery = supabase
        .from('list_leads')
        .select('*', { count: 'exact', head: true })
        .eq('list_id', list_id);
    } else {
      query = supabase
        .from('leads')
        .select('*', { count: 'exact' });

      countQuery = supabase
        .from('leads')
        .select('*', { count: 'exact', head: true });
    }

    // Apply filters — when using list_leads join, filter on the nested leads columns
    const prefix = list_id ? 'leads.' : '';

    if (status) {
      query = query.eq(`${prefix}status`, status);
      countQuery = countQuery.eq(`${prefix}status`, status);
    }

    if (city) {
      query = query.ilike(`${prefix}city`, `%${city}%`);
      countQuery = countQuery.ilike(`${prefix}city`, `%${city}%`);
    }

    if (country) {
      query = query.eq(`${prefix}country`, country);
      countQuery = countQuery.eq(`${prefix}country`, country);
    }

    if (has_phone === 'true') {
      query = query.not(`${prefix}phone`, 'is', null);
      countQuery = countQuery.not(`${prefix}phone`, 'is', null);
    }

    if (has_email === 'true') {
      query = query.not(`${prefix}email`, 'is', null);
      countQuery = countQuery.not(`${prefix}email`, 'is', null);
    }

    if (has_website === 'true') {
      query = query.not(`${prefix}website`, 'is', null);
      countQuery = countQuery.not(`${prefix}website`, 'is', null);
    }

    if (search) {
      const searchFilter = `${prefix}business_name.ilike.%${search}%,${prefix}city.ilike.%${search}%,${prefix}address.ilike.%${search}%`;
      query = query.or(searchFilter);
      countQuery = countQuery.or(searchFilter);
    }

    // Apply sorting
    const ascending = sort_order === 'asc';
    if (list_id) {
      query = query.order(`${sort_by}`, { ascending, referencedTable: 'leads' });
    } else {
      query = query.order(sort_by, { ascending });
    }

    // Apply pagination
    query = query.range(from, to);

    const [{ data, error, count }, { count: totalCount }] = await Promise.all([
      query,
      countQuery,
    ]);

    if (error) {
      return NextResponse.json(
        { error: `Failed to fetch leads: ${error.message}` },
        { status: 500 }
      );
    }

    // If querying through list_leads, extract the nested leads objects
    let leads;
    if (list_id) {
      leads = (data || []).map((row: Record<string, unknown>) => row.leads).filter(Boolean);
    } else {
      leads = data || [];
    }

    const total = count ?? totalCount ?? 0;

    return NextResponse.json({
      leads,
      total,
      page,
      per_page,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
