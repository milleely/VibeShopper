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
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl bg-bg-surface shadow-2xl"
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
  isFirst,
  screenshot,
  onScreenshotClick,
}: {
  issue: AuditIssue;
  isFirst?: boolean;
  screenshot?: ScreenshotData;
  onScreenshotClick?: (s: ScreenshotData) => void;
}) {
  const styles = SEVERITY_STYLES[issue.severity];

  return (
    <div
      className={`flex flex-col justify-between rounded-xl p-5 shadow-[0_1px_2px_rgba(0,0,0,0.07)] transition-all hover:shadow-md hover:-translate-y-px ${
        isFirst
          ? "border-[1.5px] border-severity-high-text bg-gradient-to-b from-white from-85% to-[#fef5f5]"
          : "border border-border-default bg-bg-surface"
      }`}
    >
      <div>
        {isFirst && (
          <div className="mb-2">
            <span className="inline-block rounded bg-severity-high-bg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-severity-high-text">
              ★ Fix this first
            </span>
          </div>
        )}
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
          className={`mb-4 rounded-lg ${styles.bg} border-l-[3px] ${styles.border} px-3 py-2.5`}
        >
          <p className="text-[13px] leading-relaxed text-text-secondary">
            <span className="font-semibold text-text-primary">Fix: </span>
            {issue.fix}
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        {screenshot && onScreenshotClick ? (
          <button
            type="button"
            onClick={() => onScreenshotClick(screenshot)}
            className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2.5 py-1 text-[11px] font-medium text-info-text transition-colors hover:bg-info-bg/70 cursor-zoom-in"
          >
            <span>📍</span> {STEP_LABELS[issue.page]}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2.5 py-1 text-[11px] font-medium text-info-text">
            <span>📍</span> {STEP_LABELS[issue.page]}
          </span>
        )}
        {(issue.effort || issue.effortType) && (
          <span className="text-[11px] font-medium text-text-disabled">
            {issue.effort}{issue.effort && issue.effortType ? " · " : ""}{issue.effortType}
          </span>
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
    <div className="rounded-xl border border-border-default bg-bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
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
  const uniqueByStep = [...new Map(screenshots.map((s) => [s.step, s])).values()];

  return (
    <div className="space-y-6">
      {uniqueByStep.map((s) => {
        const commentary = commentaryMap.get(s.step);
        return (
          <div
            key={s.step}
            className="rounded-xl border border-border-default bg-bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.07)] overflow-hidden"
          >
            {/* Step header */}
            <div className="border-b border-border-default bg-bg-app px-5 py-3">
              <h3 className="text-sm font-bold text-text-primary">
                {STEP_LABELS[s.step]}
              </h3>
              <p className="mt-0.5 truncate text-xs text-text-secondary">{s.url}</p>
            </div>

            {/* Split: screenshot left, commentary right */}
            <div className="flex flex-col md:flex-row md:items-start">
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

              {/* Commentary — compact summary */}
              <div className="md:w-2/5 p-5">
                {commentary ? (
                  <>
                    {commentary.narrative && (
                      <p className="text-sm italic text-text-secondary leading-relaxed">
                        {commentary.narrative}
                      </p>
                    )}

                    <div className="mt-2 text-xs text-text-secondary">
                      {commentary.issues.length > 0 ? (() => {
                        const counts = { high: 0, medium: 0, low: 0 };
                        for (const issue of commentary.issues) counts[issue.severity]++;
                        const topIssue =
                          commentary.issues.find((i) => i.severity === "high") ??
                          commentary.issues.find((i) => i.severity === "medium") ??
                          commentary.issues[0];
                        return (
                          <span className="flex items-center gap-1 flex-wrap">
                            {counts.high > 0 && (
                              <span className="text-severity-high-text font-medium">
                                🔴 {counts.high} high
                              </span>
                            )}
                            {counts.high > 0 && (counts.medium > 0 || counts.low > 0) && (
                              <span className="text-text-disabled">·</span>
                            )}
                            {counts.medium > 0 && (
                              <span className="text-severity-medium-text font-medium">
                                🟡 {counts.medium} medium
                              </span>
                            )}
                            {counts.medium > 0 && counts.low > 0 && (
                              <span className="text-text-disabled">·</span>
                            )}
                            {counts.low > 0 && (
                              <span className="text-severity-low-text font-medium">
                                🟢 {counts.low} low
                              </span>
                            )}
                            {topIssue && (
                              <>
                                <span className="text-text-disabled mx-0.5">—</span>
                                <span className="text-text-secondary">
                                  {topIssue.description}
                                </span>
                              </>
                            )}
                          </span>
                        );
                      })() : (
                        <span className="text-primary font-medium">No issues found</span>
                      )}
                    </div>
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

  const uniqueByStep = [...new Map(screenshots.map((s) => [s.step, s])).values()];
  const visible = uniqueByStep.slice(0, 5);

  return (
    <section>
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
        Browsing Session Screenshots &mdash; click to enlarge
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {visible.map((s) => (
          <button
            key={s.step}
            type="button"
            onClick={() => onScreenshotClick(s)}
            className="group overflow-hidden rounded-xl border border-border-default bg-bg-surface shadow-[0_1px_2px_rgba(0,0,0,0.07)] text-left cursor-zoom-in transition-all hover:shadow-md"
          >
            <div className="relative">
              <img
                src={`data:image/png;base64,${s.screenshot}`}
                alt={`Screenshot of ${STEP_LABELS[s.step]} page`}
                className="aspect-square w-full object-cover object-top"
                loading="lazy"
              />
              {/* Hover expand icon */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black/55">
                  <svg viewBox="0 0 16 16" fill="none" stroke="white" strokeWidth={2} className="h-4 w-4">
                    <polyline points="6 2 2 2 2 6" />
                    <polyline points="10 14 14 14 14 10" />
                    <line x1="2" y1="2" x2="7" y2="7" />
                    <line x1="14" y1="14" x2="9" y2="9" />
                  </svg>
                </div>
              </div>
            </div>
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
            className="rounded-lg border border-border-default bg-bg-surface px-5 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-bg-app"
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
              ? "bg-bg-surface text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
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
              ? "bg-bg-surface text-text-primary shadow-[0_1px_2px_rgba(0,0,0,0.07)]"
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
          <div className="mb-8 rounded-xl border border-border-default bg-bg-surface p-6 shadow-[0_1px_2px_rgba(0,0,0,0.07)] sm:p-8">
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
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1.15fr_1fr_1fr]">
                {report.quickWins.slice(0, 3).map((issue, i) => (
                  <QuickWinCard
                    key={issue.id}
                    issue={issue}
                    isFirst={i === 0}
                    screenshot={screenshotMap.get(issue.page)}
                    onScreenshotClick={openLightbox}
                  />
                ))}
              </div>
            </section>
          )}

          {/* What's Working Well */}
          {(() => {
            const allPositives = [...new Set(commentaries.flatMap((c) => c.positives))];
            if (allPositives.length === 0) return null;
            return (
              <section className="mb-8">
                <div className="rounded-xl border border-border-default bg-bg-surface px-6 py-5 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
                  <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                    What&apos;s Working Well
                  </h2>
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {allPositives.map((pos, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-[15px] text-primary">&#10003;</span>
                        <span className="text-[13px] leading-[1.45] text-text-primary">{pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })()}

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
          <div className="mt-10 flex items-center justify-between rounded-xl border border-border-default bg-bg-surface px-8 py-7 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
            <div>
              <h3 className="text-base font-bold text-text-primary">
                Want to improve your score?
              </h3>
              <p className="mt-1 text-[13px] text-text-secondary">
                Make changes based on the quick wins above, then run another analysis to measure progress.
              </p>
            </div>
            <button
              type="button"
              onClick={onReset}
              className="shrink-0 rounded-lg bg-primary px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover active:bg-primary-pressed"
            >
              Run New Analysis
            </button>
          </div>
        </>
      )}
    </div>
  );
}
