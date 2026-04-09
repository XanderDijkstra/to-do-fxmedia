import { Page } from 'playwright';
import { ScrapedLead } from '../types';
import { detailDelay } from '../utils/delays';
import logger from '../utils/logger';
import { checkForCaptcha } from '../browser/captcha-detector';

/**
 * Extracts detailed information from a Google Maps listing detail panel.
 * Assumes the detail panel is already visible (i.e., a listing has been clicked).
 *
 * Returns null if the extraction fails critically (no business name found).
 * Partial data is acceptable — each field is extracted in its own try-catch.
 */
export async function extractListingDetails(
  page: Page,
): Promise<ScrapedLead | null> {
  const lead: Partial<ScrapedLead> = {
    data_source: 'google_maps_playwright',
    scraped_at: new Date().toISOString(),
    phone_number: null,
    email: null,
    website_url: null,
    google_maps_url: null,
    address: null,
    city: null,
    postal_code: null,
    province: null,
    country: 'NL',
    rating: null,
    review_count: null,
    category: null,
    place_id: null,
  };

  // --- Business name ---
  try {
    // Primary: h1 element or the large heading in the detail panel
    const nameEl = page.locator(
      'h1.DUwDvf, h1.fontHeadlineLarge, h1[class*="fontHeadlineLarge"], div[class*="fontHeadlineLarge"], h1',
    ).first();
    const nameText = await nameEl.innerText({ timeout: 5000 }).catch(() => '');
    if (nameText.trim()) {
      lead.business_name = nameText.trim();
    }
  } catch {
    // No business name found
  }

  // If we have no business name, this extraction is a failure
  if (!lead.business_name) {
    logger.warn('Could not extract business name — skipping listing');
    return null;
  }

  // --- Address ---
  try {
    const addressSelectors = [
      'button[data-item-id="address"]',
      '[data-item-id="address"]',
      'button[aria-label*="Adres"]',
      'button[aria-label*="Address"]',
      '[data-tooltip="Kopieer adres"]',
      '[data-tooltip="Copy address"]',
    ];

    for (const sel of addressSelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        const text = await el.innerText({ timeout: 2000 }).catch(() => '');
        if (text.trim()) {
          lead.address = text.trim();
          break;
        }
        // If innerText is empty, try aria-label
        const ariaLabel = await el.getAttribute('aria-label').catch(() => null);
        if (ariaLabel && ariaLabel.trim()) {
          // aria-label is often "Adres: Straatnaam 123, 1234 AB Stad"
          const cleaned = ariaLabel.replace(/^(Adres|Address):\s*/i, '').trim();
          if (cleaned) {
            lead.address = cleaned;
            break;
          }
        }
      }
    }
  } catch {
    // Address extraction failed silently
  }

  // --- Phone number ---
  try {
    const phoneSelectors = [
      'button[data-item-id*="phone"]',
      '[data-item-id*="phone"]',
      'button[aria-label*="Telefoon"]',
      'button[aria-label*="Phone"]',
      'a[data-item-id*="phone"]',
      '[data-tooltip="Kopieer telefoonnummer"]',
      '[data-tooltip="Copy phone number"]',
    ];

    for (const sel of phoneSelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        // Try the text content first
        const text = await el.innerText({ timeout: 2000 }).catch(() => '');
        if (text.trim()) {
          lead.phone_number = text.trim();
          break;
        }
        // Fall back to aria-label
        const ariaLabel = await el.getAttribute('aria-label').catch(() => null);
        if (ariaLabel) {
          const cleaned = ariaLabel
            .replace(/^(Telefoon|Phone|Bel):\s*/i, '')
            .trim();
          if (cleaned) {
            lead.phone_number = cleaned;
            break;
          }
        }
      }
    }
  } catch {
    // Phone extraction failed silently
  }

  // --- Website URL ---
  try {
    const websiteSelectors = [
      'a[data-item-id="authority"]',
      '[data-item-id="authority"]',
      'a[aria-label*="Website"]',
      'button[aria-label*="Website"]',
    ];

    for (const sel of websiteSelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        // For anchor tags, grab the href directly
        const href = await el.getAttribute('href').catch(() => null);
        if (href && href.startsWith('http')) {
          lead.website_url = href;
          break;
        }
        // Sometimes the text itself is a URL
        const text = await el.innerText({ timeout: 2000 }).catch(() => '');
        if (text.trim()) {
          lead.website_url = text.trim();
          break;
        }
        // Try aria-label
        const ariaLabel = await el.getAttribute('aria-label').catch(() => null);
        if (ariaLabel) {
          const cleaned = ariaLabel.replace(/^Website:\s*/i, '').trim();
          if (cleaned) {
            lead.website_url = cleaned;
            break;
          }
        }
      }
    }
  } catch {
    // Website extraction failed silently
  }

  // --- Google Maps URL ---
  try {
    lead.google_maps_url = page.url();
  } catch {
    // URL extraction failed
  }

  // --- Rating ---
  try {
    const ratingSelectors = [
      'span[aria-label*="sterren"]',
      'span[aria-label*="stars"]',
      'span[aria-label*="ster"]',
      'div.F7nice span[aria-label]',
    ];

    for (const sel of ratingSelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        const ariaLabel = await el.getAttribute('aria-label').catch(() => null);
        if (ariaLabel) {
          // aria-label like "4,5 sterren" or "4.5 stars"
          const numMatch = ariaLabel.match(/([\d,.]+)/);
          if (numMatch) {
            const rating = parseFloat(numMatch[1].replace(',', '.'));
            if (!isNaN(rating) && rating >= 0 && rating <= 5) {
              lead.rating = rating;
              break;
            }
          }
        }
        // Fallback: try innerText
        const text = await el.innerText({ timeout: 1000 }).catch(() => '');
        const numMatch = text.match(/([\d,.]+)/);
        if (numMatch) {
          const rating = parseFloat(numMatch[1].replace(',', '.'));
          if (!isNaN(rating) && rating >= 0 && rating <= 5) {
            lead.rating = rating;
            break;
          }
        }
      }
    }
  } catch {
    // Rating extraction failed silently
  }

  // --- Review count ---
  try {
    // The review count is often near the rating, in a format like "(123)" or "123 reviews"
    const reviewSelectors = [
      'span[aria-label*="review"]',
      'span[aria-label*="beoordelingen"]',
      'button[aria-label*="review"]',
      'button[aria-label*="beoordelingen"]',
    ];

    for (const sel of reviewSelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        const ariaLabel = await el.getAttribute('aria-label').catch(() => null);
        if (ariaLabel) {
          const numMatch = ariaLabel.match(/([\d.,]+)/);
          if (numMatch) {
            const count = parseInt(numMatch[1].replace(/[.,]/g, ''), 10);
            if (!isNaN(count)) {
              lead.review_count = count;
              break;
            }
          }
        }
        const text = await el.innerText({ timeout: 1000 }).catch(() => '');
        // Match patterns like "(123)", "123 reviews", "123 beoordelingen"
        const numMatch = text.match(/\(?([\d.,]+)\)?/);
        if (numMatch) {
          const count = parseInt(numMatch[1].replace(/[.,]/g, ''), 10);
          if (!isNaN(count)) {
            lead.review_count = count;
            break;
          }
        }
      }
    }

    // Fallback: look for parenthesized number near the rating
    if (lead.review_count === null) {
      const parenthesized = await page
        .locator('span.UY7F9')
        .first()
        .innerText({ timeout: 1000 })
        .catch(() => '');
      const match = parenthesized.match(/\(?([\d.,]+)\)?/);
      if (match) {
        const count = parseInt(match[1].replace(/[.,]/g, ''), 10);
        if (!isNaN(count)) {
          lead.review_count = count;
        }
      }
    }
  } catch {
    // Review count extraction failed silently
  }

  // --- Category ---
  try {
    const categorySelectors = [
      'button[jsaction*="category"]',
      'button[class*="DkEaL"]',
      'span.DkEaL',
      // The category text is often the first clickable chip below the name
      'div[class*="fontBodyMedium"] button:first-of-type',
    ];

    for (const sel of categorySelectors) {
      const el = page.locator(sel).first();
      const visible = await el.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        const text = await el.innerText({ timeout: 1000 }).catch(() => '');
        if (text.trim() && text.trim().length < 80) {
          lead.category = text.trim();
          break;
        }
      }
    }
  } catch {
    // Category extraction failed silently
  }

  // --- Place ID ---
  try {
    const currentUrl = page.url();

    // Google Maps URLs often contain the place ID after "!1s" or in the "place_id" parameter
    // Format examples:
    //   ...!1s0x47c609c3db87e4bb:0x3e...  (the hex part is the ftid, not place_id)
    //   ...!1sChIJ...   (ChIJ prefix is a place_id)

    // Try !1s pattern first — if followed by ChIJ it's a place_id
    const placeIdFromUrl = currentUrl.match(/!1s(ChIJ[A-Za-z0-9_-]+)/);
    if (placeIdFromUrl) {
      lead.place_id = placeIdFromUrl[1];
    }

    // Try place_id query parameter
    if (!lead.place_id) {
      const urlObj = new URL(currentUrl);
      const pid = urlObj.searchParams.get('place_id');
      if (pid) {
        lead.place_id = pid;
      }
    }

    // Try to find it in the page's data attributes
    if (!lead.place_id) {
      const placeIdAttr = await page
        .locator('[data-place-id]')
        .first()
        .getAttribute('data-place-id')
        .catch(() => null);
      if (placeIdAttr) {
        lead.place_id = placeIdAttr;
      }
    }

    // Try extracting from the /maps/place/ URL pattern with a CID or feature ID
    if (!lead.place_id) {
      const ftidMatch = currentUrl.match(/0x[0-9a-f]+:0x[0-9a-f]+/);
      if (ftidMatch) {
        lead.place_id = ftidMatch[0];
      }
    }
  } catch {
    // Place ID extraction failed silently
  }

  return lead as ScrapedLead;
}

