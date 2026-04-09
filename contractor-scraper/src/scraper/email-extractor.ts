import logger from '../utils/logger';
import { randomDelay } from '../utils/delays';

/** Extensions that are image/font assets, not real email TLDs. */
const FALSE_POSITIVE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.svg',
  '.webp',
  '.bmp',
  '.ico',
  '.tif',
  '.tiff',
  '.woff',
  '.woff2',
  '.ttf',
  '.eot',
  '.css',
  '.js',
];

/** Substrings that indicate a placeholder / test address. */
const FALSE_POSITIVE_KEYWORDS = [
  'example',
  'test',
  'sentry',
  'webpack',
  'localhost',
  'domain.com',
  'email.com',
  'yourname',
  'username',
  'wixpress',
  'placeholder',
];

const EMAIL_REGEX = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

/**
 * Return true if the email looks like a real contact address.
 */
function isValidEmail(email: string): boolean {
  const lower = email.toLowerCase();

  // Reject emails whose TLD matches a known asset extension
  for (const ext of FALSE_POSITIVE_EXTENSIONS) {
    if (lower.endsWith(ext)) {
      return false;
    }
  }

  // Reject emails containing known placeholder keywords
  for (const keyword of FALSE_POSITIVE_KEYWORDS) {
    if (lower.includes(keyword)) {
      return false;
    }
  }

  // Reject very short local parts or domain parts
  const [localPart, domainPart] = lower.split('@');
  if (!localPart || localPart.length < 2) return false;
  if (!domainPart || domainPart.length < 4) return false;

  return true;
}

/**
 * Fetch a single URL and return its HTML body, or null on failure.
 * Uses a 5-second timeout via AbortController.
 */
async function fetchPage(url: string): Promise<string | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain') && !contentType.includes('application/xhtml')) {
      return null;
    }

    return await response.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Extract all valid email addresses from an HTML string.
 */
function extractEmails(html: string): string[] {
  const matches = html.match(EMAIL_REGEX);
  if (!matches) return [];

  // De-duplicate and filter
  const unique = [...new Set(matches)];
  return unique.filter(isValidEmail);
}

/**
 * Derive the base URL from a website URL (protocol + host).
 */
function getBaseUrl(websiteUrl: string): string {
  try {
    const parsed = new URL(websiteUrl);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    // If URL is missing protocol, prepend https
    if (!websiteUrl.startsWith('http')) {
      return getBaseUrl(`https://${websiteUrl}`);
    }
    return websiteUrl;
  }
}

/**
 * Normalise a website URL so it always has a protocol.
 */
function normaliseUrl(url: string): string {
  if (!url.startsWith('http://') && !url.startsWith('https://')) {
    return `https://${url}`;
  }
  return url;
}

/** Candidate contact-page paths to try when the homepage yields no email. */
const CONTACT_PATHS = ['/contact', '/over-ons', '/about', '/contact-us', '/kontakt'];

/**
 * Attempt to extract an email from a contractor's website.
 *
 * 1. Fetch the homepage and scan for emails.
 * 2. If nothing found, try common contact/about pages.
 * 3. Return the first valid email, or null.
 */
export async function extractEmailFromWebsite(
  websiteUrl: string,
): Promise<string | null> {
  try {
    const normalisedUrl = normaliseUrl(websiteUrl);
    const baseUrl = getBaseUrl(normalisedUrl);

    // 1. Try the homepage
    const homepageHtml = await fetchPage(normalisedUrl);
    if (homepageHtml) {
      const emails = extractEmails(homepageHtml);
      if (emails.length > 0) {
        return emails[0];
      }
    }

    // 2. Try common contact / about pages
    for (const path of CONTACT_PATHS) {
      const contactUrl = `${baseUrl}${path}`;
      const contactHtml = await fetchPage(contactUrl);
      if (contactHtml) {
        const emails = extractEmails(contactHtml);
        if (emails.length > 0) {
          return emails[0];
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Iterate through a list of leads, extract emails from their websites,
 * and call the provided callback for every email found.
 *
 * Returns the total number of emails successfully extracted.
 */
export async function enrichLeadsWithEmails(
  leads: Array<{ id: string; website_url: string }>,
  onEmailFound: (leadId: string, email: string) => Promise<void>,
): Promise<number> {
  let found = 0;
  const total = leads.length;

  for (let i = 0; i < total; i++) {
    const lead = leads[i];
    logger.info(
      `[email-extractor] Processing ${i + 1}/${total}: ${lead.website_url}`,
    );

    try {
      const email = await extractEmailFromWebsite(lead.website_url);

      if (email) {
        logger.success(
          `[email-extractor] Found email for lead ${lead.id}: ${email}`,
        );
        await onEmailFound(lead.id, email);
        found++;
      } else {
        logger.debug(
          `[email-extractor] No email found for ${lead.website_url}`,
        );
      }
    } catch (error) {
      logger.warn(
        `[email-extractor] Error processing ${lead.website_url}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    // Polite delay between requests (1-2 seconds)
    if (i < total - 1) {
      await randomDelay(1000, 2000);
    }
  }

  logger.info(
    `[email-extractor] Finished. Found ${found} email(s) out of ${total} leads.`,
  );
  return found;
}
