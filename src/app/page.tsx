"use client";

import { useState, useEffect } from "react";
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
  const [transitioning, setTransitioning] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setTransitioning(true);
    analyze(url.trim());
  };

  // ---- Transition cleanup ----
  useEffect(() => {
    if (!transitioning) return;
    if (status === "error") {
      setTransitioning(false);
      return;
    }
    const timer = setTimeout(() => setTransitioning(false), 450);
    return () => clearTimeout(timer);
  }, [transitioning, status]);

  // ---- Derived visibility ----
  const isProcessing =
    status === "validating" || status === "crawling" || status === "analyzing";
  const showAurora = status === "idle" || status === "error" || transitioning;
  const showLiveViewer = isProcessing;

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

  // ---- Idle / Crawling / Error: aurora + live viewer ----
  return (
    <>
      {/* LiveViewer — rendered underneath the aurora during transition */}
      {showLiveViewer && (
        <div className={`bg-aurora min-h-screen${transitioning ? " viewer-enter" : ""}`}>
          <div className="max-w-[1200px] mx-auto px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
              <h1 className="text-lg font-bold text-white">
                VibeShopper
              </h1>
              <span className="text-sm text-white/60">
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
        </div>
      )}

      {/* Aurora landing — becomes fixed overlay during exit transition */}
      {showAurora && (
        <div
          className={`bg-aurora flex min-h-screen items-center justify-center px-4${transitioning ? " aurora-exit" : ""}`}
        >
          <div className="relative z-10 w-full max-w-lg">
            <div className="glass-card rounded-2xl p-8">
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
                <h1 className="text-2xl font-bold text-white">
                  VibeShopper
                </h1>
                <p className="mt-2 text-sm text-white/60">
                  Your store in 90 seconds, through a customer&apos;s eyes.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="store-url"
                    className="mb-1.5 block text-sm font-medium text-white/80"
                  >
                    Store URL
                  </label>
                  <input
                    id="store-url"
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g. allbirds.com"
                    className="input-dark w-full rounded-lg px-4 py-2.5 text-sm"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!url.trim()}
                  className="btn-glow w-full rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-white hover:bg-primary-hover active:bg-primary-pressed disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Analyze Store
                </button>
              </form>

              {/* Error display */}
              {error && (
                <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Example stores */}
              <div className="mt-6 border-t border-white/10 pt-4">
                <p className="mb-2 text-[13px] font-semibold uppercase tracking-wide text-white/40">
                  Try these stores
                </p>
                <div className="flex flex-wrap gap-2">
                  {["allbirds.com", "gymshark.com", "bombas.com"].map((store) => (
                    <button
                      key={store}
                      type="button"
                      onClick={() => setUrl(store)}
                      className="rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-medium text-white/60 transition-all hover:border-primary/50 hover:text-white hover:bg-white/10"
                    >
                      {store} <span className="ml-0.5 text-white/30">&#8594;</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* How it works */}
            <div className="mt-6 flex items-center justify-center gap-3 text-xs text-white/30">
              <span>&#128279; Paste URL</span>
              <span>&#8594;</span>
              <span>&#128065; Watch AI browse</span>
              <span>&#8594;</span>
              <span>&#128202; Get audit</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
