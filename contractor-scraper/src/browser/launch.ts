import { Browser, BrowserContext, Page, chromium } from 'playwright';
import { BrowserConfig } from '../types';
import { USER_AGENTS, DEFAULT_VIEWPORT } from '../utils/constants';
import logger from '../utils/logger';

export interface LaunchResult {
  browser: Browser;
  context: BrowserContext;
  page: Page;
}

/**
 * Launches a Chromium browser with anti-detection settings.
 *
 * Tries to use playwright-extra with the stealth plugin for better
 * bot-detection evasion. Falls back to regular playwright if the
 * extra packages are not available.
 *
 * Headless mode is controlled by the optional config parameter or
 * the HEADLESS environment variable (default: true).
 */
export async function launchBrowser(
  config?: Partial<BrowserConfig>,
): Promise<LaunchResult> {
  const headless =
    config?.headless ?? (process.env.HEADLESS !== 'false');
  const language = config?.language ?? 'nl-NL';
  const viewport = config?.viewport ?? DEFAULT_VIEWPORT;
  const userAgent =
    USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

  logger.info(
    `Launching browser (headless=${headless}, locale=${language}, viewport=${viewport.width}x${viewport.height})`,
  );
  logger.debug(`User-Agent: ${userAgent}`);

  const launchArgs = [
    '--disable-blink-features=AutomationControlled',
    '--disable-features=IsolateOrigins,site-per-process',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    `--window-size=${viewport.width},${viewport.height}`,
  ];

  let browser: Browser;

  try {
    // Try playwright-extra with stealth plugin for better anti-detection
    const { chromium: stealthChromium } = await import('playwright-extra');
    // The stealth plugin module exports a factory function.
    // Handle both CJS default and ESM-style imports.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stealthModule: any = await import('puppeteer-extra-plugin-stealth');
    const StealthPlugin = stealthModule.default ?? stealthModule;
    stealthChromium.use(StealthPlugin());

    browser = await stealthChromium.launch({
      headless,
      args: launchArgs,
    });

    logger.success('Launched browser with stealth plugin');
  } catch {
    // Fall back to regular playwright
    logger.warn(
      'playwright-extra or stealth plugin not available — using standard playwright',
    );

    browser = await chromium.launch({
      headless,
      args: launchArgs,
    });

    logger.success('Launched browser with standard playwright');
  }

  const context = await browser.newContext({
    viewport,
    locale: language,
    userAgent,
    timezoneId: 'Europe/Amsterdam',
    permissions: ['geolocation'],
    geolocation: { latitude: 52.3676, longitude: 4.9041 }, // Amsterdam
  });

  const page = await context.newPage();

  // Mask webdriver detection
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
  });

  return { browser, context, page };
}

/**
 * Safely closes the browser instance.
 * Silently handles errors if the browser was already closed.
 */
export async function closeBrowser(browser: Browser): Promise<void> {
  try {
    if (browser.isConnected()) {
      await browser.close();
      logger.info('Browser closed successfully');
    }
  } catch (error) {
    logger.warn(
      `Error closing browser: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
