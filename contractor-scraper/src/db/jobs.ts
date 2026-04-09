import supabase from './supabase';
import { ScrapeJob } from '../types';

/**
 * Select the oldest pending scrape job (FIFO).
 * Returns null when the queue is empty.
 */
export async function getPendingJob(): Promise<ScrapeJob | null> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(`[jobs] getPendingJob error: ${error.message}`);
    return null;
  }

  return data as ScrapeJob | null;
}

/**
 * Atomically claim a job by setting its status to 'running' only if it is
 * still 'pending'.  Returns true when the row was actually updated (i.e. we
 * won the race), false otherwise.
 */
export async function claimJob(jobId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'running',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .eq('status', 'pending')
    .select('id');

  if (error) {
    console.error(`[jobs] claimJob error: ${error.message}`);
    return false;
  }

  // If the update matched a row, data will contain one element
  return (data?.length ?? 0) > 0;
}

/**
 * Update the running total of results scraped so far.
 */
export async function updateJobProgress(
  jobId: string,
  resultsScraped: number,
): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({ results_scraped: resultsScraped })
    .eq('id', jobId);

  if (error) {
    console.error(`[jobs] updateJobProgress error: ${error.message}`);
  }
}

/**
 * Mark a job as completed.
 */
export async function completeJob(
  jobId: string,
  totalResults: number,
): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'completed',
      results_scraped: totalResults,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error(`[jobs] completeJob error: ${error.message}`);
  }
}

/**
 * Mark a job as failed and persist the error message.
 */
export async function failJob(
  jobId: string,
  errorMessage: string,
): Promise<void> {
  const { error } = await supabase
    .from('scrape_jobs')
    .update({
      status: 'failed',
      error_message: errorMessage,
      completed_at: new Date().toISOString(),
    })
    .eq('id', jobId);

  if (error) {
    console.error(`[jobs] failJob error: ${error.message}`);
  }
}
