import { Page } from 'playwright';
import logger from '../utils/logger';
import { humanDelay } from '../utils/delays';

/**
 * Handles the Google cookie-consent dialog that appears on first visit.
 * Clicks "Alles accepteren" / "Accept all" if the dialog is present.
 */
export async function handleCookieConsent(page: Page): Promise<void> {
  try {
    // Google consent dialog can appear in several forms.
    // Look for common accept-all buttons (Dutch and English variants).
    const selectors = [
      'button:has-text("Alles accepteren")',
      'button:has-text("Alle cookies accepteren")',
      'button:has-text("Accept all")',
      '[aria-label="Alles accepteren"]',
      '[aria-label="Accept all"]',
      'form[action*="consent"] button:first-of-type',
    ];

    for (const selector of selectors) {
      try {
        const btn = page.locator(selector).first();
        const visible = await btn.isVisible({ timeout: 3000 }).catch(() => false);
        if (visible) {
          logger.info('Cookie consent dialog detected — accepting...');
          await btn.click();
          await humanDelay();
          logger.success('Cookie consent accepted');
          return;
        }
      } catch {
        // Try next selector
      }
    }

    logger.info('No cookie consent dialog found — continuing');
  } catch (err) {
    logger.warn('Cookie consent handling failed — continuing anyway');
  }
}
