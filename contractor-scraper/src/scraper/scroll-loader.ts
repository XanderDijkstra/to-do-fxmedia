import { Page } from 'playwright';
import { scrollDelay } from '../utils/delays';
import logger from '../utils/logger';

/**
 * Scrolls the Google Maps results panel to load all available results.
 * Returns the total count of result items found once scrolling is complete.
 */
export async function scrollToLoadAllResults(page: Page): Promise<number> {
  logger.info('Starting to scroll results panel to load all listings...');

  // Locate the scrollable results container.
  // Google Maps places results inside a div with role="feed" or a scrollable
  // container within the left-hand sidebar.
  const feedSelector = 'div[role="feed"]';
  const feedLocator = page.locator(feedSelector);

  // Wait for the feed to be present (up to 10 seconds)
  try {
    await feedLocator.waitFor({ state: 'attached', timeout: 10000 });
  } catch {
    logger.warn(
      'Could not find div[role="feed"]. Attempting fallback scrollable container...',
    );
  }

  // Determine which container to scroll
  const feedExists = (await feedLocator.count()) > 0;
  const scrollContainer = feedExists
    ? feedSelector
    : 'div.m6QErb[aria-label]';

  /**
   * Count the number of listing items currently in the DOM.
   */
  async function countResults(): Promise<number> {
    // Primary: direct children of the feed that are actual result cards
    const feedChildCount = await page
      .locator(`${feedContainer} > div`)
      .count()
      .catch(() => 0);

    // Secondary: links to individual places
    const placeLinksCount = await page
      .locator('a[href*="/maps/place/"]')
      .count()
      .catch(() => 0);

    return Math.max(feedChildCount, placeLinksCount);
  }

  // Resolve the actual container selector we will work with
  const feedContainer = feedExists ? feedSelector : scrollContainer;

  let previousCount = 0;
  let staleRounds = 0;
  const maxStaleRounds = 3;
  let lastLoggedAt = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const currentCount = await countResults();

    // Log progress every 20 items
    if (currentCount - lastLoggedAt >= 20) {
      logger.info(`Loaded ${currentCount} results so far...`);
      lastLoggedAt = currentCount;
    }

    // Scroll the panel by a random 300-500px
    const scrollAmount = Math.floor(Math.random() * 201) + 300; // 300..500
    await page.evaluate(
      ({ selector, amount }) => {
        const el = document.querySelector(selector);
        if (el) {
          el.scrollBy({ top: amount, behavior: 'smooth' });
        }
      },
      { selector: feedContainer, amount: scrollAmount },
    );

    // Wait between scrolls
    await scrollDelay();

    // Check for end-of-list indicators
    const endReached = await page.evaluate(() => {
      const body = document.body.innerText;
      return (
        body.includes('Je hebt het einde van de lijst bereikt') ||
        body.includes("You've reached the end of the list") ||
        body.includes('Geen resultaten') ||
        body.includes('No results found')
      );
    });

    if (endReached) {
      const finalCount = await countResults();
      logger.success(
        `Reached end of list. Total results loaded: ${finalCount}`,
      );
      return finalCount;
    }

    // Check if we got new results
    const updatedCount = await countResults();
    if (updatedCount <= previousCount) {
      staleRounds++;
      if (staleRounds >= maxStaleRounds) {
        logger.info(
          `No new results after ${maxStaleRounds} consecutive scroll attempts. ` +
            `Total results loaded: ${updatedCount}`,
        );
        return updatedCount;
      }
    } else {
      staleRounds = 0;
    }

    previousCount = updatedCount;
  }
}
