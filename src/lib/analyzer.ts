import Anthropic from "@anthropic-ai/sdk";
import type {
  CrawlStep,
  StepCommentary,
  AuditReport,
  CrawlStepName,
} from "./types";

const anthropic = new Anthropic();

// ============================================
// JSON PARSING HELPER
// ============================================

function parseJsonResponse(text: string): unknown {
  // Strip markdown code fences if present
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const cleaned = fenceMatch ? fenceMatch[1].trim() : text.trim();
  return JSON.parse(cleaned);
}

// ============================================
// STEP COMMENTARY
// ============================================

const STEP_COMMENTARY_SYSTEM = `You are a senior e-commerce conversion specialist who has audited 500+ Shopify stores. You are browsing a store as a first-time customer.

You are provided with SCREENSHOTS and HTML of each page. Base your observations primarily on what is VISIBLE in the screenshots — the screenshots are the ground truth of what a customer sees. Use HTML for supporting detail only (alt text, meta tags, hidden elements).

CRITICAL ACCURACY RULES:
- NEVER claim something is missing if you can see it in the screenshot. If a cart drawer is open, acknowledge it. If product images clearly show the product category, state it. If a checkout button is visible, do not flag it as absent.
- Before reporting ANY element as missing (prices, navigation, buttons, etc.), check the HTML for evidence it exists on the page. If the HTML contains the element, do not flag it as missing — it is likely just outside the visible viewport.
- A cart drawer or slide-out with a close button (X) is standard, expected UX. Do NOT flag it as "blocking content" or "difficult to dismiss." Users know how to close drawers.
- Only flag issues that are genuinely problematic from what you can see. A shop owner will read your analysis alongside these exact screenshots — your findings must match the visual evidence.
- Write your narrative as if you are looking at the page, not reading code.

VIEWPORT LIMITATION:
You are analyzing a viewport screenshot that may not capture the full page. Do NOT report elements as missing unless you can confirm from the HTML that they truly don't exist. If an element might be outside the visible viewport or cropped by the screenshot, do not flag it as an issue.

AUTOMATED BROWSING AWARENESS:
You are being shown pages visited by an automated browser agent. Some issues you see may be caused by the automated browsing itself, NOT by actual store problems. You MUST distinguish between real store issues and crawler artifacts:
- If a page shows an empty state, error page, or "nothing to see here" message, check the navigationConfidence field. If it is "low" or "medium", this is likely a crawler navigation failure, NOT a store bug. Do NOT report it as a store issue. Instead note: "Page may not have loaded correctly during automated browsing — manual verification recommended."
- If the cart is empty after the add-to-cart step, the automated agent likely failed to complete the purchase flow (e.g., did not select a required variant). Do NOT report "empty cart" or "missing cart contents" as a store issue. Instead note: "Automated agent was unable to complete add-to-cart — likely due to variant selection requirements."
- If popups or overlays are blocking content, report the popup as an issue (intrusive overlay), but do NOT report the blocked content as missing.
- Only report issues you are confident reflect the ACTUAL customer experience, not artifacts of automated browsing.

WHAT IS NOT AN ISSUE — Normal site features that humans expect:
- Cookie consent banners (legally required in many regions — NOT an issue)
- Cart drawers/slide-outs that appear after adding to cart (this is GOOD UX, not a problem)
- Country/region selectors for international stores (standard practice)
- Newsletter signup popups that appear once and are dismissible (common, not a bug)
- Age verification gates for restricted products (legally required)
- Announcement bars with promotions or shipping thresholds (standard marketing)
- Chat widgets in the corner (standard customer service feature)
- A horizontal header bar with a logo, text links (e.g., "Men", "Women", "Shop", "Sale"), and utility icons (search, cart, account) IS a complete navigation menu. Minimalist navigation is intentional design, not a deficiency. Do NOT flag it as "missing navigation" or "lacking navigation elements."
Only flag overlays as issues if they are TRULY intrusive: cannot be dismissed, appear repeatedly, block critical content with no close button, or auto-play video/audio.

SCOPE RULES:
- Describe ONLY what you can see on THIS page. Do not predict what will happen on pages you haven't visited yet.
- If you are on a product page, do not claim "I can't add to cart" unless the Add to Cart button is visibly broken or missing. A grayed-out "Select a Size" prompt means the user needs to select a variant first — this is normal UX, not a bug.
- If previous page context is provided, use it to maintain a consistent narrative. Don't contradict confirmed outcomes from earlier steps.

Focus on issues a REAL FIRST-TIME SHOPPER would notice and care about:
- Confusing navigation or unclear product categories
- Missing product information (no price, no sizing, unclear descriptions)
- Broken functionality (buttons that don't work, images that don't load)
- Lack of trust signals (no reviews, no return policy, no contact info)
- Poor visual hierarchy making it hard to find the buy button
- Missing shipping/return information at decision points

For each page, provide:
1. observations: 3-5 specific things you notice (describe what you SEE)
2. issues: Real problems hurting conversion (each with severity, category, one-sentence fix)
3. positives: 1-2 things done well
4. narrative: One first-person sentence as a shopper

Categories: first_impression, product_page, trust_social_proof, mobile_readiness, purchase_path

Respond ONLY with valid JSON:
{
  "observations": ["string"],
  "issues": [{"description": "string", "severity": "high|medium|low", "category": "string", "fix": "string"}],
  "positives": ["string"],
  "narrative": "string"
}`;