/**
 * Iterates through all listing results in the Google Maps results panel,
 * clicking each one to load its detail view, extracting data, and
 * navigating back to the results list.
 *
 * @param page     The Playwright page instance with results loaded
 * @param maxResults  Optional cap on how many listings to extract
 * @returns        Array of successfully extracted ScrapedLead objects
 */
export async function extractAllListingDetails(
  page: Page,
  maxResults?: number,
): Promise<ScrapedLead[]> {
  const leads: ScrapedLead[] = [];

  // Get all listing link elements from the results feed
  const listingSelector = 'div[role="feed"] > div > div > a[href*="/maps/place/"]';
  const fallbackSelector = 'a[href*="/maps/place/"]';

  let listingCount = await page.locator(listingSelector).count().catch(() => 0);
  const effectiveSelector =
    listingCount > 0 ? listingSelector : fallbackSelector;

  if (listingCount === 0) {
    listingCount = await page.locator(effectiveSelector).count().catch(() => 0);
  }

  const total = maxResults
    ? Math.min(maxResults, listingCount)
    : listingCount;

  logger.info(
    `Found ${listingCount} listings. Will extract details for ${total}.`,
  );

  for (let i = 0; i < total; i++) {
    logger.info(`Extracting details: ${i + 1}/${total}`);

    try {
      // Re-query listings each iteration because the DOM may change
      // after navigation back from a detail view
      const listings = page.locator(effectiveSelector);
      const currentCount = await listings.count().catch(() => 0);

      if (i >= currentCount) {
        logger.warn(
          `Listing index ${i} out of bounds (${currentCount} available). Stopping.`,
        );
        break;
      }

      const listing = listings.nth(i);

      // Scroll the listing into view and click it
      await listing.scrollIntoViewIfNeeded({ timeout: 3000 }).catch(() => {});
      await listing.click({ timeout: 5000 });

      // Wait for the detail panel heading to appear
      try {
        await page
          .locator(
            'h1.DUwDvf, h1.fontHeadlineLarge, h1[class*="fontHeadlineLarge"], div[class*="fontHeadlineLarge"], h1',
          )
          .first()
          .waitFor({ state: 'visible', timeout: 5000 });
      } catch {
        logger.warn(
          `Detail panel did not load for listing ${i + 1}. Skipping.`,
        );
        // Try to go back anyway
        await navigateBack(page);
        await detailDelay();
        continue;
      }

      // Extract details from the detail panel
      const lead = await extractListingDetails(page);
      if (lead) {
        leads.push(lead);
      }

      // Navigate back to the results list
      await navigateBack(page);

      // Wait between detail extractions
      await detailDelay();

      // Check for CAPTCHA
      const captchaResult = await checkForCaptcha(page);
      if (captchaResult.detected) {
        logger.error(
          `CAPTCHA detected after extracting ${leads.length} leads. Stopping extraction.`,
        );
        return leads;
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);
      logger.warn(
        `Error extracting listing ${i + 1}: ${message}. Continuing...`,
      );

      // Attempt recovery: navigate back
      try {
        await navigateBack(page);
        await detailDelay();
      } catch {
        // If we can't even navigate back, stop
        logger.error(
          'Failed to navigate back to results. Stopping extraction.',
        );
        return leads;
      }
    }
  }

  logger.success(`Extracted details for ${leads.length} listings`);
  return leads;
}

/**
 * Navigates back from a detail view to the results list.
 * Tries the back button in the detail panel first, then browser back.
 */
async function navigateBack(page: Page): Promise<void> {
  try {
    // Google Maps has a back arrow button in the detail panel
    const backButtonSelectors = [
      'button[aria-label="Terug"]',
      'button[aria-label="Back"]',
      'button.hYBRP',
      'button[jsaction*="back"]',
    ];

    for (const sel of backButtonSelectors) {
      const btn = page.locator(sel).first();
      const visible = await btn.isVisible({ timeout: 1000 }).catch(() => false);
      if (visible) {
        await btn.click();
        // Wait for the results feed to reappear
        await page
          .locator('div[role="feed"]')
          .waitFor({ state: 'visible', timeout: 5000 })
          .catch(() => {});
        return;
      }
    }

    // Fallback: use browser back navigation
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 5000 });
    await page
      .locator('div[role="feed"]')
      .waitFor({ state: 'visible', timeout: 5000 })
      .catch(() => {});
  } catch {
    // Last resort: use keyboard shortcut
    await page.keyboard.press('Escape');
    await page
      .locator('div[role="feed"]')
      .waitFor({ state: 'visible', timeout: 3000 })
      .catch(() => {});
  }
}
