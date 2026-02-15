"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { CRAWL_STEPS } from "@/lib/types";
import type { CrawlStepName, StepCommentary, StepIssue } from "@/lib/types";
import type { ScreenshotData } from "@/lib/useStoreAnalysis";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface LiveViewerProps {
  status: "validating" | "crawling" | "analyzing";
  currentStep: CrawlStepName | null;
  currentStepLabel: string;
  currentStepDescription: string;
  screenshots: ScreenshotData[];
  commentaries: StepCommentary[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const STEP_NAMES: CrawlStepName[] = CRAWL_STEPS.map((s) => s.name);

const SEVERITY_STYLES: Record<
  StepIssue["severity"],
  { badge: string; label: string }
> = {
  high: {
    badge: "bg-severity-high-bg text-severity-high-text",
    label: "High",
  },
  medium: {
    badge: "bg-severity-medium-bg text-severity-medium-text",
    label: "Medium",
  },
  low: {
    badge: "bg-severity-low-bg text-severity-low-text",
    label: "Low",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Return the 0-based index of a step within the CRAWL_STEPS list. */
function stepIndex(name: CrawlStepName): number {
  return STEP_NAMES.indexOf(name);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** A single circle + label in the progress bar. */
function StepIndicator({
  stepNumber,
  label,
  state,
}: {
  stepNumber: number;
  label: string;
  state: "completed" | "active" | "pending";
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[100px]">
      {/* Circle */}
      <div
        className={`
          relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full
          text-xs font-semibold transition-colors duration-300
          ${
            state === "completed"
              ? "bg-primary text-white"
              : state === "active"
                ? "border-2 border-primary text-primary"
                : "border-2 border-border-default text-text-disabled"
          }
        `}
      >
        {state === "active" && (
          <span className="absolute inset-0 rounded-full border-2 border-primary animate-ping opacity-30" />
        )}
        {state === "completed" ? (
          <CheckIcon />
        ) : (
          <span>{stepNumber}</span>
        )}
      </div>

      {/* Label */}
      <span
        className={`
          text-[11px] leading-tight text-center
          ${
            state === "completed"
              ? "text-primary font-medium"
              : state === "active"
                ? "text-primary font-medium"
                : "text-text-disabled"
          }
        `}
      >
        {label}
      </span>
    </div>
  );
}

/** Simple SVG checkmark icon. */
function CheckIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 16 16"
      fill="currentColor"
      className="h-4 w-4"
    >
      <path
        fillRule="evenodd"
        d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

/** Connector line between two step indicators. */
function StepConnector({ completed }: { completed: boolean }) {
  return (
    <div className="flex-1 self-start mt-4 mx-1">
      <div
        className={`
          h-0.5 w-full rounded-full transition-colors duration-300
          ${completed ? "bg-primary" : "bg-border-default"}
        `}
      />
    </div>
  );
}

/** Severity pill badge. */
function SeverityBadge({ severity }: { severity: StepIssue["severity"] }) {
  const style = SEVERITY_STYLES[severity];
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${style.badge}`}
    >
      {style.label}
    </span>
  );
}

/** Compact commentary card — collapsed by default, expandable for detail. */
function CommentaryCard({ commentary }: { commentary: StepCommentary }) {
  const [isOpen, setIsOpen] = useState(false);
  const stepDef = CRAWL_STEPS.find((s) => s.name === commentary.step);
  const label = stepDef?.label ?? commentary.step;
  const issueCount = commentary.issues.length;

  return (
    <div className="rounded-lg border border-border-default bg-white overflow-hidden">
      {/* Clickable header — always visible */}
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-app/50"
      >
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-text-primary">{label}</h4>
          {commentary.narrative && (
            <p className="mt-1 text-xs italic text-text-secondary leading-relaxed line-clamp-2">
              {commentary.narrative}
            </p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2 pt-0.5">
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold leading-tight ${
              issueCount > 0
                ? "bg-severity-high-bg text-severity-high-text"
                : "bg-severity-low-bg text-severity-low-text"
            }`}
          >
            {issueCount > 0
              ? `${issueCount} issue${issueCount !== 1 ? "s" : ""}`
              : "No issues"}
          </span>
          <svg
            className={`h-4 w-4 text-text-secondary transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expandable detail */}
      {isOpen && (
        <div className="border-t border-border-default px-4 pb-4 pt-3 space-y-3">
          {/* Observations */}
          {commentary.observations.length > 0 && (
            <div>
              <h5 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                Observations
              </h5>
              <ul className="space-y-1 pl-4 text-sm text-text-primary list-disc marker:text-text-disabled">
                {commentary.observations.map((obs, i) => (
                  <li key={i}>{obs}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Issues */}
          {issueCount > 0 && (
            <div>
              <h5 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                Issues Found
              </h5>
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
                      <p className="pl-14 text-xs text-text-secondary leading-relaxed">
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
              <h5 className="mb-1.5 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
                What&apos;s Working
              </h5>
              <ul className="space-y-1 text-sm text-text-primary">
                {commentary.positives.map((pos, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5 shrink-0 text-primary">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="h-4 w-4"
                      >
                        <path
                          fillRule="evenodd"
                          d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </span>
                    <span>{pos}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Pulsing skeleton placeholder for the browser frame. */
function BrowserSkeleton() {
  return (
    <div className="flex h-full min-h-[400px] items-center justify-center bg-[#f6f6f7]">
      <div className="flex flex-col items-center gap-3">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-sm text-text-secondary animate-pulse">
          Navigating to store...
        </span>
      </div>
    </div>
  );
}

/** Loading dots animation for commentary pending state. */
function CommentaryPending() {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border-default bg-white p-4">
      <div className="flex gap-1">
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
      </div>
      <span className="text-sm text-text-secondary">
        Analyzing current step...
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function LiveViewer({
  status,
  currentStep,
  currentStepLabel,
  currentStepDescription,
  screenshots,
  commentaries,
}: LiveViewerProps) {
  // -- Refs for auto-scrolling the commentary panel -------------------------
  const commentaryEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    commentaryEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [commentaries.length, currentStep]);

  // -- Derived state --------------------------------------------------------
  const activeIndex = currentStep !== null ? stepIndex(currentStep) : -1;

  const completedSteps = useMemo(() => {
    const set = new Set<CrawlStepName>();
    for (const c of commentaries) set.add(c.step);
    return set;
  }, [commentaries]);

  const latestScreenshot =
    screenshots.length > 0 ? screenshots[screenshots.length - 1] : null;

  const currentUrl = latestScreenshot?.url ?? "";

  // -- Crossfade state -------------------------------------------------------
  const [visibleSrc, setVisibleSrc] = useState<string | null>(null);
  const [fadingIn, setFadingIn] = useState(false);
  const prevSrcRef = useRef<string | null>(null);
  const nextSrcRef = useRef<string | null>(null);

  const latestSrc = latestScreenshot
    ? `data:image/png;base64,${latestScreenshot.screenshot}`
    : null;

  useEffect(() => {
    if (!latestSrc || latestSrc === nextSrcRef.current) return;
    // New screenshot arrived — start crossfade
    prevSrcRef.current = visibleSrc;
    nextSrcRef.current = latestSrc;
    setFadingIn(false);
  }, [latestSrc, visibleSrc]);

  const handleImageLoaded = useCallback(() => {
    setFadingIn(true);
    // After transition, promote the new image to the visible layer
    const timeout = setTimeout(() => {
      setVisibleSrc(nextSrcRef.current);
    }, 350);
    return () => clearTimeout(timeout);
  }, []);

  // Whether the active step is still awaiting its commentary
  const isStepPending =
    currentStep !== null && !completedSteps.has(currentStep);

  // -----------------------------------------------------------------------

  return (
    <section className="space-y-6">
      {/* ---- Step Progress Bar ---- */}
      <div className="bg-white rounded-xl border border-border-default shadow-[0_1px_2px_rgba(0,0,0,0.07)] px-6 py-4">
        <div className="flex items-start">
          {CRAWL_STEPS.map((step, i) => {
            let state: "completed" | "active" | "pending";
            if (completedSteps.has(step.name)) {
              state = "completed";
            } else if (step.name === currentStep) {
              state = "active";
            } else {
              state = "pending";
            }

            return (
              <div key={step.name} className="contents">
                <StepIndicator
                  stepNumber={i + 1}
                  label={step.label}
                  state={state}
                />
                {i < CRAWL_STEPS.length - 1 && (
                  <StepConnector
                    completed={
                      completedSteps.has(step.name) ||
                      (activeIndex > i)
                    }
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- Analyzing State ---- */}
      {status === "analyzing" && (
        <div className="flex items-center justify-center rounded-xl border border-border-default bg-white shadow-[0_1px_2px_rgba(0,0,0,0.07)] py-20">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary border-t-transparent" />
            <div className="text-center">
              <p className="text-base font-semibold text-text-primary">
                Generating your audit report...
              </p>
              <p className="mt-1 text-sm text-text-secondary">
                Synthesizing findings from all 5 pages into a comprehensive analysis
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ---- Split View ---- */}
      {status !== "analyzing" && <div className="flex gap-4 min-h-[500px]">
        {/* Left: Browser Frame (3/5) */}
        <div className="w-3/5 flex flex-col bg-white rounded-xl border border-border-default shadow-[0_1px_2px_rgba(0,0,0,0.07)] overflow-hidden">
          {/* Browser Chrome */}
          <div className="flex items-center gap-3 border-b border-border-default bg-[#fafafa] px-4 py-2.5">
            {/* Traffic-light dots */}
            <div className="flex gap-1.5">
              <span className="h-[10px] w-[10px] rounded-full bg-[#ec6a5e]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#f4bf4f]" />
              <span className="h-[10px] w-[10px] rounded-full bg-[#61c554]" />
            </div>

            {/* URL bar */}
            <div className="flex-1 min-w-0">
              <div className="rounded-md bg-[#ebebeb] px-3 py-1 text-xs text-text-secondary truncate">
                {currentUrl || "about:blank"}
              </div>
            </div>
          </div>

          {/* Viewport — crossfade between screenshots */}
          <div className="flex-1 overflow-auto bg-[#f6f6f7] relative">
            {!latestScreenshot && <BrowserSkeleton />}

            {/* Bottom layer: previously visible screenshot */}
            {visibleSrc && (
              <img
                src={visibleSrc}
                alt=""
                className="w-full h-auto block"
              />
            )}

            {/* Top layer: new screenshot fading in */}
            {nextSrcRef.current && nextSrcRef.current !== visibleSrc && (
              <img
                src={nextSrcRef.current}
                alt={latestScreenshot ? `Screenshot of ${latestScreenshot.step} step` : ""}
                className={`absolute inset-0 w-full h-auto block transition-opacity duration-300 ${fadingIn ? "opacity-100" : "opacity-0"}`}
                onLoad={handleImageLoaded}
              />
            )}
          </div>

          {/* Step description footer */}
          {currentStepLabel && (
            <div className="border-t border-border-default bg-[#fafafa] px-4 py-2 flex items-center justify-between">
              <p className="text-xs text-text-secondary">
                <span className="font-medium text-text-primary">
                  {currentStepLabel}
                </span>
                {" — "}
                {currentStepDescription}
              </p>
              {!fadingIn && nextSrcRef.current !== visibleSrc && latestScreenshot && (
                <span className="text-[11px] text-text-disabled animate-pulse">
                  Scrolling...
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right: Commentary Panel (2/5) */}
        <div className="w-2/5 flex flex-col bg-white rounded-xl border border-border-default shadow-[0_1px_2px_rgba(0,0,0,0.07)] overflow-hidden">
          {/* Panel header */}
          <div className="shrink-0 border-b border-border-default px-4 py-3">
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-4 w-4 text-primary"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-7-4a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM9 9a.75.75 0 0 0 0 1.5h.253a.25.25 0 0 1 .244.304l-.459 2.066A1.75 1.75 0 0 0 10.747 15H11a.75.75 0 0 0 0-1.5h-.253a.25.25 0 0 1-.244-.304l.459-2.066A1.75 1.75 0 0 0 9.253 9H9Z"
                  clipRule="evenodd"
                />
              </svg>
              AI Commentary
            </h3>
          </div>

          {/* Scrollable commentary list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {commentaries.length === 0 && !isStepPending && (
              <div className="flex h-full items-center justify-center">
                <p className="text-sm text-text-disabled text-center">
                  Commentary will appear here as each step completes.
                </p>
              </div>
            )}

            {commentaries.map((c) => (
              <CommentaryCard key={c.step} commentary={c} />
            ))}

            {isStepPending && <CommentaryPending />}

            {/* Scroll anchor */}
            <div ref={commentaryEndRef} />
          </div>
        </div>
      </div>}
    </section>
  );
}
