/**
 * Province mapping for Dutch postal codes.
 * Maps the first 1-2 digits of a postal code to a province abbreviation.
 * This is a rough mapping — not exhaustive — but covers the major ranges.
 */
const NL_POSTAL_PROVINCE_MAP: Array<{
  min: number;
  max: number;
  province: string;
}> = [
  // Noord-Holland (NH)
  { min: 1000, max: 1299, province: 'NH' },
  { min: 1400, max: 1499, province: 'NH' },
  { min: 2000, max: 2199, province: 'NH' },

  // Zuid-Holland (ZH)
  { min: 2200, max: 2999, province: 'ZH' },
  { min: 3100, max: 3199, province: 'ZH' },

  // Utrecht (UT)
  { min: 3400, max: 3999, province: 'UT' },
  { min: 3000, max: 3099, province: 'UT' },

  // Flevoland (FL)
  { min: 1300, max: 1399, province: 'FL' },
  { min: 3800, max: 3899, province: 'FL' },
  { min: 8200, max: 8299, province: 'FL' },

  // Noord-Brabant (NB)
  { min: 4600, max: 4699, province: 'NB' },
  { min: 4700, max: 4999, province: 'NB' },
  { min: 5000, max: 5099, province: 'NB' },
  { min: 5100, max: 5199, province: 'NB' },
  { min: 5200, max: 5299, province: 'NB' },
  { min: 5300, max: 5399, province: 'NB' },
  { min: 5400, max: 5499, province: 'NB' },
  { min: 5500, max: 5599, province: 'NB' },
  { min: 5600, max: 5699, province: 'NB' },

  // Limburg (LI)
  { min: 5700, max: 5799, province: 'LI' },
  { min: 5800, max: 5899, province: 'LI' },
  { min: 5900, max: 5999, province: 'LI' },
  { min: 6000, max: 6499, province: 'LI' },

  // Gelderland (GE)
  { min: 3900, max: 3999, province: 'GE' },
  { min: 4000, max: 4199, province: 'GE' },
  { min: 6500, max: 6599, province: 'GE' },
  { min: 6600, max: 6699, province: 'GE' },
  { min: 6700, max: 6799, province: 'GE' },
  { min: 6800, max: 6999, province: 'GE' },
  { min: 7000, max: 7399, province: 'GE' },

  // Overijssel (OV)
  { min: 7400, max: 7699, province: 'OV' },
  { min: 7700, max: 7799, province: 'OV' },
  { min: 7900, max: 7999, province: 'OV' },
  { min: 8000, max: 8099, province: 'OV' },

  // Drenthe (DR)
  { min: 7800, max: 7899, province: 'DR' },
  { min: 9400, max: 9499, province: 'DR' },

  // Friesland (FR)
  { min: 8400, max: 8499, province: 'FR' },
  { min: 8500, max: 8599, province: 'FR' },
  { min: 8600, max: 8699, province: 'FR' },
  { min: 8700, max: 8799, province: 'FR' },
  { min: 8800, max: 8899, province: 'FR' },
  { min: 8900, max: 8999, province: 'FR' },
  { min: 9000, max: 9099, province: 'FR' },
  { min: 9100, max: 9199, province: 'FR' },
  { min: 9200, max: 9299, province: 'FR' },

  // Groningen (GR)
  { min: 9300, max: 9399, province: 'GR' },
  { min: 9500, max: 9599, province: 'GR' },
  { min: 9600, max: 9699, province: 'GR' },
  { min: 9700, max: 9799, province: 'GR' },
  { min: 9800, max: 9899, province: 'GR' },
  { min: 9900, max: 9999, province: 'GR' },

  // Zeeland (ZE)
  { min: 4300, max: 4599, province: 'ZE' },
];

/**
 * Look up the Dutch province abbreviation for a given numeric postal code.
 */
function getProvinceFromPostalCode(numericCode: number): string | undefined {
  for (const range of NL_POSTAL_PROVINCE_MAP) {
    if (numericCode >= range.min && numericCode <= range.max) {
      return range.province;
    }
  }
  return undefined;
}

export interface ParsedAddress {
  city?: string;
  postal_code?: string;
  province?: string;
  country?: string;
}

/**
 * Parses a full address string (as returned by Google Maps) into structured
 * components: city, postal_code, province, country.
 *
 * Supports Dutch and Belgian address formats:
 *   NL: "Straatnaam 123, 1234 AB Amsterdam"
 *   BE: "Straatnaam 123, 1000 Brussel, Belgie"
 */
