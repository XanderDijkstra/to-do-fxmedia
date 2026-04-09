import { Browser, Page } from 'playwright';
import { launchBrowser, closeBrowser } from '../browser/launch';
import { handleCookieConsent } from '../browser/cookie-consent';
import { checkForCaptcha } from '../browser/captcha-detector';
import { scrollToLoadAllResults } from './scroll-loader';
import { extractAllListingDetails } from './detail-extractor';
import { parseAddress } from './address-parser';
import { humanDelay } from '../utils/delays';
import logger from '../utils/logger';
import { ScrapedLead, ScrapeOptions } from '../types';

/**
 * Main orchestrator class for scraping Google Maps contractor listings.
 *
 * Usage:
 *   const scraper = new GoogleMapsScraper();
 *   await scraper.initialize();
 *   const leads = await scraper.scrape({ trade: 'loodgieter', location: 'Amsterdam', country: 'NL' });
 *   await scraper.close();
 */
export class GoogleMapsScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;

  /**
   * Launches the browser and prepares a page for scraping.
   * Must be called before scrape().
   */
  async initialize(headed = false): Promise<void> {
    logger.info('Initializing GoogleMapsScraper...');
    const instance = await launchBrowser({ headless: !headed });
    this.browser = instance.browser;
    this.page = instance.page;
    logger.success('GoogleMapsScraper initialized');
  }

  /**
   * Main scraping method. Navigates to Google Maps, searches for the given
   * trade + location, scrolls to load all results, extracts detail data for
   * each listing, and enriches addresses with parsed city/postal/province.
   */
  async scrape(options: ScrapeOptions): Promise<ScrapedLead[]> {
    if (!this.page || !this.browser) {
      throw new Error(
        'Scraper not initialized. Call initialize() before scrape().',
      );
    }

    const page = this.page;
    const searchQuery = `${options.trade} ${options.location}`;

    logger.info(`Starting scrape for: "${searchQuery}" (country: ${options.country})`);

    try {
      // Step 1: Navigate to Google Maps (Dutch locale)
      logger.info('Navigating to Google Maps...');
      await page.goto('https://www.google.com/maps?hl=nl', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });
      await humanDelay();

      // Step 2: Handle cookie consent dialog
      logger.info('Checking for cookie consent dialog...');
      await handleCookieConsent(page);

      // Step 3: Check for CAPTCHA after initial navigation
      const initialCaptcha = await checkForCaptcha(page);
      if (initialCaptcha.detected) {
        logger.error('CAPTCHA detected on initial page load. Cannot proceed.');
        return [];
      }

      // Step 4: Enter search query
      logger.info(`Searching for: "${searchQuery}"`);
      const searchInput = page.locator('#searchboxinput');
      await searchInput.waitFor({ state: 'visible', timeout: 10000 });
      await searchInput.click();
      await searchInput.fill('');
      await humanDelay();

      // Type the query with a human-like cadence
      await searchInput.type(searchQuery, { delay: 50 + Math.random() * 80 });
      await humanDelay();
      await page.keyboard.press('Enter');

      // Step 5: Wait for results to load
      logger.info('Waiting for search results to load...');
      try {
        await page
          .locator('div[role="feed"]')
          .waitFor({ state: 'visible', timeout: 15000 });
      } catch {
        // Fallback: wait for any place link to appear
        logger.warn(
          'div[role="feed"] not found. Waiting for place links...',
        );
        await page
          .locator('a[href*="/maps/place/"]')
          .first()
          .waitFor({ state: 'visible', timeout: 10000 })
          .catch(() => {
            logger.error('No results appeared. The search may have failed.');
          });
      }

      await humanDelay();

      // Check for CAPTCHA after search
      const searchCaptcha = await checkForCaptcha(page);
      if (searchCaptcha.detected) {
        logger.error('CAPTCHA detected after search. Cannot proceed.');
        return [];
      }

      // Step 6: Scroll to load all results
      logger.info('Scrolling to load all results...');
      const totalResults = await scrollToLoadAllResults(page);
      logger.info(`Total results loaded: ${totalResults}`);

      // Step 7: Extract detailed data for each listing
      logger.info('Extracting listing details...');
      const leads = await extractAllListingDetails(page);

      // Step 8: Enrich each lead with parsed address components
      logger.info('Parsing addresses and enriching lead data...');
      for (const lead of leads) {
        if (lead.address) {
          const parsed = parseAddress(lead.address, options.country);

          if (parsed.city && !lead.city) {
            lead.city = parsed.city;
          }
          if (parsed.postal_code && !lead.postal_code) {
            lead.postal_code = parsed.postal_code;
          }
          if (parsed.province && !lead.province) {
            lead.province = parsed.province;
          }
          if (parsed.country) {
            lead.country = parsed.country;
          }
        }

        // Step 9: Fall back to the search country if not determined from address
        if (!lead.country || lead.country === 'NL') {
          // Only override default if we have a specific country from options
          if (options.country) {
            lead.country = options.country.toUpperCase();
          }
        }
      }

      // Step 10: Final CAPTCHA check
      const finalCaptcha = await checkForCaptcha(page);
      if (finalCaptcha.detected) {
        logger.warn(
          'CAPTCHA detected at the end of scraping. Results may be incomplete.',
        );
      }

      logger.success(
        `Scraping complete. Extracted ${leads.length} leads for "${searchQuery}"`,
      );
      return leads;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`Scraping failed: ${message}`);

      if (err instanceof Error && err.stack) {
        logger.error(`Stack trace: ${err.stack}`);
      }

      return [];
    }
  }

  /**
   * Safely closes the browser and cleans up resources.
   */
  async close(): Promise<void> {
    logger.info('Closing GoogleMapsScraper...');
    if (this.browser) {
      await closeBrowser(this.browser);
    }
    this.browser = null;
    this.page = null;
    logger.success('GoogleMapsScraper closed');
  }
}

export default GoogleMapsScraper;
