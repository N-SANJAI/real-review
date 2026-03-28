const TINYFISH_API_KEY = process.env.TINYFISH_API_KEY!;
const TINYFISH_BASE = "https://agent.tinyfish.ai/v1";

export type TinyfishEventCallback = (event: Record<string, unknown>) => void;

async function cancelRun(runId: string) {
  try {
    await fetch(`${TINYFISH_BASE}/runs/${runId}/cancel`, {
      method: "POST",
      headers: { "X-API-Key": TINYFISH_API_KEY },
    });
    console.log(`[tinyfish] Cancelled run ${runId}`);
  } catch (e) {
    console.error(`[tinyfish] Failed to cancel run ${runId}:`, e);
  }
}

// List all runs with a given status and return their IDs
async function listRunIds(status: string): Promise<string[]> {
  try {
    const res = await fetch(`${TINYFISH_BASE}/runs?status=${status}&limit=100`, {
      headers: { "X-API-Key": TINYFISH_API_KEY },
    });
    if (!res.ok) {
      console.error(`[tinyfish] listRunIds HTTP ${res.status}`);
      return [];
    }
    const data = await res.json();
    console.log(`[tinyfish] listRunIds(${status}) raw:`, JSON.stringify(data).slice(0, 300));
    // API may return { runs: [...] } or { data: [...] } — try both id and run_id fields
    const items: Record<string, string>[] = data.runs ?? data.data ?? [];
    return items.map((r) => r.id ?? r.run_id).filter(Boolean);
  } catch (e) {
    console.error(`[tinyfish] listRunIds error:`, e);
    return [];
  }
}

// Cancel all PENDING and RUNNING runs to clear zombie queue
export async function cancelAllActiveRuns() {
  const [pendingIds, runningIds] = await Promise.all([
    listRunIds("PENDING"),
    listRunIds("RUNNING"),
  ]);
  const allIds = [...pendingIds, ...runningIds];

  if (allIds.length === 0) {
    console.log("[tinyfish] No active runs to cancel");
    return 0;
  }

  console.log(`[tinyfish] Cancelling ${allIds.length} active runs: ${allIds.join(", ")}`);
  try {
    await fetch(`${TINYFISH_BASE}/runs/batch/cancel`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": TINYFISH_API_KEY },
      body: JSON.stringify({ run_ids: allIds }),
    });
    console.log("[tinyfish] Queue cleared");
  } catch (e) {
    console.error("[tinyfish] Batch cancel failed:", e);
  }
  return allIds.length;
}

export async function runTinyfishAgent(
  url: string,
  goal: string,
  onEvent?: TinyfishEventCallback,
  browserProfile: "lite" | "stealth" = "lite"
) {
  let currentRunId: string | null = null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300_000); // 5 min per agent

  console.log(`[tinyfish] START  ${url}`);

  try {
    const body: Record<string, unknown> = {
      url,
      goal,
      browser_profile: browserProfile,
      capture_config: {
        elements: false,
        snapshots: false,
        screenshots: false,
        recording: false,
      },
    };
    const response = await fetch(`${TINYFISH_BASE}/automation/run-sse`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": TINYFISH_API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      console.error(`[tinyfish] HTTP ${response.status} for ${url}: ${text}`);
      throw new Error(`TinyFish error: ${response.status} ${text}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;

        let event: Record<string, unknown>;
        try {
          event = JSON.parse(line.slice(6));
        } catch {
          console.log(`[tinyfish] non-JSON line from ${url}: ${line.slice(0, 80)}`);
          continue;
        }

        const type = event.type as string | undefined;
        const status = event.status as string | undefined;

        console.log(`[tinyfish] EVENT  ${url} → type=${type ?? "-"} status=${status ?? "-"}`);

        if (type === "STARTED") {
          currentRunId = (event.run_id as string) ?? null;
          console.log(`[tinyfish] run_id=${currentRunId} for ${url}`);
          onEvent?.(event);
        }

        if (type === "STREAMING_URL") {
          console.log(`[tinyfish] STREAMING_URL raw: ${JSON.stringify(event)}`);
          onEvent?.(event);
        }

        if (type === "PROGRESS") {
          const msg = event.message ?? event.description ?? JSON.stringify(event).slice(0, 120);
          console.log(`[tinyfish] PROGRESS ${url}: ${msg}`);
          onEvent?.(event);
        }

        if (type === "COMPLETE") {
          if (status === "FAILED" || status === "CANCELLED") {
            const reason = (event.error as Record<string, string> | undefined)?.message ?? status;
            console.error(`[tinyfish] COMPLETE+${status} ${url}: ${reason}`);
            throw new Error(`TinyFish automation ${status}: ${reason}`);
          }
          let result = event.result;
          if (typeof result === "string") {
            try { result = JSON.parse(result); } catch { /* leave as string */ }
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          console.log(`[tinyfish] DONE   ${url} → reviews=${(result as any)?.reviews?.length ?? "?"}`);
          currentRunId = null; // completed cleanly, no need to cancel
          return { ...event, result };
        }

        if (status === "FAILED" || status === "CANCELLED") {
          console.error(`[tinyfish] MID-STREAM ${status} ${url}: ${JSON.stringify(event)}`);
          throw new Error(`TinyFish automation ${status}`);
        }
      }
    }

    throw new Error("TinyFish SSE stream ended without COMPLETE event");
  } catch (e) {
    console.error(`[tinyfish] ERROR  ${url}:`, e);
    // Properly cancel on TinyFish's side so we don't leave zombie runs
    if (currentRunId) {
      cancelRun(currentRunId).catch(() => {});
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}

