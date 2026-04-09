import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

interface ExportFilters {
  status?: string;
  city?: string;
  country?: string;
  has_phone?: boolean;
  has_email?: boolean;
  has_website?: boolean;
  search?: string;
}

function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { list_id, lead_ids, filters } = body as {
      list_id?: string;
      lead_ids?: string[];
      filters?: ExportFilters;
    };

    const supabase = createServerClient();

    let leads: Record<string, unknown>[] = [];

    if (lead_ids && lead_ids.length > 0) {
      // Fetch specific leads by IDs
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .in('id', lead_ids);

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch leads: ${error.message}` },
          { status: 500 }
        );
      }
      leads = data || [];
    } else if (list_id) {
      // Fetch leads for a specific list
      const { data, error } = await supabase
        .from('list_leads')
        .select('leads(*)')
        .eq('list_id', list_id);

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch leads for list: ${error.message}` },
          { status: 500 }
        );
      }
      leads = (data || []).map((row: Record<string, unknown>) => row.leads as Record<string, unknown>).filter(Boolean);
    } else if (filters) {
      // Fetch leads with filters
      let query = supabase.from('leads').select('*');

      if (filters.status) {
        query = query.eq('status', filters.status);
      }
      if (filters.city) {
        query = query.ilike('city', `%${filters.city}%`);
      }
      if (filters.country) {
        query = query.eq('country', filters.country);
      }
      if (filters.has_phone) {
        query = query.not('phone', 'is', null);
      }
      if (filters.has_email) {
        query = query.not('email', 'is', null);
      }
      if (filters.has_website) {
        query = query.not('website', 'is', null);
      }
      if (filters.search) {
        query = query.or(
          `business_name.ilike.%${filters.search}%,city.ilike.%${filters.search}%,address.ilike.%${filters.search}%`
        );
      }

      const { data, error } = await query;

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch leads: ${error.message}` },
          { status: 500 }
        );
      }
      leads = data || [];
    } else {
      // No filters — export all leads
      const { data, error } = await supabase.from('leads').select('*');

      if (error) {
        return NextResponse.json(
          { error: `Failed to fetch leads: ${error.message}` },
          { status: 500 }
        );
      }
      leads = data || [];
    }

    // Build CSV
    const headers = [
      'Business Name',
      'Phone',
      'Email',
      'Website',
      'Address',
      'City',
      'Postal Code',
      'Province',
      'Country',
      'Rating',
      'Reviews',
      'Category',
      'Status',
      'Google Maps URL',
    ];

    const csvRows = [headers.join(',')];

    for (const lead of leads) {
      const row = [
        escapeCsvField(lead.business_name),
        escapeCsvField(lead.phone),
        escapeCsvField(lead.email),
        escapeCsvField(lead.website),
        escapeCsvField(lead.address),
        escapeCsvField(lead.city),
        escapeCsvField(lead.postal_code),
        escapeCsvField(lead.province),
        escapeCsvField(lead.country),
        escapeCsvField(lead.rating),
        escapeCsvField(lead.reviews),
        escapeCsvField(lead.category),
        escapeCsvField(lead.status),
        escapeCsvField(lead.google_maps_url),
      ];
      csvRows.push(row.join(','));
    }

    const csv = csvRows.join('\n');

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="leads-export.csv"',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
