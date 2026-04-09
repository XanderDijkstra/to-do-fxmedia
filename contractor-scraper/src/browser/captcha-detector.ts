import { Page } from 'playwright';
import logger from '../utils/logger';

export interface CaptchaDetectionResult {
  detected: boolean;
  type?: string;
}

export async function checkForCaptcha(
  page: Page,
): Promise<CaptchaDetectionResult> {
  try {
    // Check for reCAPTCHA iframe
    const recaptchaIframe = await page
      .locator('iframe[src*="recaptcha"]')
      .count();
    if (recaptchaIframe > 0) {
      return { detected: true, type: 'reCAPTCHA' };
    }

    // Check for generic captcha iframe
    const captchaIframe = await page
      .locator('iframe[src*="captcha"]')
      .count();
    if (captchaIframe > 0) {
      return { detected: true, type: 'captcha-iframe' };
    }

    // Check for elements with captcha id or class
    const captchaById = await page.locator('#captcha').count();
    if (captchaById > 0) {
      return { detected: true, type: 'captcha-element-id' };
    }

    const captchaByClass = await page.locator('.captcha').count();
    if (captchaByClass > 0) {
      return { detected: true, type: 'captcha-element-class' };
    }

    // Check page text for traffic-related warnings
    const bodyText = await page
      .locator('body')
      .innerText()
      .catch(() => '');

    if (/unusual traffic/i.test(bodyText)) {
      return { detected: true, type: 'unusual-traffic-warning' };
    }

    if (/ongebruikelijk verkeer/i.test(bodyText)) {
      return { detected: true, type: 'unusual-traffic-warning-nl' };
    }

    return { detected: false };
  } catch (error) {
    logger.warn(
      `CAPTCHA detection check failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    return { detected: false };
  }
}

export async function handleCaptchaDetection(
  page: Page,
): Promise<CaptchaDetectionResult> {
  const result = await checkForCaptcha(page);

  if (result.detected) {
    logger.error(
      `\x1b[31mCAPTCHA DETECTED (type: ${result.type}). ` +
        `The scraper cannot proceed automatically. ` +
        `Consider: waiting, rotating IP, or reducing request rate.\x1b[0m`,
    );
  }

  return result;
}
