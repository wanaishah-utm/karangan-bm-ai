// Small helpers shared by the AI route handlers (/api/research, /api/peribahasa).
// Server-only: imported from route files, never from components.

// --- Best-effort in-memory rate limit --------------------------------------
// Allows at most RATE_LIMIT requests per IP within RATE_WINDOW_MS, counted
// across ALL AI routes. This is intentionally simple: it lives in memory, so it
// resets when the server restarts and is NOT shared across multiple server
// instances (e.g. serverless). It's a light guard against accidental spamming,
// not a security feature.
const RATE_LIMIT = 20; // max requests
const RATE_WINDOW_MS = 60_000; // per 60 seconds
const requestLog = new Map<string, number[]>();

export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  // Keep only the timestamps still inside the time window.
  const recent = (requestLog.get(ip) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  recent.push(now);
  requestLog.set(ip, recent);
  return recent.length > RATE_LIMIT;
}

// The client IP, from the x-forwarded-for header (set by hosting proxies like
// Vercel); "unknown" when there is none (e.g. local dev).
export function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  );
}

// Pull a clean JSON array out of the model's text output. The model is told to
// return raw JSON, but this guards against stray code fences or prose.
export function extractJsonArray(text: string): string {
  let t = text.trim();

  // Strip a ```json ... ``` (or plain ``` ... ```) code fence if present.
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();

  // If there's leading/trailing prose, keep only the outermost [ ... ].
  if (!t.startsWith("[")) {
    const start = t.indexOf("[");
    const end = t.lastIndexOf("]");
    if (start !== -1 && end !== -1 && end > start) {
      t = t.slice(start, end + 1);
    }
  }
  return t;
}
