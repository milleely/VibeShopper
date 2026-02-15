"use client";

import { useState } from "react";
import { useStoreAnalysis } from "@/lib/useStoreAnalysis";
import LiveViewer from "@/components/LiveViewer";
import AuditReport from "@/components/AuditReport";

export default function Home() {
  const {
    status,
    currentStep,
    currentStepLabel,
    currentStepDescription,
    screenshots,
    commentaries,
    report,
    error,
    totalTime,
    analyze,
    reset,
  } = useStoreAnalysis();

  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    analyze(url.trim());
  };

  // ---- Complete: full audit report ----
  if (status === "complete" && report) {
    return (
      <div className="min-h-screen py-8">
        <AuditReport
          report={report}
          screenshots={screenshots}
          commentaries={commentaries}
          totalTime={totalTime}
          onReset={() => {
            setUrl("");
            reset();
          }}
        />
      </div>
    );
  }

  // ---- Crawling / Analyzing: live viewer ----
  if (
    status === "validating" ||
    status === "crawling" ||
    status === "analyzing"
  ) {
    return (
      <div className="min-h-screen max-w-[1200px] mx-auto px-4 py-8">
        {/* Minimal header during crawl */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-lg font-bold text-text-primary">
            VibeShopper
          </h1>
          <span className="text-sm text-text-secondary">
            {status === "validating"
              ? "Validating store..."
              : status === "analyzing"
                ? "Generating report..."
                : "Browsing store..."}
          </span>
        </div>

        <LiveViewer
          status={status as "validating" | "crawling" | "analyzing"}
          currentStep={currentStep}
          currentStepLabel={currentStepLabel}
          currentStepDescription={currentStepDescription}
          screenshots={screenshots}
          commentaries={commentaries}
        />
      </div>
    );
  }

  // ---- Idle / Error: URL input form ----
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-lg">
        <div className="rounded-xl border border-border-default bg-white p-8 shadow-[0_1px_2px_rgba(0,0,0,0.07)]">
          {/* Logo / Title */}
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-text-primary">
              VibeShopper
            </h1>
            <p className="mt-2 text-sm text-text-secondary">
              AI-powered Shopify store audit. Enter a store URL and watch our AI
              browse it like a first-time customer.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="store-url"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Store URL
              </label>
              <input
                id="store-url"
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="e.g. allbirds.com"
                className="w-full rounded-lg border border-border-default bg-white px-4 py-2.5 text-sm text-text-primary placeholder:text-text-disabled outline-none transition-colors focus:border-border-focus focus:ring-1 focus:ring-border-focus"
              />
            </div>

            <button
              type="submit"
              disabled={!url.trim()}
              className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Analyze Store
            </button>
          </form>

          {/* Error display */}
          {error && (
            <div className="mt-4 rounded-lg border border-severity-high-border/30 bg-severity-high-bg p-4">
              <p className="text-sm text-severity-high-text">{error}</p>
            </div>
          )}

          {/* Example stores */}
          <div className="mt-6 border-t border-border-default pt-4">
            <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-text-secondary">
              Try these stores
            </p>
            <div className="flex flex-wrap gap-2">
              {["allbirds.com", "gymshark.com", "bombas.com"].map((store) => (
                <button
                  key={store}
                  type="button"
                  onClick={() => setUrl(store)}
                  className="rounded-full border border-border-default bg-bg-app px-3 py-1 text-xs font-medium text-text-secondary transition-colors hover:bg-border-default hover:text-text-primary"
                >
                  {store}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