export function parseAddress(
  fullAddress: string,
  searchCountry?: string,
): ParsedAddress {
  const result: ParsedAddress = {};

  if (!fullAddress || fullAddress.trim().length === 0) {
    return result;
  }

  const trimmed = fullAddress.trim();

  // --- Extract postal code ---

  // Dutch postal code: 4 digits, optional space, 2 uppercase letters
  const nlPostalMatch = trimmed.match(/\b(\d{4})\s?([A-Z]{2})\b/);

  // Belgian postal code: standalone 4 digits (no trailing letters)
  // We only use this if we did NOT find a Dutch-style code
  const bePostalMatch = !nlPostalMatch
    ? trimmed.match(/\b(\d{4})\b/)
    : null;

  let isDutch = false;
  let isBelgian = false;
  let numericPostal: number | undefined;

  if (nlPostalMatch) {
    // Dutch-style postal code
    result.postal_code = `${nlPostalMatch[1]} ${nlPostalMatch[2]}`;
    numericPostal = parseInt(nlPostalMatch[1], 10);
    isDutch = true;
  } else if (bePostalMatch) {
    result.postal_code = bePostalMatch[1];
    numericPostal = parseInt(bePostalMatch[1], 10);
    // Belgian postal codes are typically 1000-9999 but so are Dutch numeric parts.
    // We'll use other clues to determine country.
  }

  // --- Determine country from address text ---
  const lower = trimmed.toLowerCase();

  if (
    lower.includes('nederland') ||
    lower.includes('netherlands') ||
    lower.includes(', nl')
  ) {
    result.country = 'NL';
    isDutch = true;
  } else if (
    lower.includes('belgi\u00eb') ||
    lower.includes('belgique') ||
    lower.includes('belgium') ||
    lower.includes(', be')
  ) {
    result.country = 'BE';
    isBelgian = true;
  }

  // If no country text found, infer from postal code format
  if (!result.country) {
    if (isDutch) {
      result.country = 'NL';
    } else if (searchCountry) {
      result.country = searchCountry.toUpperCase();
      if (result.country === 'BE') {
        isBelgian = true;
      } else if (result.country === 'NL') {
        isDutch = true;
      }
    }
  }

  // --- Extract city ---
  // The city typically comes right after the postal code in the same comma-segment.
  // Example: "Keizersgracht 123, 1015 CJ Amsterdam, Nederland"
  //   -> postal = "1015 CJ", city = "Amsterdam"

  if (nlPostalMatch) {
    // Everything after the postal code in the same comma-separated segment
    const postalEnd =
      (nlPostalMatch.index ?? 0) + nlPostalMatch[0].length;
    const afterPostal = trimmed.substring(postalEnd);

    // Split by comma, take first segment (city name)
    const parts = afterPostal.split(',');
    const cityCandidate = parts[0].trim();
    if (cityCandidate.length > 0) {
      result.city = cityCandidate;
    }
  } else if (bePostalMatch) {
    const postalEnd =
      (bePostalMatch.index ?? 0) + bePostalMatch[0].length;
    const afterPostal = trimmed.substring(postalEnd);

    const parts = afterPostal.split(',');
    const cityCandidate = parts[0].trim();
    if (cityCandidate.length > 0) {
      result.city = cityCandidate;
    }
  }

  // Fallback: if no city found via postal code, try parsing comma-separated segments
  if (!result.city) {
    const segments = trimmed.split(',').map((s) => s.trim());
    // Typically: [street, postalCity, country] or [street, city]
    if (segments.length >= 2) {
      // Take last segment that is not a country name
      const countryNames = [
        'nederland',
        'netherlands',
        'belgi\u00eb',
        'belgique',
        'belgium',
        'nl',
        'be',
      ];
      for (let i = segments.length - 1; i >= 1; i--) {
        if (!countryNames.includes(segments[i].toLowerCase())) {
          // This segment might be "1234 AB City" or just "City"
          const postalStrip = segments[i]
            .replace(/\d{4}\s?[A-Z]{2}/, '')
            .replace(/^\d{4}\s*/, '')
            .trim();
          if (postalStrip.length > 0) {
            result.city = postalStrip;
            break;
          }
        }
      }
    }
  }

  // --- Province (NL only) ---
  if ((isDutch || result.country === 'NL') && numericPostal) {
    const province = getProvinceFromPostalCode(numericPostal);
    if (province) {
      result.province = province;
    }
  }

  return result;
}