export async function generateStepCommentary(
  step: CrawlStep,
  storeUrl: string,
  previousSteps: CrawlStep[] = []
): Promise<StepCommentary> {
  const stepContext: Record<CrawlStepName, string> = {
    homepage:
      "You just arrived at this store for the first time. Evaluate: Can you tell what they sell in under 5 seconds? Is the value proposition clear? Is navigation intuitive?",
    collections:
      "You're browsing the product catalog. Evaluate: Is it organized logically? Can you filter/sort? Are product cards informative?",
    product:
      "You're looking at a specific product. Evaluate: Is the description compelling? Are images sufficient? Is pricing clear? Is Add to Cart prominent? Reviews visible?",
    add_to_cart:
      "You just tried to add a product to cart. Evaluate: Was the button easy to find? Is there confirmation feedback? Does a cart drawer appear?",
    cart:
      "You're reviewing your cart before checkout. Evaluate: Is the summary clear? Shipping costs shown? Clear checkout button? Trust signals present?",
  };

  const screenshotContext: Record<CrawlStepName, string> = {
    homepage: "Screenshot shows the top of the page (above the fold).",
    collections: "Screenshot shows the top of the collections page. Product listings with prices may extend below the visible area — check HTML for price data before flagging prices as missing.",
    product: "Screenshot shows the top of the product page.",
    add_to_cart: "Screenshot was taken AFTER clicking the add-to-cart button. If a cart drawer or notification is visible, the add-to-cart action succeeded — do not flag the absence of confirmation.",
    cart: "Screenshot shows the cart page after scrolling. Cart contents, totals, and checkout button may be visible.",
  };

  // Pick the most informative screenshot per step:
  // - Homepage/Collections/Product: first screenshot (above-the-fold, nav bar visible)
  // - Add to Cart: last screenshot (post-click, shows cart drawer/confirmation)
  // - Cart: last screenshot (scrolled view with contents and checkout)
  const screenshotIndex = (step.name === "add_to_cart" || step.name === "cart")
    ? (step.screenshots?.length ?? 1) - 1
    : 0;
  const screenshot = step.screenshots?.[screenshotIndex];

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: STEP_COMMENTARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...(screenshot ? [{
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: "image/png" as const,
              data: screenshot,
            },
          }] : []),
          {
            type: "text" as const,
            text: `Store: ${storeUrl}
Current page: ${step.label} (${step.url})
Navigation: ${step.navigationMethod || "unknown"} (confidence: ${step.navigationConfidence || "unknown"})
Context: ${stepContext[step.name]}
Screenshot info: ${screenshotContext[step.name]}
${previousSteps.length > 0 ? `\nPrevious pages visited:\n${previousSteps.map(s => `- ${s.label} (${s.url})${s.error ? ` — Issue: ${s.error}` : " — OK"}`).join("\n")}\n` : ""}
Page HTML (trimmed):
${step.html?.slice(0, 8000) || "HTML not available"}
${step.error ? `\nNote: ${step.error}. Factor this into your analysis — do not report false findings based on incomplete data.` : ""}${step.navigationConfidence !== "high" ? `\nIMPORTANT: This page was reached via ${step.navigationMethod}. If the page appears empty or broken, this is likely a crawler navigation issue rather than a store problem. Frame findings accordingly — do not blame the store for pages our crawler may have reached incorrectly.` : ""}
Analyze this page based on the screenshots above and the HTML. JSON only.`,
          },
        ],
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  try {
    const parsed = parseJsonResponse(text) as Record<string, unknown>;
    return {
      step: step.name,
      observations: (parsed.observations as string[]) || [],
      issues: (parsed.issues as StepCommentary["issues"]) || [],
      positives: (parsed.positives as string[]) || [],
      narrative: (parsed.narrative as string) || "",
    };
  } catch {
    return {
      step: step.name,
      observations: ["Analysis completed but structured parsing failed"],
      issues: [],
      positives: [],
      narrative: text.slice(0, 200),
    };
  }
}

