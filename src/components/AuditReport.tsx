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
    badge: "bg-[#ff6b6b]/15 text-[#ff6b6b]",
    border: "border-l-[#ff6b6b]",
    bg: "bg-[#ff6b6b]/10",
  },
  medium: {
    badge: "bg-[#ffd93d]/15 text-[#ffd93d]",
    border: "border-l-[#ffd93d]",
    bg: "bg-[#ffd93d]/10",
  },
  low: {
    badge: "bg-[#6bcf7f]/15 text-[#6bcf7f]",
    border: "border-l-[#6bcf7f]",
    bg: "bg-[#6bcf7f]/10",
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
    <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-medium text-white/60">
      {STEP_LABELS[page]}
    </span>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-5 w-5 text-white/50 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
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
        className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-xl card-dark shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <span className="text-sm font-semibold text-white">
            {STEP_LABELS[screenshot.step]}
          </span>
          <span className="mr-8 truncate text-xs text-white/60">
            {screenshot.url}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg text-white/50 transition-colors hover:bg-white/10 hover:text-white"
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
      className={`rounded-lg border border-white/10 border-l-[3px] ${styles.border} ${styles.bg} p-4`}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <SeverityBadge severity={issue.severity} />
        <h4 className="text-sm font-bold text-white">{issue.title}</h4>
      </div>
      <p className="mb-3 text-sm leading-relaxed text-white/70">
        {issue.description}
      </p>
      <p className="mb-3 text-sm leading-relaxed text-white/70">
        <span className="font-semibold text-white">Recommended fix: </span>
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
              className="h-10 w-[30px] rounded border border-white/15 object-cover object-top transition-shadow group-hover:shadow-md"
            />
            <span className="text-xs font-medium text-white/60 group-hover:text-white transition-colors">
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
      className={`flex flex-col justify-between rounded-xl p-5 transition-all hover:shadow-md hover:-translate-y-px ${
        isFirst
          ? "border-[1.5px] border-[#ff6b6b] bg-gradient-to-b from-[rgba(255,107,107,0.06)] to-[rgba(255,107,107,0.14)]"
          : "card-dark-nested"
      }`}
    >
      <div>
        {isFirst && (
          <div className="mb-2">
            <span className="inline-block rounded bg-[#ff6b6b]/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#ff6b6b]">
              ★ Fix this first
            </span>
          </div>
        )}
        <div className="mb-3">
          <SeverityBadge severity={issue.severity} />
        </div>
        <h4 className="mb-2 text-[15px] font-bold text-white">
          {issue.title}
        </h4>
        <p className="mb-3 text-sm leading-relaxed text-white/70">
          {issue.description}
        </p>
        <div
          className={`mb-4 rounded-lg ${styles.bg} border-l-[3px] ${styles.border} px-3 py-2.5`}
        >
          <p className="text-[13px] leading-relaxed text-white/70">
            <span className="font-semibold text-white">Fix: </span>
            {issue.fix}
          </p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between pt-1">
        {screenshot && onScreenshotClick ? (
          <button
            type="button"
            onClick={() => onScreenshotClick(screenshot)}
            className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60 transition-colors hover:bg-white/15 cursor-zoom-in"
          >
            <span>📍</span> {STEP_LABELS[issue.page]}
          </button>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/60">
            <span>📍</span> {STEP_LABELS[issue.page]}
          </span>
        )}
        {(issue.effort || issue.effortType) && (
          <span className="text-[11px] font-medium text-white/40">
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
    <div className="rounded-xl card-dark">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition-colors hover:bg-white/5 rounded-xl"
      >
        <div className="flex items-center gap-3">
          <h3 className="text-[15px] font-bold text-white">
            {category.label}
          </h3>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/60">
            {category.issues.length} issue{category.issues.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <ScoreGauge score={category.score} size="sm" />
          <ChevronIcon open={isOpen} />
        </div>
      </button>

      {isOpen && category.issues.length > 0 && (
        <div className="border-t border-white/10 px-5 pb-5 pt-4">
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
        <div className="border-t border-white/10 px-5 py-6 text-center">
          <p className="text-sm text-white/60">
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
            className="rounded-xl card-dark overflow-hidden"
          >
            {/* Step header */}
            <div className="border-b border-white/10 bg-white/5 px-5 py-3">
              <h3 className="text-sm font-bold text-white">
                {STEP_LABELS[s.step]}
              </h3>
              <p className="mt-0.5 truncate text-xs text-white/60">{s.url}</p>
            </div>

            {/* Split: screenshot left, commentary right */}
            <div className="flex flex-col md:flex-row md:items-start">
              {/* Screenshot */}
              <div className="md:w-3/5 border-b md:border-b-0 md:border-r border-white/10">
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
                      <p className="text-sm italic text-white/70 leading-relaxed">
                        {commentary.narrative}
                      </p>
                    )}

                    <div className="mt-2 text-xs text-white/60">
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
                              <span className="text-[#ff6b6b] font-medium">
                                🔴 {counts.high} high
                              </span>
                            )}
                            {counts.high > 0 && (counts.medium > 0 || counts.low > 0) && (
                              <span className="text-white/30">·</span>
                            )}
                            {counts.medium > 0 && (
                              <span className="text-[#ffd93d] font-medium">
                                🟡 {counts.medium} medium
                              </span>
                            )}
                            {counts.medium > 0 && counts.low > 0 && (
                              <span className="text-white/30">·</span>
                            )}
                            {counts.low > 0 && (
                              <span className="text-[#6bcf7f] font-medium">
                                🟢 {counts.low} low
                              </span>
                            )}
                            {topIssue && (
                              <>
                                <span className="text-white/30 mx-0.5">—</span>
                                <span className="text-white/50">
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
                  <p className="text-sm text-white/40">No commentary available for this step.</p>
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
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-white/50">
        Browsing Session Screenshots &mdash; click to enlarge
      </h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {visible.map((s) => (
          <button
            key={s.step}
            type="button"
            onClick={() => onScreenshotClick(s)}
            className="group overflow-hidden rounded-xl card-dark-nested text-left cursor-zoom-in transition-all hover:shadow-md"
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
              <span className="text-xs font-semibold text-white/60">
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
          <h1 className="truncate text-2xl font-bold text-white sm:text-3xl">
            {report.storeName}
          </h1>
          <p className="mt-1 truncate text-sm text-white/60">
            {report.storeUrl}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          {totalTime !== null && (
            <span className="text-sm text-white/60">
              Completed in {(totalTime / 1000).toFixed(1)}s
            </span>
          )}
          <button
            type="button"
            onClick={onReset}
            className="rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-white/20"
          >
            New Analysis
          </button>
        </div>
      </div>

      {/* ------- Tab Toggle ------- */}
      <div className="mb-8 flex gap-1 rounded-lg border border-white/15 bg-white/10 p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("report")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "report"
              ? "bg-white/20 text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
              : "text-white/50 hover:text-white"
          }`}
        >
          Audit Report
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("session")}
          className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "session"
              ? "bg-white/20 text-white shadow-[0_1px_2px_rgba(0,0,0,0.15)]"
              : "text-white/50 hover:text-white"
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
          <div className="mb-8 rounded-xl card-dark p-6 sm:p-8">
            <div className="flex flex-col items-center gap-8 md:flex-row md:items-start">
              <div className="shrink-0">
                <ScoreGauge score={report.overallScore} size="lg" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-white/50">
                  AI Shopper Narrative
                </h2>
                <blockquote className="rounded-lg border-l-[3px] border-l-primary bg-white/5 px-5 py-4">
                  <p className="text-sm italic leading-relaxed text-white/90">
                    {report.shopperNarrative}
                  </p>
                </blockquote>
              </div>
            </div>
          </div>

          {/* Quick Wins */}
          {report.quickWins.length > 0 && (
            <section className="mb-8">
              <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-white/50">
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
                <div className="rounded-xl card-dark px-6 py-5">
                  <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-white/50">
                    What&apos;s Working Well
                  </h2>
                  <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
                    {allPositives.map((pos, i) => (
                      <div key={i} className="flex items-start gap-2.5">
                        <span className="mt-0.5 shrink-0 text-[15px] text-primary">&#10003;</span>
                        <span className="text-[13px] leading-[1.45] text-white">{pos}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            );
          })()}

          {/* Category Breakdown */}
          <section className="mb-8">
            <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-white/50">
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
          <div className="mt-10 flex items-center justify-between rounded-xl card-dark px-8 py-7">
            <div>
              <h3 className="text-base font-bold text-white">
                Want to improve your score?
              </h3>
              <p className="mt-1 text-[13px] text-white/60">
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
