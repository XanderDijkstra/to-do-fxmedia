import supabase from './supabase';

/**
 * Create a new list and return its id.
 */
export async function createList(data: {
  name: string;
  search_query: string;
  search_location: string;
  trade_type: string;
  country: string;
}): Promise<string> {
  const { data: row, error } = await supabase
    .from('lists')
    .insert({
      name: data.name,
      search_query: data.search_query,
      search_location: data.search_location,
      trade_type: data.trade_type,
      country: data.country,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`[lists] createList error: ${error.message}`);
  }

  return row.id as string;
}

/**
 * Fetch a single list by id.
 */
export async function getList(id: string): Promise<any> {
  const { data, error } = await supabase
    .from('lists')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    throw new Error(`[lists] getList error: ${error.message}`);
  }

  return data;
}

/**
 * Manually update the lead_count on a list.
 * The DB trigger normally handles this, but this serves as a backup/manual
 * reconciliation method.
 */
export async function updateListCount(id: string): Promise<void> {
  // Count rows in the junction table for this list
  const { count, error: countError } = await supabase
    .from('list_leads')
    .select('*', { count: 'exact', head: true })
    .eq('list_id', id);

  if (countError) {
    throw new Error(`[lists] updateListCount count error: ${countError.message}`);
  }

  const { error: updateError } = await supabase
    .from('lists')
    .update({ lead_count: count ?? 0 })
    .eq('id', id);

  if (updateError) {
    throw new Error(`[lists] updateListCount update error: ${updateError.message}`);
  }
}