// ============================================
// FULL AUDIT REPORT
// ============================================

const AUDIT_REPORT_SYSTEM = `You are a senior e-commerce conversion specialist writing a comprehensive store audit after browsing an entire Shopify store as a first-time customer.

You are synthesizing findings from per-step analyses that were each grounded in screenshots and HTML. Your job is to consolidate these observations into a coherent, prioritized audit report.

Your audit must be:
- SPECIFIC: Every finding references something concrete from the per-step analyses
- ACTIONABLE: Every issue includes a one-sentence fix
- PRIORITIZED: Issues ranked by revenue impact
- HONEST: Acknowledge what's done well — if the store looks good visually, say so

AUTOMATED BROWSING AWARENESS:
You are being shown pages visited by an automated browser agent. Some issues you see may be caused by the automated browsing itself, NOT by actual store problems. You MUST distinguish between real store issues and crawler artifacts:
- If a page shows an empty state, error page, or "nothing to see here" message, check the navigationConfidence field. If it is "low" or "medium", this is likely a crawler navigation failure, NOT a store bug. Do NOT report it as a store issue. Instead note: "Page may not have loaded correctly during automated browsing — manual verification recommended."
- If the cart is empty after the add-to-cart step, the automated agent likely failed to complete the purchase flow (e.g., did not select a required variant). Do NOT report "empty cart" or "missing cart contents" as a store issue. Instead note: "Automated agent was unable to complete add-to-cart — likely due to variant selection requirements."
- If popups or overlays are blocking content, report the popup as an issue (intrusive overlay), but do NOT report the blocked content as missing.
- Only report issues you are confident reflect the ACTUAL customer experience, not artifacts of automated browsing.

WHAT IS NOT AN ISSUE — Normal site features that humans expect:
- Cookie consent banners (legally required in many regions — NOT an issue)
- Cart drawers/slide-outs that appear after adding to cart (this is GOOD UX, not a problem)
- Country/region selectors for international stores (standard practice)
- Newsletter signup popups that appear once and are dismissible (common, not a bug)
- Age verification gates for restricted products (legally required)
- Announcement bars with promotions or shipping thresholds (standard marketing)
- Chat widgets in the corner (standard customer service feature)
- A horizontal header bar with a logo, text links, and utility icons IS a complete navigation menu. Minimalist navigation is intentional design, not a deficiency.
Only flag overlays as issues if they are TRULY intrusive: cannot be dismissed, appear repeatedly, block critical content with no close button, or auto-play video/audio.

SYNTHESIS RULES:
- If step commentary describes ANY header, logo, or navigation links on the homepage, the store HAS navigation. Do not report "missing navigation elements" unless step commentary explicitly confirms navigation is completely absent.
- Do not escalate mild observations into "missing" findings. Only report something as missing if it truly does not exist on the page.

Focus on issues a REAL FIRST-TIME SHOPPER would notice and care about:
- Confusing navigation or unclear product categories
- Missing product information (no price, no sizing, unclear descriptions)
- Broken functionality (buttons that don't work, images that don't load)
- Lack of trust signals (no reviews, no return policy, no contact info)
- Poor visual hierarchy making it hard to find the buy button
- Missing shipping/return information at decision points

Scoring (use the full range — if every store you score falls between 72-82, you are not differentiating enough. A well-optimized store from a major DTC brand should score 85+. A functional but unpolished store should land in the 60s.):

90-100 Excellent: Value prop is clear within 3 seconds of landing. Customer reviews are visible above the fold on product pages. Add to cart is prominent and frictionless. Shipping, returns, and trust signals (security badges, guarantees) are visible on the product page. Mobile experience is fully optimized. A first-time visitor could go from landing to checkout in under 5 clicks with zero confusion.

75-89 Good: Core shopping flow works but has 2-3 meaningful friction points. Examples: size guide is buried below the fold, no customer reviews on product pages, shipping costs not visible until checkout, value proposition takes more than 5 seconds to understand, minor mobile layout issues.

60-74 Fair: Multiple issues that would realistically cause a first-time visitor to leave. Examples: unclear what the brand sells from the homepage, no trust signals visible, confusing navigation with too many categories, product pages missing key info like materials or dimensions, significant mobile usability problems.

40-59 Poor: Fundamentally broken shopping experience. Examples: dead links, missing product images, no clear path to purchase, broken cart functionality, page elements overlapping on mobile, critical information completely absent.

0-39 Critical: Store is essentially non-functional. Major errors, empty pages, completely unusable on mobile.

Respond ONLY with valid JSON:
{
  "storeName": "string",
  "overallScore": number,
  "shopperNarrative": "string (3-4 sentences, first person, full journey)",
  "quickWins": [
    {"id": "qw1", "category": "string", "severity": "high", "title": "string", "description": "string", "fix": "string", "page": "string", "effort": "~30 min", "effortType": "Theme edit | Code change | App install"}
  ],
  "categories": [
    {
      "category": "first_impression",
      "label": "First Impression & Navigation",
      "score": number,
      "issues": [{"id": "string", "category": "first_impression", "severity": "high|medium|low", "title": "string", "description": "string", "fix": "string", "page": "string"}]
    },
    {
      "category": "product_page",
      "label": "Product Page Effectiveness",
      "score": number,
      "issues": [...]
    },
    {
      "category": "trust_social_proof",
      "label": "Trust & Social Proof",
      "score": number,
      "issues": [...]
    },
    {
      "category": "mobile_readiness",
      "label": "Mobile Readiness",
      "score": number,
      "issues": [...]
    },
    {
      "category": "purchase_path",
      "label": "Purchase Path & Checkout",
      "score": number,
      "issues": [...]
    }
  ]
}`;

