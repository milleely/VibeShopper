"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type {
  AuditReport as AuditReportType,
  AuditIssue,
  CrawlStepName,
  StepCommentary,
  StepIssue,
} from "@/lib/types";
import type { ScreenshotData } from "@/lib/useStoreAnalysis";
import ScoreGauge from "@/components/ScoreGauge";

interface AuditReportProps {
  report: AuditReportType;
  screenshots: ScreenshotData[];
  commentaries: StepCommentary[];
  totalTime: number | null;
  onReset: () => void;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

const STEP_LABELS: Record<CrawlStepName, string> = {
  homepage: "Homepage",
  collections: "Collections",
  product: "Product",
  add_to_cart: "Add to Cart",
  cart: "Cart",
};

const SEVERITY_STYLES: Record<
  AuditIssue["severity"],
  { badge: string; border: string; bg: string }
> = {
  high: {
    badge: "bg-severity-high-bg text-severity-high-text",
    border: "border-l-severity-high-border",
    bg: "bg-severity-high-bg/40",
  },
  medium: {
    badge: "bg-severity-medium-bg text-severity-medium-text",
    border: "border-l-severity-medium-border",
    bg: "bg-severity-medium-bg/40",
  },
  low: {
    badge: "bg-severity-low-bg text-severity-low-text",
    border: "border-l-severity-low-border",
    bg: "bg-severity-low-bg/40",
  },
};

function SeverityBadge({ severity }: { severity: AuditIssue["severity"] | StepIssue["severity"] }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${SEVERITY_STYLES[severity].badge}`}
    >
      {severity}
    </span>
  );
}

function PagePill({ page }: { page: CrawlStepName }) {
  return (
    <span className="inline-block rounded-full bg-bg-app px-2.5 py-0.5 text-xs font-medium text-text-secondary">
      {STEP_LABELS[page]}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-text-secondary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Lightbox                                                          */
/* ------------------------------------------------------------------ */

function ScreenshotLightbox({
  screenshot,
  onClose,
}: {
  screenshot: ScreenshotData;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border-default px-5 py-3">
          <span className="text-sm font-semibold text-text-primary">
            {STEP_LABELS[screenshot.step]}
          </span>
          <span className="mr-8 truncate text-xs text-text-secondary">
            {screenshot.url}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary transition-colors hover:bg-bg-app hover:text-text-primary"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {/* Image */}
        <div className="overflow-auto" style={{ maxHeight: "calc(90vh - 52px)" }}>
          <img
            src={`data:image/png;base64,${screenshot.screenshot}`}
            alt={`Full screenshot of ${STEP_LABELS[screenshot.step]} page`}
            className="block w-full"
          />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Audit Sub-components                                              */
/* ------------------------------------------------------------------ */

function IssueCard({
  issue,
  screenshot,
  onScreenshotClick,
}: {
  issue: AuditIssue;
  screenshot?: ScreenshotData;
  onScreenshotClick?: (s: ScreenshotData) => void;
}) {
  const styles = SEVERITY_STYLES[issue.severity];

  return (
    <div
      className={`rounded-lg border border-border-default border-l-[3px] ${styles.border} ${styles.bg} p-4`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <h4 className="text-sm font-bold text-text-primary">{issue.title}</h4>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-text-secondary">
        {issue.description}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-text-secondary">
        <span className="font-semibold text-text-primary">Recommended fix: </span>
        {issue.fix}
      </p>
      <div className="flex items-center gap-2.5">
        {screenshot && onScreenshotClick ? (
          <button
            type="button"
            onClick={() => onScreenshotClick(screenshot)}
            className="flex items-center gap-2.5 cursor-zoom-in group"
          >
            <img
              src={`data:image/png;base64,${screenshot.screenshot}`}
              alt={STEP_LABELS[issue.page]}
              className="h-10 w-[30px] rounded border border-border-default object-cover object-top transition-shadow group-hover:shadow-md"
            />
            <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
              {STEP_LABELS[issue.page]}
            </span>
          </button>
        ) : (
          <PagePill page={issue.page} />
        )}
      </div>
    </div>
  );
}

function QuickWinCard({
  issue,
  screenshot,
  onScreenshotClick,
}: {
  issue: AuditIssue;
  screenshot?: ScreenshotData;
  onScreenshotClick?: (s: ScreenshotData) => void;
}) {
  const styles = SEVERITY_STYLES[issue.severity];

  return (
    <div className="flex flex-col justify-between rounded-xl border border-border-default bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
      <div>
        <div className="mb-3">
          <SeverityBadge severity={issue.severity} />
        </div>
        <h4 className="mb-2 text-[15px] font-bold text-text-primary">
          {issue.title}
        </h4>
        <p className="mb-3 text-sm leading-relaxed text-text-secondary">
          {issue.description}
        </p>
        <div
          className={`mb-4 rounded-lg ${styles.bg} border-l-[3px] ${styles.border} px-3 py-2`}
        >
          <p className="text-sm leading-relaxed text-text-secondary">
            <span className="font-semibold text-text-primary">Fix: </span>
            {issue.fix}
          </p>
        </div>
      </div>
      <div className="mt-auto pt-1">
        {screenshot && onScreenshotClick ? (
          <button
            type="button"
            onClick={() => onScreenshotClick(screenshot)}
            className="flex items-center gap-2.5 cursor-zoom-in group"
          >
            <img
              src={`data:image/png;base64,${screenshot.screenshot}`}
              alt={STEP_LABELS[issue.page]}
              className="h-10 w-[30px] rounded border border-border-default object-cover object-top transition-shadow group-hover:shadow-md"
            />
            <span className="text-xs font-medium text-text-secondary group-hover:text-text-primary transition-colors">
              {STEP_LABELS[issue.page]}
            </span>
          </button>
        ) : (
          <PagePill page={issue.page} />
        )}
      </div>
    </div>
  );
}

function CategorySection({
  category,
  isOpen,
  onToggle,
  screenshotMap,
  onScreenshotClick,
}: {
  category: AuditReportType["categories"][number];
  isOpen: boolean;
  onToggle: () => void;
  screenshotMap: Map<CrawlStepName, ScreenshotData>;
  onScreenshotClick: (s: ScreenshotData) => void;
}) {
  return (
    <div className="rounded-xl border border-border-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-bg-app/50"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-text-primary">
            {category.label}
          </h3>
          <span className="rounded-full bg-bg-app px-2.5 py-0.5 text-xs font-semibold text-text-secondary">
            {category.issues.length} issue{category.issues.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ScoreGauge score={category.score} size="sm" />
          <ChevronIcon open={isOpen} />
        </div>
      </button>

      {isOpen && category.issues.length > 0 && (
        <div className="border-t border-border-default px-5 pb-5 pt-4">
          <div className="flex flex-col gap-3">
            {category.issues.map((issue) => (
              <IssueCard
                key={issue.id}
                issue={issue}
                screenshot={screenshotMap.get(issue.page)}
                onScreenshotClick={onScreenshotClick}
              />
            ))}
          </div>
        </div>
      )}

      {isOpen && category.issues.length === 0 && (
        <div className="border-t border-border-default px-5 py-6 text-center">
          <p className="text-sm text-text-secondary">
            No issues found in this category. Great work!
          </p>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Browsing Session View                                             */
/* ------------------------------------------------------------------ */

function BrowsingSessionView({
  screenshots,
  commentaries,
  onScreenshotClick,
}: {
  screenshots: ScreenshotData[];
  commentaries: StepCommentary[];
  onScreenshotClick: (s: ScreenshotData) => void;
}) {
  const commentaryMap = new Map(commentaries.map((c) => [c.step, c]));

  return (
    <div className="space-y-6">
      {screenshots.map((s) => {
        const commentary = commentaryMap.get(s.step);
        return (
          <div
            key={s.step}
            className="rounded-xl border border-border-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.07)] overflow-hidden"
          >
            {/* Step header */}
            <div className="border-b border-border-default bg-[#fafafa] px-5 py-3">
              <h3 className="text-sm font-bold text-text-primary">
                {STEP_LABELS[s.step]}
              </h3>
              <p className="mt-0.5 truncate text-xs text-text-secondary">{s.url}</p>
            </div>

            {/* Split: screenshot left, commentary right */}
            <div className="flex flex-col md:flex-row">
              {/* Screenshot */}
              <div className="md:w-3/5 border-b md:border-b-0 md:border-r border-border-default">
                <button
                  type="button"
                  onClick={() => onScreenshotClick(s)}
                  className="block w-full cursor-zoom-in"
                >
                  <img
                    src={`data:image/png;base64,${s.screenshot}`}
                    alt={`Screenshot of ${STEP_LABELS[s.step]} page`}
                    className="w-full h-auto block"
                    loading="lazy"
                  />
                </button>
              </div>

              {/* Commentary */}
              <div className="md:w-2/5 p-5 space-y-4">
                {commentary ? (
                  <>
                    {/* Narrative */}
                    {commentary.narrative && (
                      <p className="text-sm italic text-text-secondary leading-relaxed">
                        {commentary.narrative}
                      </p>
                    )}

                    {/* Observations */}
                    {commentary.observations.length > 0 && (
                      <div>
                        <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                          Observations
                        </h4>
                        <ul className="space-y-1 pl-4 text-sm text-text-primary list-disc marker:text-text-disabled">
                          {commentary.observations.map((obs, i) => (
                            <li key={i}>{obs}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Issues */}
                    {commentary.issues.length > 0 && (
                      <div>
                        <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                          Issues Found
                        </h4>
                        <ul className="space-y-2">
                          {commentary.issues.map((issue, i) => (
                            <li key={i} className="space-y-0.5">
                              <div className="flex items-start gap-2">
                                <SeverityBadge severity={issue.severity} />
                                <span className="text-sm text-text-primary">
                                  {issue.description}
                                </span>
                              </div>
                              {issue.fix && (
                                <p className="pl-14 text-xs text-text-secondary">
                                  Fix: {issue.fix}
                                </p>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Positives */}
                    {commentary.positives.length > 0 && (
                      <div>
                        <h4 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                          What&apos;s Working
                        </h4>
                        <ul className="space-y-1 text-sm text-text-primary">
                          {commentary.positives.map((pos, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="mt-0.5 shrink-0 text-primary">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-4 w-4">
                                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                                </svg>
                              </span>
                              <span>{pos}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-text-disabled">No commentary available for this step.</p>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screenshot Strip (with lightbox click)                            */
/* ------------------------------------------------------------------ */

function ScreenshotStrip({
  screenshots,
  onScreenshotClick,
}: {
  screenshots: ScreenshotData[];
  onScreenshotClick: (s: ScreenshotData) => void;
}) {
  if (screenshots.length === 0) return null;

  const visible = screenshots.slice(0, 5);

  return (
    <section>
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
        Browsing Session Screenshots
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {visible.map((s) => (
          <button
            key={s.step}
            type="button"
            onClick={() => onScreenshotClick(s)}
            className="overflow-hidden rounded-xl border border-border-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.07)] text-left cursor-zoom-in transition-shadow hover:shadow-md"
          >
            <img
              src={`data:image/png;base64,${s.screenshot}`}
              alt={`Screenshot of ${STEP_LABELS[s.step]} page`}
              className="aspect-[9/16] w-full object-cover object-top"
              loading="lazy"
            />
            <div className="px-3 py-2 text-center">
              <span className="text-xs font-semibold text-text-secondary">
                {STEP_LABELS[s.step]}
              </span>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                    */
/* ------------------------------------------------------------------ */

export default function AuditReport({
  report,
  screenshots,
  commentaries,
  totalTime,
  onReset,
}: AuditReportProps) {
  const [activeTab, setActiveTab] = useState<"report" | "session">("report");
  const [openCategories, setOpenCategories] = useState<Record<string, boolean>>({});
  const [lightbox, setLightbox] = useState<ScreenshotData | null>(null);

  const toggleCategory = (category: string) => {
    setOpenCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  const openLightbox = useCallback((s: ScreenshotData) => setLightbox(s), []);
  const closeLightbox = useCallback(() => setLightbox(null), []);

  const screenshotMap = useMemo(
    () => new Map(screenshots.map((s) => [s.step, s])),
    [screenshots]
  );

  return (
    <div className="max-w-[1200px] mx-auto px-4 py-8">
      {/* Lightbox */}
      {lightbox && (
        <ScreenshotLightbox screenshot={lightbox} onClose={closeLightbox} />
      )}

      {/* ------- 1. Header Row ------- */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold text-text-primary sm:text-3xl">
            {report.storeName}
          </h1>
          <p className="mt-1 truncate text-sm text-text-secondary">
            {report.storeUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {totalTime !== null && (
            <span className="text-sm text-text-secondary">
              Completed in {(totalTime / 1000).toFixed(1)}s
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-border-default bg-white px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-[#f6f6f6]"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* ------- Tab Toggle ------- */}
      <div className="mb-8 flex gap-1 rounded-lg border border-border-default bg-bg-app p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "report"
              ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Audit Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("session")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "session"
              ? "bg-white text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Browsing Session
        </button>
      </div>

      {/* ------- Browsing Session Tab ------- */}
      {activeTab === "session" && (
        <BrowsingSessionView
          screenshots={screenshots}
          commentaries={commentaries}
          onScreenshotClick={openLightbox}
        />
      )}

      {/* ------- Audit Report Tab ------- */}
      {activeTab === "report" && (
        <>
          {/* Score + Narrative */}
          <div className="mb-8 rounded-xl border border-border-default bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.07)] sm:p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <div className="shrink-0">
                <ScoreGauge score={report.overallScore} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                  AI Shopper Narrative
                </h2>
                <blockquote className="rounded-lg border-l-[3px] border-l-primary bg-severity-low-bg/30 px-5 py-4">
                  <p className="text-sm italic leading-relaxed text-text-primary">
                    {report.shopperNarrative}
                  </p>
                </blockquote>
              </div>
            </div>
          </div>

          {/* Quick Wins */}
          {report.quickWins.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                Quick Wins &mdash; Highest Impact, Lowest Effort
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {report.quickWins.slice(0, 3).map((issue) => (
                  <QuickWinCard
                    key={issue.id}
                    issue={issue}
                    screenshot={screenshotMap.get(issue.page)}
                    onScreenshotClick={openLightbox}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Category Breakdown */}
          <section className="mb-8">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
              Detailed Category Breakdown
            </h2>
            <div className="flex flex-col gap-4">
              {report.categories.map((cat) => (
                <CategorySection
                  key={cat.category}
                  category={cat}
                  isOpen={!!openCategories[cat.category]}
                  onToggle={() => toggleCategory(cat.category)}
                  screenshotMap={screenshotMap}
                  onScreenshotClick={openLightbox}
                />
              ))}
            </div>
          </section>

          {/* Screenshot Strip */}
          <ScreenshotStrip screenshots={screenshots} onScreenshotClick={openLightbox} />

          {/* Footer CTA */}
          <div className="mt-10 rounded-xl border border-border-default bg-white p-8 text-center shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
            <p className="mb-4 text-sm text-text-secondary">
              Want to improve your score? Run another analysis after making changes.
            </p>
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:bg-primary-pressed"
            >
              New Analysis
            </button>
          </div>
        </>
      )}
    </div>
  );
}
