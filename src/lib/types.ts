// ============================================
// Storefront Simulator — Core Types
// ============================================

export type CrawlStepName =
  | "homepage"
  | "collections"
  | "product"
  | "add_to_cart"
  | "cart";

export interface CrawlStep {
  name: CrawlStepName;
  label: string;
  description: string;
  url?: string;
  screenshots?: string[];
  html?: string;
  timestamp?: number;
  error?: string;
  navigationConfidence?: "high" | "medium" | "low";
  navigationMethod?: string;
}

export const CRAWL_STEPS: Omit<
  CrawlStep,
  "url" | "screenshots" | "html" | "timestamp" | "navigationConfidence" | "navigationMethod"
>[] = [
  {
    name: "homepage",
    label: "Landing on Homepage",
    description:
      "Arriving at the store for the first time — evaluating first impressions",
  },
  {
    name: "collections",
    label: "Browsing Collections",
    description:
      "Looking for products — evaluating navigation and discovery",
  },
  {
    name: "product",
    label: "Viewing a Product",
    description:
      "Examining a product page — evaluating purchase decision factors",
  },
  {
    name: "add_to_cart",
    label: "Adding to Cart",
    description:
      "Attempting to add a product — evaluating the conversion action",
  },
  {
    name: "cart",
    label: "Reviewing Cart",
    description:
      "Checking the cart — evaluating checkout readiness and friction",
  },
];

export interface StepCommentary {
  step: CrawlStepName;
  observations: string[];
  issues: StepIssue[];
  positives: string[];
  narrative: string;
}

export interface StepIssue {
  description: string;
  severity: "high" | "medium" | "low";
  category: AuditCategory;
  fix: string;
}

export type AuditCategory =
  | "first_impression"
  | "product_page"
  | "trust_social_proof"
  | "mobile_readiness"
  | "purchase_path";

export interface AuditIssue {
  id: string;
  category: AuditCategory;
  severity: "high" | "medium" | "low";
  title: string;
  description: string;
  fix: string;
  page: CrawlStepName;
}

export interface CategoryScore {
  category: AuditCategory;
  label: string;
  score: number;
  issues: AuditIssue[];
}

export interface AuditReport {
  storeUrl: string;
  storeName: string;
  overallScore: number;
  shopperNarrative: string;
  quickWins: AuditIssue[];
  categories: CategoryScore[];
  generatedAt: string;
}

export type SSEEvent =
  | {
      type: "step_start";
      data: { step: CrawlStepName; label: string; description: string };
    }
  | {
      type: "screenshot";
      data: { step: CrawlStepName; screenshot: string; url: string; index: number };
    }
  | { type: "commentary"; data: StepCommentary }
  | { type: "report"; data: AuditReport }
  | { type: "error"; data: { message: string; step?: CrawlStepName } }
  | { type: "done"; data: { totalTime: number } };
