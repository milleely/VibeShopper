import { NextRequest } from "next/server";
import { validateShopifyUrl } from "@/lib/validators";
import { crawlStore } from "@/lib/crawler";
import { generateStepCommentary, generateAuditReport } from "@/lib/analyzer";
import type { CrawlStep, StepCommentary, SSEEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { url } = body;

  if (!url) {
    return new Response(JSON.stringify({ error: "URL is required" }), {
      status: 400,
    });
  }

  const validation = await validateShopifyUrl(url);
  if (!validation.isShopify) {
    return new Response(
      JSON.stringify({
        error: validation.error || "Not a valid Shopify store",
      }),
      { status: 400 }
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const commentaries: StepCommentary[] = [];
      const allSteps: CrawlStep[] = [];
      const commentaryPromises: Promise<void>[] = [];

      function sendEvent(event: SSEEvent) {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      }

      try {
        const result = await crawlStore(validation.normalizedUrl, {
          onStepStart: (step, label, description) => {
            sendEvent({
              type: "step_start",
              data: { step, label, description },
            });
          },

          onScreenshot: (step, screenshot, url, index) => {
            sendEvent({
              type: "screenshot",
              data: { step, screenshot, url, index },
            });
          },

          onStepComplete: (step: CrawlStep) => {
            const previousSteps = [...allSteps];
            allSteps.push(step);

            // Fire commentary in background — don't block the crawl
            const promise = generateStepCommentary(
              step,
              validation.normalizedUrl,
              previousSteps
            )
              .then((commentary) => {
                commentaries.push(commentary);
                sendEvent({ type: "commentary", data: commentary });
              })
              .catch((err) => {
                console.error(`Commentary failed for ${step.name}:`, err);
              });
            commentaryPromises.push(promise);
          },

          onError: (step, error) => {
            sendEvent({ type: "error", data: { message: error, step } });
          },
        });

        // Wait for any in-flight commentary before generating the audit report
        await Promise.all(commentaryPromises);

        try {
          const report = await generateAuditReport(
            validation.normalizedUrl,
            allSteps,
            commentaries
          );
          sendEvent({ type: "report", data: report });
        } catch (err) {
          sendEvent({
            type: "error",
            data: {
              message:
                "Failed to generate audit report. Step analyses are still available.",
            },
          });
        }

        sendEvent({ type: "done", data: { totalTime: result.totalTime } });
      } catch (err) {
        sendEvent({
          type: "error",
          data: {
            message:
              err instanceof Error
                ? err.message
                : "Crawl failed unexpectedly",
          },
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
