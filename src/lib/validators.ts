export interface ValidationResult {
  isValid: boolean;
  isShopify: boolean;
  normalizedUrl: string;
  storeName?: string;
  error?: string;
}

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

  try {
    const response = await fetch(`${url}/products.json?limit=1`, {
      method: "GET",
      headers: { "User-Agent": "StorefrontSimulator/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        isValid: true,
        isShopify: false,
        normalizedUrl: url,
        error: "This doesn't appear to be a Shopify store",
      };
    }

    const data = await response.json();

    if (!data.products || !Array.isArray(data.products)) {
      return {
        isValid: true,
        isShopify: false,
        normalizedUrl: url,
        error: "This doesn't appear to be a Shopify store",
      };
    }

    let storeName: string | undefined;
    try {
      const homeResponse = await fetch(url, {
        headers: { "User-Agent": "StorefrontSimulator/1.0" },
        signal: AbortSignal.timeout(5000),
      });
      const html = await homeResponse.text();
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      if (titleMatch) {
        storeName = titleMatch[1].trim();
      }
    } catch {
      // Non-critical
    }

    return { isValid: true, isShopify: true, normalizedUrl: url, storeName };
  } catch (err) {
    return {
      isValid: true,
      isShopify: false,
      normalizedUrl: url,
      error: err instanceof Error ? err.message : "Could not reach the store",
    };
  }
}
