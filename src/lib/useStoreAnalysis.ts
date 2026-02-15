"use client";

import { useState, useCallback, useRef } from "react";
import type {
  CrawlStepName,
  StepCommentary,
  AuditReport,
  SSEEvent,
} from "@/lib/types";

export interface ScreenshotData {
  step: CrawlStepName;
  screenshot: string;
  url: string;
  index: number;
}

export interface AnalysisState {
  status:
    | "idle"
    | "validating"
    | "crawling"
    | "analyzing"
    | "complete"
    | "error";
  currentStep: CrawlStepName | null;
  currentStepLabel: string;
  currentStepDescription: string;
  screenshots: ScreenshotData[];
  commentaries: StepCommentary[];
  report: AuditReport | null;
  error: string | null;
  totalTime: number | null;
}

const initialState: AnalysisState = {
  status: "idle",
  currentStep: null,
  currentStepLabel: "",
  currentStepDescription: "",
  screenshots: [],
  commentaries: [],
  report: null,
  error: null,
  totalTime: null,
};

export function useStoreAnalysis() {
  const [state, setState] = useState<AnalysisState>(initialState);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (url: string) => {
    setState({ ...initialState, status: "validating" });

    if (abortRef.current) abortRef.current.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errData = await response.json();
        setState((prev) => ({
          ...prev,
          status: "error",
          error: errData.error || "Failed to start analysis",
        }));
        return;
      }

      setState((prev) => ({ ...prev, status: "crawling" }));

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const event: SSEEvent = JSON.parse(line.slice(6));
            handleEvent(event, setState);
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      if (abortController.signal.aborted) return;
      setState((prev) => ({
        ...prev,
        status: "error",
        error: err instanceof Error ? err.message : "Analysis failed",
      }));
    }
  }, []);

  const reset = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
    setState(initialState);
  }, []);

  return { ...state, analyze, reset };
}

function handleEvent(
  event: SSEEvent,
  setState: React.Dispatch<React.SetStateAction<AnalysisState>>
) {
  switch (event.type) {
    case "step_start":
      setState((prev) => ({
        ...prev,
        status: "crawling",
        currentStep: event.data.step,
        currentStepLabel: event.data.label,
        currentStepDescription: event.data.description,
      }));
      break;
    case "screenshot":
      setState((prev) => ({
        ...prev,
        screenshots: [...prev.screenshots, event.data],
      }));
      break;
    case "commentary":
      setState((prev) => ({
        ...prev,
        commentaries: [...prev.commentaries, event.data],
        // Transition to "analyzing" after the final crawl step (cart)
        ...(event.data.step === "cart" ? { status: "analyzing" as const } : {}),
      }));
      break;
    case "report":
      setState((prev) => ({ ...prev, status: "complete", report: event.data }));
      break;
    case "error":
      setState((prev) => ({
        ...prev,
        error: event.data.message,
        ...(event.data.step ? {} : { status: "error" as const }),
      }));
      break;
    case "done":
      setState((prev) => ({
        ...prev,
        status: prev.report ? "complete" : prev.status,
        totalTime: event.data.totalTime,
      }));
      break;
  }
}
