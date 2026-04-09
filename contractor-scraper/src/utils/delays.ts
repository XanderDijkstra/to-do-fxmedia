/**
 * Returns a promise that resolves after a random number of milliseconds
 * between min and max (inclusive).
 */
export function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Delay used between scroll actions in the Google Maps results list.
 * Reads SCROLL_DELAY_MIN and SCROLL_DELAY_MAX from environment variables.
 */
export function scrollDelay(): Promise<void> {
  const min = parseInt(process.env.SCROLL_DELAY_MIN || '1000', 10);
  const max = parseInt(process.env.SCROLL_DELAY_MAX || '2500', 10);
  return randomDelay(min, max);
}

/**
 * Delay used before extracting details from an individual business listing.
 * Reads DETAIL_DELAY_MIN and DETAIL_DELAY_MAX from environment variables.
 */
export function detailDelay(): Promise<void> {
  const min = parseInt(process.env.DETAIL_DELAY_MIN || '500', 10);
  const max = parseInt(process.env.DETAIL_DELAY_MAX || '1500', 10);
  return randomDelay(min, max);
}

/**
 * A general-purpose human-like delay between 500ms and 3000ms.
 */
export function humanDelay(): Promise<void> {
  return randomDelay(500, 3000);
}
