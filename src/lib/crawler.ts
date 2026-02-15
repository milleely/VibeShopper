import { chromium, type Browser, type Page } from "playwright";
import { type CrawlStep, type CrawlStepName, CRAWL_STEPS } from "./types";

export interface CrawlCallbacks {
  onStepStart: (
    step: CrawlStepName,
    label: string,
    description: string
  ) => void;
  onScreenshot: (
    step: CrawlStepName,
    screenshot: string,
    url: string,
    index: number
  ) => void;
  onStepComplete: (step: CrawlStep) => Promise<void> | void;
  onError: (step: CrawlStepName, error: string) => void;
}

export interface CrawlResult {
  steps: CrawlStep[];
  totalTime: number;
}

export async function crawlStore(
  storeUrl: string,
  callbacks: CrawlCallbacks
): Promise<CrawlResult> {
  const startTime = Date.now();
  const completedSteps: CrawlStep[] = [];
  let browser: Browser | undefined;

  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    const page = await context.newPage();
    page.setDefaultTimeout(15000);

    // Step 1: Homepage
    completedSteps.push(await crawlHomepage(page, storeUrl, callbacks));

    // Step 2: Collections
    completedSteps.push(await crawlCollections(page, storeUrl, callbacks));

    // Step 3: Product page
    completedSteps.push(await crawlProduct(page, storeUrl, callbacks));

    // Step 4: Add to cart
    completedSteps.push(await crawlAddToCart(page, callbacks));

    // Step 5: Cart
    completedSteps.push(await crawlCart(page, storeUrl, callbacks));

    await browser.close();
  } catch (err) {
    if (browser) await browser.close().catch(() => {});
    throw err;
  }

  return { steps: completedSteps, totalTime: Date.now() - startTime };
}

// --- Step implementations ---

/** Capture a screenshot, emit it via callback, and return the base64 data. */
async function captureAndEmit(
  page: Page,
  stepName: CrawlStepName,
  index: number,
  cb: CrawlCallbacks
): Promise<string> {
  const screenshot = await captureScreenshot(page);
  cb.onScreenshot(stepName, screenshot, page.url(), index);
  return screenshot;
}

async function crawlHomepage(
  page: Page,
  storeUrl: string,
  cb: CrawlCallbacks
): Promise<CrawlStep> {
  const stepDef = CRAWL_STEPS[0];
  cb.onStepStart("homepage", stepDef.label, stepDef.description);

  try {
    await page.goto(storeUrl, { waitUntil: "networkidle" });
    await dismissOverlays(page);

    const screenshots: string[] = [];
    screenshots.push(await captureAndEmit(page, "homepage", 0, cb));

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    screenshots.push(await captureAndEmit(page, "homepage", 1, cb));

    const html = await captureHtml(page);

    const step: CrawlStep = {
      ...stepDef,
      url: page.url(),
      screenshots,
      html,
      timestamp: Date.now(),
      navigationConfidence: "high",
      navigationMethod: `direct URL ${storeUrl}`,
    };
    await cb.onStepComplete(step);
    return step;
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Failed to load homepage";
    cb.onError("homepage", error);
    return { ...stepDef, error, timestamp: Date.now(), navigationConfidence: "low", navigationMethod: "navigation failed" };
  }
}

async function crawlCollections(
  page: Page,
  storeUrl: string,
  cb: CrawlCallbacks
): Promise<CrawlStep> {
  const stepDef = CRAWL_STEPS[1];
  cb.onStepStart("collections", stepDef.label, stepDef.description);

  try {
    const nav = await findCollectionsLink(page, storeUrl);
    await page.goto(nav.url, { waitUntil: "networkidle" });
    await dismissOverlays(page);

    const screenshots: string[] = [];
    screenshots.push(await captureAndEmit(page, "collections", 0, cb));

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    screenshots.push(await captureAndEmit(page, "collections", 1, cb));

    const html = await captureHtml(page);
    const confidence = detectEmptyState(html) ? "low" as const : nav.confidence;

    const step: CrawlStep = {
      ...stepDef,
      url: page.url(),
      screenshots,
      html,
      timestamp: Date.now(),
      navigationConfidence: confidence,
      navigationMethod: nav.method,
    };
    await cb.onStepComplete(step);
    return step;
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Failed to load collections";
    cb.onError("collections", error);
    return { ...stepDef, error, timestamp: Date.now(), navigationConfidence: "low", navigationMethod: "navigation failed" };
  }
}

