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

Your job: Narrate what you see at each step. Be specific — reference actual elements, text, images, and layout from the HTML. Never give generic advice.

For each page, provide:
1. observations: 3-5 specific things you notice (quote actual text/elements)
2. issues: Problems hurting conversion (each with severity, category, one-sentence fix)
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
        content: `Store: ${storeUrl}
Current page: ${step.label} (${step.url})
Context: ${stepContext[step.name]}

Page HTML (trimmed):
${step.html?.slice(0, 30000) || "HTML not available"}
${step.error ? `\nNote: ${step.error}. Factor this into your analysis — do not report false findings based on incomplete cart data.` : ""}
Analyze this page. JSON only.`,
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

Your audit must be:
- SPECIFIC: Every finding references something concrete you observed
- ACTIONABLE: Every issue includes a one-sentence fix
- PRIORITIZED: Issues ranked by revenue impact
- HONEST: Acknowledge what's done well

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
        content: `Full audit for: ${storeUrl}\n\nBrowsing session:\n${stepSummaries}\n\nSynthesize into a comprehensive audit. Top 3 quickWins = highest impact, lowest effort. JSON only.`,
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
