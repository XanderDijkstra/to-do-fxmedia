import 'dotenv/config';
import {
  getPendingJob,
  claimJob,
  updateJobProgress,
  completeJob,
  failJob,
} from './db/jobs';
import {
  insertLead,
  insertLeadToList,
  getLeadsWithoutEmail,
  updateLeadEmail,
} from './db/leads';
import GoogleMapsScraper from './scraper/google-maps-scraper';
import { enrichLeadsWithEmails } from './scraper/email-extractor';
import logger from './utils/logger';
import { JOB_POLL_INTERVAL } from './utils/constants';

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main(): Promise<void> {
  logger.info('Contractor Lead Scraper — Job Poller started');

  let lastNoJobLog = 0;

  while (true) {
    try {
      const job = await getPendingJob();

      if (!job) {
        const now = Date.now();
        // Only log "no pending jobs" every 60 seconds, not every poll cycle
        if (now - lastNoJobLog >= 60_000) {
          logger.info('No pending jobs, waiting...');
          lastNoJobLog = now;
        }
        await sleep(JOB_POLL_INTERVAL);
        continue;
      }

      // Reset so the next idle stretch logs immediately
      lastNoJobLog = 0;

      // Attempt to claim the job (optimistic lock)
      const claimed = await claimJob(job.id);
      if (!claimed) {
        logger.warn(
          `Job ${job.id} was already claimed by another worker, skipping.`,
        );
        continue;
      }

      logger.info(`Starting scrape job: "${job.query}" in "${job.location}"`);

      let scraper: GoogleMapsScraper | null = null;

      try {
        scraper = new GoogleMapsScraper();
        await scraper.initialize();

        const leads = await scraper.scrape({
          trade: job.query,
          location: job.location,
          country: job.country,
        });

        let insertedCount = 0;

        for (let i = 0; i < leads.length; i++) {
          const lead = leads[i];
          const leadId = await insertLead(lead);

          if (leadId) {
            insertedCount++;

            if (job.list_id) {
              await insertLeadToList(job.list_id, leadId);
            }
          }

          // Report progress every 10 leads
          if ((i + 1) % 10 === 0 || i === leads.length - 1) {
            await updateJobProgress(job.id, insertedCount);
          }
        }

        await completeJob(job.id, insertedCount);

        logger.success(
          `Job ${job.id} completed: ${insertedCount} leads scraped for "${job.query}" in "${job.location}"`,
        );

        // Email extraction pass for leads in this list
        if (job.list_id) {
          logger.info(
            `Starting email extraction for list ${job.list_id}...`,
          );
          const leadsWithoutEmail = await getLeadsWithoutEmail(job.list_id);
          if (leadsWithoutEmail.length > 0) {
            const emailCount = await enrichLeadsWithEmails(
              leadsWithoutEmail,
              async (leadId, email) => {
                await updateLeadEmail(leadId, email);
              },
            );
            logger.success(
              `Email extraction complete: ${emailCount} emails found for ${leadsWithoutEmail.length} leads.`,
            );
          } else {
            logger.info('No leads without email found for this list.');
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : String(error);
        logger.error(`Job ${job.id} failed: ${message}`);
        await failJob(job.id, message);
      } finally {
        if (scraper) {
          await scraper.close();
        }
      }
    } catch (error) {
      // Top-level safety net so the poller never dies
      logger.error(
        `Unexpected poller error: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    await sleep(JOB_POLL_INTERVAL);
  }
}

main().catch((err) => {
  logger.error(`Fatal error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