async function crawlProduct(
  page: Page,
  storeUrl: string,
  cb: CrawlCallbacks
): Promise<CrawlStep> {
  const stepDef = CRAWL_STEPS[2];
  cb.onStepStart("product", stepDef.label, stepDef.description);

  try {
    const nav = await findProductLink(page, storeUrl);
    await page.goto(nav.url, { waitUntil: "networkidle" });
    await dismissOverlays(page);

    const screenshots: string[] = [];
    screenshots.push(await captureAndEmit(page, "product", 0, cb));

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    screenshots.push(await captureAndEmit(page, "product", 1, cb));

    // Scroll further to see reviews / additional details
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    screenshots.push(await captureAndEmit(page, "product", 2, cb));

    const html = await captureHtml(page);
    const confidence = detectEmptyState(html) ? "low" as const : nav.confidence;

    const step: CrawlStep = {
      ...stepDef,
      url: page.url(),
      screenshots,
      html,
      timestamp: Date.now(),
      navigationConfidence: confidence,
      navigationMethod: nav.method,
    };
    await cb.onStepComplete(step);
    return step;
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Failed to load product page";
    cb.onError("product", error);
    return { ...stepDef, error, timestamp: Date.now(), navigationConfidence: "low", navigationMethod: "navigation failed" };
  }
}

async function crawlAddToCart(
  page: Page,
  cb: CrawlCallbacks
): Promise<CrawlStep> {
  const stepDef = CRAWL_STEPS[3];
  cb.onStepStart("add_to_cart", stepDef.label, stepDef.description);

  try {
    const screenshots: string[] = [];

    // Scroll back to top to see the add-to-cart button area
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);

    await selectVariant(page);
    screenshots.push(await captureAndEmit(page, "add_to_cart", 0, cb));

    const addToCartButton = await findAddToCartButton(page);

    let cartVerified = false;
    if (addToCartButton) {
      await addToCartButton.click();
      await page.waitForTimeout(2000);
      cartVerified = await verifyCartUpdate(page);
    }

    await dismissOverlays(page);
    screenshots.push(await captureAndEmit(page, "add_to_cart", 1, cb));

    const html = await captureHtml(page);

    const step: CrawlStep = {
      ...stepDef,
      url: page.url(),
      screenshots,
      html,
      timestamp: Date.now(),
      navigationConfidence: "high",
      navigationMethod: "action on current product page",
      ...(!cartVerified ? { error: "add-to-cart attempted but could not be verified" } : {}),
    };
    await cb.onStepComplete(step);
    return step;
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Failed to add to cart";
    cb.onError("add_to_cart", error);
    return { ...stepDef, error, timestamp: Date.now(), navigationConfidence: "low", navigationMethod: "navigation failed" };
  }
}

async function crawlCart(
  page: Page,
  storeUrl: string,
  cb: CrawlCallbacks
): Promise<CrawlStep> {
  const stepDef = CRAWL_STEPS[4];
  cb.onStepStart("cart", stepDef.label, stepDef.description);

  try {
    await page.goto(`${storeUrl}/cart`, { waitUntil: "networkidle" });
    await dismissOverlays(page);

    const screenshots: string[] = [];
    screenshots.push(await captureAndEmit(page, "cart", 0, cb));

    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(500);
    screenshots.push(await captureAndEmit(page, "cart", 1, cb));

    const html = await captureHtml(page);

    const step: CrawlStep = {
      ...stepDef,
      url: page.url(),
      screenshots,
      html,
      timestamp: Date.now(),
      navigationConfidence: "high",
      navigationMethod: "direct URL /cart",
    };
    await cb.onStepComplete(step);
    return step;
  } catch (err) {
    const error = err instanceof Error ? err.message : "Failed to load cart";
    cb.onError("cart", error);
    return { ...stepDef, error, timestamp: Date.now(), navigationConfidence: "low", navigationMethod: "navigation failed" };
  }
}

// --- Helpers ---

async function captureScreenshot(page: Page): Promise<string> {
  const buffer = await page.screenshot({ fullPage: false, type: "png" });
  return buffer.toString("base64");
}

async function captureHtml(page: Page): Promise<string> {
  const html = await page.content();
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  const body = bodyMatch ? bodyMatch[1] : html;

  const cleaned = body
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned.slice(0, 50000);
}

function detectEmptyState(html: string): boolean {
  const lower = html.toLowerCase();
  const emptyPatterns = [
    "nothing to see here",
    "no products found",
    "page not found",
    "404",
    "no results",
    "empty collection",
    "uh-oh",
    "doesn\u2019t exist",
    "doesn't exist",
    "not available",
  ];
  return emptyPatterns.some((p) => lower.includes(p));
}