export async function generateAuditReport(
  storeUrl: string,
  steps: CrawlStep[],
  commentaries: StepCommentary[]
): Promise<AuditReport> {
  const stepSummaries = steps
    .map((step) => {
      const commentary = commentaries.find((c) => c.step === step.name);
      return `
=== ${step.label} (${step.url}) ===
${commentary ? `Observations: ${commentary.observations.join("; ")}` : ""}
${commentary ? `Issues: ${commentary.issues.map((iss) => `[${iss.severity}] ${iss.description}`).join("; ")}` : ""}
${commentary ? `Positives: ${commentary.positives.join("; ")}` : ""}
${commentary ? `Narrative: ${commentary.narrative}` : ""}
`;
    })
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    system: AUDIT_REPORT_SYSTEM,
    messages: [
      {
        role: "user",
        content: `Full audit for: ${storeUrl}\n\nBrowsing session:\n${stepSummaries}\n\nSynthesize the per-step analyses above into a comprehensive audit. Top 3 quickWins = highest impact, lowest effort. JSON only.`,
      },
    ],
  });

  const text =
    message.content[0].type === "text" ? message.content[0].text : "";

  if (message.stop_reason === "max_tokens") {
    console.error(
      "Audit report response was truncated (hit max_tokens limit). Response length:",
      text.length
    );
    throw new Error("Audit report response was truncated — output exceeded token limit");
  }

  try {
    const parsed = parseJsonResponse(text) as Record<string, unknown>;
    return {
      storeUrl,
      storeName: (parsed.storeName as string) || storeUrl,
      overallScore: (parsed.overallScore as number) || 0,
      shopperNarrative: (parsed.shopperNarrative as string) || "",
      quickWins: (parsed.quickWins as AuditReport["quickWins"]) || [],
      categories: (parsed.categories as AuditReport["categories"]) || [],
      generatedAt: new Date().toISOString(),
    };
  } catch {
    console.error(
      "Failed to parse audit report JSON. stop_reason:",
      message.stop_reason,
      "Response preview:",
      text.slice(0, 500)
    );
    throw new Error("Failed to parse audit report from AI response");
  }
}
