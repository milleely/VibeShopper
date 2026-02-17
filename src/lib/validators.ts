export interface ValidationResult {
  isValid: boolean;
  isShopify: boolean;
  normalizedUrl: string;
  storeName?: string;
  error?: string;
}

const BROWSER_UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

/** Shopify fingerprints commonly found in the homepage HTML. */
const SHOPIFY_SIGNALS = [
  "cdn.shopify.com",
  "Shopify.theme",
  "shopify-section",
  "myshopify.com",
  "shopify-features",
  "Shopify.locale",
];

export async function validateShopifyUrl(
  input: string
): Promise<ValidationResult> {
  let url = input.trim();
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = `https://${url}`;
  }
  url = url.replace(/\/+$/, "");

  try {
    new URL(url);
  } catch {
    return {
      isValid: false,
      isShopify: false,
      normalizedUrl: url,
      error: "Invalid URL format",
    };
  }

  // ------------------------------------------------------------------
  // Strategy 1: Try /products.json (fast, definitive when it works)
  // ------------------------------------------------------------------
  let productsJsonWorked = false;
  try {
    const response = await fetch(`${url}/products.json?limit=1`, {
      method: "GET",
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.products && Array.isArray(data.products)) {
        productsJsonWorked = true;
      }
    }
  } catch {
    // Swallow — we'll try the HTML fallback
  }

  // ------------------------------------------------------------------
  // Strategy 2: Fetch homepage HTML and look for Shopify fingerprints
  // ------------------------------------------------------------------
  let storeName: string | undefined;
  let htmlIsShopify = false;

  try {
    const homeResponse = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA },
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });

    if (homeResponse.ok) {
      const html = await homeResponse.text();

      // Check for Shopify fingerprints
      htmlIsShopify = SHOPIFY_SIGNALS.some((signal) => html.includes(signal));

      // Extract store name from <title>
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        storeName = titleMatch[1].trim();
      }
    }
  } catch {
    // If we can't reach the homepage at all, fall through to error
  }

  const isShopify = productsJsonWorked || htmlIsShopify;

  if (isShopify) {
    return { isValid: true, isShopify: true, normalizedUrl: url, storeName };
  }

  return {
    isValid: true,
    isShopify: false,
    normalizedUrl: url,
    error: "This doesn't appear to be a Shopify store",
  };
}