async function dismissOverlays(page: Page): Promise<void> {
  const selectors = [
    // Cookie / consent banners
    '[class*="cookie"] button',
    '[id*="cookie"] button',
    '[class*="consent"] button',
    'button:has-text("Accept")',
    'button:has-text("Got it")',
    'button:has-text("I agree")',
    // Geo-redirect modals
    '[class*="shipping"] button',
    '[class*="geo"] button',
    'button:has-text("US")',
    'button:has-text("United States")',
    // Popup / modal close buttons
    '[class*="popup"] button[class*="close"]',
    '[class*="modal"] button[class*="close"]',
    '[aria-label="Close"]',
    'button[class*="dismiss"]',
  ];

  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1000 })) {
        await btn.click();
        await page.waitForTimeout(500);
      }
    } catch {
      // Try next
    }
  }
}

interface NavResult {
  url: string;
  method: string;
  confidence: "high" | "medium" | "low";
}

async function findCollectionsLink(
  page: Page,
  storeUrl: string
): Promise<NavResult> {
  const navPatterns = [
    'nav a[href*="collection"]',
    'header a[href*="collection"]',
    'nav a[href*="/shop"]',
    'header a[href*="/shop"]',
    'a[href*="/collections/all"]',
  ];

  for (const selector of navPatterns) {
    try {
      const link = page.locator(selector).first();
      if (await link.isVisible({ timeout: 1000 })) {
        const href = await link.getAttribute("href");
        if (href) {
          const url = href.startsWith("http") ? href : `${storeUrl}${href}`;
          return { url, method: `clicked nav link to ${href}`, confidence: "high" };
        }
      }
    } catch {
      // Try next
    }
  }

  return { url: `${storeUrl}/collections/all`, method: "fallback to /collections/all", confidence: "medium" };
}

async function findProductLink(
  page: Page,
  storeUrl: string
): Promise<NavResult> {
  try {
    const productLink = page.locator('a[href*="/products/"]').first();
    if (await productLink.isVisible({ timeout: 2000 })) {
      const href = await productLink.getAttribute("href");
      if (href) {
        const url = href.startsWith("http") ? href : `${storeUrl}${href}`;
        return { url, method: `clicked product link to ${href}`, confidence: "high" };
      }
    }
  } catch {
    // Fall through
  }

  try {
    const response = await page
      .context()
      .request.get(`${storeUrl}/products.json?limit=1`);
    const data = await response.json();
    if (data.products?.[0]?.handle) {
      const handle = data.products[0].handle;
      return { url: `${storeUrl}/products/${handle}`, method: `fallback to /products.json API (${handle})`, confidence: "medium" };
    }
  } catch {
    // Fall through
  }

  throw new Error("Could not find any product pages");
}

async function selectVariant(page: Page): Promise<void> {
  // Click-based selectors (buttons, radio labels)
  const clickSelectors = [
    '[class*="size"] button',
    '.product-form__input input[type="radio"]',
    '[name*="option"] + label',
    '[data-option-index] button',
  ];

  for (const selector of clickSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 })) {
        await el.click();
        await page.waitForTimeout(500);
        return;
      }
    } catch {
      // Try next
    }
  }

  // Dropdown selectors — select second option (first is often "Select...")
  try {
    const select = page.locator('select[name*="option"]').first();
    if (await select.isVisible({ timeout: 1000 })) {
      const options = await select.locator("option").all();
      if (options.length > 1) {
        const value = await options[1].getAttribute("value");
        if (value) {
          await select.selectOption(value);
          await page.waitForTimeout(500);
          return;
        }
      }
    }
  } catch {
    // No dropdown found
  }
}

async function verifyCartUpdate(page: Page): Promise<boolean> {
  // Check for cart count badge with non-zero value
  const countSelectors = [
    '[class*="cart-count"]',
    '[class*="cart-icon-bubble"]',
    '[data-cart-count]',
  ];

  for (const selector of countSelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 })) {
        const text = (await el.textContent())?.trim() ?? "";
        if (text && text !== "0") return true;
      }
    } catch {
      // Try next
    }
  }

  // Check for cart drawer / notification appearing
  const visibilitySelectors = [
    '[class*="cart-drawer"]',
    '[class*="cart-notification"]',
    '[class*="side-cart"]',
    '[class*="success"]',
    '[class*="added"]',
  ];

  for (const selector of visibilitySelectors) {
    try {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 })) return true;
    } catch {
      // Try next
    }
  }

  return false;
}

async function findAddToCartButton(page: Page) {
  const selectors = [
    'button[name="add"]',
    'button[type="submit"][class*="add"]',
    'button:has-text("Add to cart")',
    'button:has-text("Add to Cart")',
    'button:has-text("Add to bag")',
    'input[type="submit"][value*="Add"]',
    '[data-action="add-to-cart"]',
    ".product-form__submit",
    "#AddToCart",
    "#add-to-cart",
  ];

  for (const selector of selectors) {
    try {
      const btn = page.locator(selector).first();
      if (await btn.isVisible({ timeout: 1500 })) {
        return btn;
      }
    } catch {
      // Try next
    }
  }

  return null;
}
