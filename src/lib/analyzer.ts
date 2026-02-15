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
- Only flag issues that are genuinely problematic from what you can see. A shop owner will read your analysis alongside these exact screenshots — your findings must match the visual evidence.
- Write your narrative as if you are looking at the page, not reading code.

AUTOMATED BROWSING AWARENESS:
You are being shown pages visited by an automated browser agent. Some issues you see may be caused by the automated browsing itself, NOT by actual store problems. You MUST distinguish between real store issues and crawler artifacts:
- If a page shows an empty state, error page, or "nothing to see here" message, check the navigationConfidence field. If it is "low" or "medium", this is likely a crawler navigation failure, NOT a store bug. Do NOT report it as a store issue. Instead note: "Page may not have loaded correctly during automated browsing — manual verification recommended."
- If the cart is empty after the add-to-cart step, the automated agent likely failed to complete the purchase flow (e.g., did not select a required variant). Do NOT report "empty cart" or "missing cart contents" as a store issue. Instead note: "Automated agent was unable to complete add-to-cart — likely due to variant selection requirements."
- If popups or overlays are blocking content, report the popup as an issue (intrusive overlay), but do NOT report the blocked content as missing.
- Only report issues you are confident reflect the ACTUAL customer experience, not artifacts of automated browsing.

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
  storeUrl: string
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

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    system: STEP_COMMENTARY_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...(step.screenshots ?? []).map((s) => ({
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: "image/png" as const,
              data: s,
            },
          })),
          {
            type: "text" as const,
            text: `Store: ${storeUrl}
Current page: ${step.label} (${step.url})
Navigation: ${step.navigationMethod || "unknown"} (confidence: ${step.navigationConfidence || "unknown"})
Context: ${stepContext[step.name]}

Page HTML (trimmed):
${step.html?.slice(0, 20000) || "HTML not available"}
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

You are provided with screenshots from each page of the browsing session. Base your audit on what you can SEE in the screenshots combined with the HTML analysis. Your findings must be visually verifiable — a shop owner will see these screenshots alongside your report. Never contradict what is clearly visible in the images.

Your audit must be:
- SPECIFIC: Every finding references something concrete you observed in the screenshots or HTML
- ACTIONABLE: Every issue includes a one-sentence fix
- PRIORITIZED: Issues ranked by revenue impact
- HONEST: Acknowledge what's done well — if the store looks good visually, say so

AUTOMATED BROWSING AWARENESS:
You are being shown pages visited by an automated browser agent. Some issues you see may be caused by the automated browsing itself, NOT by actual store problems. You MUST distinguish between real store issues and crawler artifacts:
- If a page shows an empty state, error page, or "nothing to see here" message, check the navigationConfidence field. If it is "low" or "medium", this is likely a crawler navigation failure, NOT a store bug. Do NOT report it as a store issue. Instead note: "Page may not have loaded correctly during automated browsing — manual verification recommended."
- If the cart is empty after the add-to-cart step, the automated agent likely failed to complete the purchase flow (e.g., did not select a required variant). Do NOT report "empty cart" or "missing cart contents" as a store issue. Instead note: "Automated agent was unable to complete add-to-cart — likely due to variant selection requirements."
- If popups or overlays are blocking content, report the popup as an issue (intrusive overlay), but do NOT report the blocked content as missing.
- Only report issues you are confident reflect the ACTUAL customer experience, not artifacts of automated browsing.

Scoring: 90-100 Excellent, 75-89 Good, 60-74 Fair, 40-59 Poor, 0-39 Critical

Respond ONLY with valid JSON:
{
  "storeName": "string",
  "overallScore": number,
  "shopperNarrative": "string (3-4 sentences, first person, full journey)",
  "quickWins": [
    {"id": "qw1", "category": "string", "severity": "high", "title": "string", "description": "string", "fix": "string", "page": "string"}
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
    .map((step, i) => {
      const commentary = commentaries[i];
      return `
=== ${step.label} (${step.url}) ===
${commentary ? `Observations: ${commentary.observations.join("; ")}` : ""}
${commentary ? `Issues: ${commentary.issues.map((iss) => `[${iss.severity}] ${iss.description}`).join("; ")}` : ""}
${commentary ? `Positives: ${commentary.positives.join("; ")}` : ""}
HTML excerpt: ${step.html?.slice(0, 15000) || "Not available"}
`;
    })
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    system: AUDIT_REPORT_SYSTEM,
    messages: [
      {
        role: "user",
        content: [
          ...steps.flatMap((step) => {
            const lastScreenshot = step.screenshots?.[step.screenshots.length - 1];
            if (!lastScreenshot) return [];
            return [
              {
                type: "image" as const,
                source: {
                  type: "base64" as const,
                  media_type: "image/png" as const,
                  data: lastScreenshot,
                },
              },
            ];
          }),
          {
            type: "text" as const,
            text: `Full audit for: ${storeUrl}\n\nBrowsing session:\n${stepSummaries}\n\nThe screenshots above show each page in order. Synthesize into a comprehensive audit. Top 3 quickWins = highest impact, lowest effort. JSON only.`,
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
      storeUrl,
      storeName: (parsed.storeName as string) || storeUrl,
      overallScore: (parsed.overallScore as number) || 0,
      shopperNarrative: (parsed.shopperNarrative as string) || "",
      quickWins: (parsed.quickWins as AuditReport["quickWins"]) || [],
      categories: (parsed.categories as AuditReport["categories"]) || [],
      generatedAt: new Date().toISOString(),
    };
  } catch {
    throw new Error("Failed to parse audit report from AI response");
  }
}
