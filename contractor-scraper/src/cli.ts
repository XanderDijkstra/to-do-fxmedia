import 'dotenv/config';
import { Command } from 'commander';
import * as fs from 'fs';
import * as path from 'path';
import GoogleMapsScraper from './scraper/google-maps-scraper';
import { insertLead, insertLeadToList, getLeadsWithoutEmail, updateLeadEmail } from './db/leads';
import { createList } from './db/lists';
import { enrichLeadsWithEmails } from './scraper/email-extractor';
import logger from './utils/logger';

const program = new Command();

program
  .name('contractor-scraper')
  .description('Google Maps scraper for contractor / trade business leads')
  .version('1.0.0');

// ── Default command: scrape ─────────────────────────────────────────────
program
  .command('scrape', { isDefault: true })
  .description('Scrape Google Maps for contractor leads')
  .requiredOption('--trade <trade>', 'Trade / search query (e.g. "loodgieter")')
  .requiredOption('--location <location>', 'Location (e.g. "Amsterdam")')
  .option('--country <country>', 'Country code', 'NL')
  .option('--headed', 'Run browser in headed (visible) mode', false)
  .option('--list-name <name>', 'Name for the list (defaults to "{trade} — {location}")')
  .action(async (opts) => {
    const trade: string = opts.trade;
    const location: string = opts.location;
    const country: string = opts.country;
    const headed: boolean = opts.headed;
    const listName: string = opts.listName || `${trade} — ${location}`;

    logger.info(`Scraping "${trade}" in "${location}" (${country})`);

    // Override HEADLESS env if --headed flag is set
    if (headed) {
      process.env.HEADLESS = 'false';
    }

    let scraper: GoogleMapsScraper | null = null;

    try {
      // Create a list in Supabase
      const listId = await createList({
        name: listName,
        search_query: trade,
        search_location: location,
        trade_type: trade,
        country,
      });
      logger.info(`Created list: ${listId} ("${listName}")`);

      // Initialise scraper
      scraper = new GoogleMapsScraper();
      await scraper.initialize();

      // Run the scrape
      const leads = await scraper.scrape({ trade, location, country });

      // Insert leads and link to list
      let insertedCount = 0;
      for (const lead of leads) {
        const leadId = await insertLead(lead);
        if (leadId) {
          insertedCount++;
          await insertLeadToList(listId, leadId);
        }
      }

      logger.success(`Scraped ${insertedCount} leads for "${trade}" in "${location}"`);
    } catch (error) {
      logger.error(
        `Scrape failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    } finally {
      if (scraper) {
        await scraper.close();
      }
    }
  });

// ── Batch subcommand ────────────────────────────────────────────────────
program
  .command('batch')
  .description('Run multiple scrape jobs from a JSON file')
  .requiredOption('--file <path>', 'Path to JSON file with array of { trade, location, country }')
  .action(async (opts) => {
    const filePath = path.resolve(opts.file);

    if (!fs.existsSync(filePath)) {
      logger.error(`File not found: ${filePath}`);
      process.exitCode = 1;
      return;
    }

    let entries: Array<{ trade: string; location: string; country?: string }>;
    try {
      const raw = fs.readFileSync(filePath, 'utf-8');
      entries = JSON.parse(raw);
    } catch (error) {
      logger.error(
        `Failed to parse JSON file: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
      return;
    }

    if (!Array.isArray(entries) || entries.length === 0) {
      logger.error('JSON file must contain a non-empty array of entries.');
      process.exitCode = 1;
      return;
    }

    logger.info(`Batch scrape: ${entries.length} entries loaded from ${filePath}`);

    for (let idx = 0; idx < entries.length; idx++) {
      const entry = entries[idx];
      const trade = entry.trade;
      const location = entry.location;
      const country = entry.country || 'NL';
      const listName = `${trade} — ${location}`;

      logger.info(
        `[${idx + 1}/${entries.length}] Scraping "${trade}" in "${location}" (${country})`,
      );

      let scraper: GoogleMapsScraper | null = null;
      try {
        const listId = await createList({
          name: listName,
          search_query: trade,
          search_location: location,
          trade_type: trade,
          country,
        });

        scraper = new GoogleMapsScraper();
        await scraper.initialize();

        const leads = await scraper.scrape({ trade, location, country });

        let insertedCount = 0;
        for (const lead of leads) {
          const leadId = await insertLead(lead);
          if (leadId) {
            insertedCount++;
            await insertLeadToList(listId, leadId);
          }
        }

        logger.success(
          `[${idx + 1}/${entries.length}] Scraped ${insertedCount} leads for "${trade}" in "${location}"`,
        );
      } catch (error) {
        logger.error(
          `[${idx + 1}/${entries.length}] Failed: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } finally {
        if (scraper) {
          await scraper.close();
        }
      }
    }

    logger.info('Batch scrape finished.');
  });

// ── Emails subcommand ───────────────────────────────────────────────────
program
  .command('emails')
  .description('Extract emails from lead websites')
  .option('--list-id <id>', 'Only enrich leads in this list')
  .action(async (opts) => {
    const listId: string | undefined = opts.listId;

    logger.info(
      listId
        ? `Extracting emails for leads in list ${listId}...`
        : 'Extracting emails for all leads without an email...',
    );

    try {
      const leads = await getLeadsWithoutEmail(listId);

      if (leads.length === 0) {
        logger.info('No leads found that need email extraction.');
        return;
      }

      logger.info(`Found ${leads.length} leads to process.`);

      const found = await enrichLeadsWithEmails(leads, async (leadId, email) => {
        await updateLeadEmail(leadId, email);
      });

      logger.success(`Email extraction complete: ${found} emails found out of ${leads.length} leads.`);
    } catch (error) {
      logger.error(
        `Email extraction failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      process.exitCode = 1;
    }
  });

program.parse(process.argv);
