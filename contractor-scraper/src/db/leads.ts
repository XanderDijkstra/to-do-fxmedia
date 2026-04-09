import supabase from './supabase';
import { ScrapedLead } from '../types';

/**
 * Insert a lead into the leads table, using upsert with place_id as the
 * conflict key so duplicate Google Maps entries are merged rather than
 * duplicated.  Returns the lead's id, or null on error.
 */
export async function insertLead(lead: ScrapedLead): Promise<string | null> {
  const { data, error } = await supabase
    .from('leads')
    .upsert(lead, { onConflict: 'place_id' })
    .select('id')
    .single();

  if (error) {
    console.error(`[leads] insertLead error: ${error.message}`);
    return null;
  }

  return data?.id ?? null;
}

/**
 * Returns true when a lead with the given place_id already exists.
 */
export async function checkDuplicate(placeId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('leads')
    .select('id')
    .eq('place_id', placeId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[leads] checkDuplicate error: ${error.message}`);
    return false;
  }

  return data !== null;
}

/**
 * Patch the email field on an existing lead row.
 */
export async function updateLeadEmail(
  leadId: string,
  email: string,
): Promise<void> {
  const { error } = await supabase
    .from('leads')
    .update({ email })
    .eq('id', leadId);

  if (error) {
    console.error(`[leads] updateLeadEmail error: ${error.message}`);
  }
}

/**
 * Return leads that have a website_url but no email yet.
 * When `listId` is provided, only return leads belonging to that list via the
 * list_leads junction table.
 */
export async function getLeadsWithoutEmail(
  listId?: string,
): Promise<Array<{ id: string; website_url: string }>> {
  if (listId) {
    // Join through the list_leads junction table
    const { data, error } = await supabase
      .from('list_leads')
      .select('lead_id, leads!inner(id, website_url, email)')
      .eq('list_id', listId);

    if (error) {
      console.error(`[leads] getLeadsWithoutEmail error: ${error.message}`);
      return [];
    }

    // data is an array of { lead_id, leads: { id, website_url, email } }
    // Filter in application code for clarity
    const results: Array<{ id: string; website_url: string }> = [];
    for (const row of data ?? []) {
      const lead = row.leads as unknown as {
        id: string;
        website_url: string | null;
        email: string | null;
      };
      if (lead && lead.website_url && !lead.email) {
        results.push({ id: lead.id, website_url: lead.website_url });
      }
    }
    return results;
  }

  // No list filter — get all leads missing an email that have a website
  const { data, error } = await supabase
    .from('leads')
    .select('id, website_url')
    .not('website_url', 'is', null)
    .is('email', null);

  if (error) {
    console.error(`[leads] getLeadsWithoutEmail error: ${error.message}`);
    return [];
  }

  return (data ?? []).map((row) => ({
    id: row.id as string,
    website_url: row.website_url as string,
  }));
}

/**
 * Link a lead to a list through the list_leads junction table.
 */
export async function insertLeadToList(
  listId: string,
  leadId: string,
): Promise<void> {
  const { error } = await supabase
    .from('list_leads')
    .upsert({ list_id: listId, lead_id: leadId }, {
      onConflict: 'list_id,lead_id',
    });

  if (error) {
    console.error(`[leads] insertLeadToList error: ${error.message}`);
  }
}
