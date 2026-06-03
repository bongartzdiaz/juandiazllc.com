// Brand-side client error sink. The Philly CRM has its own at
// /philly/api/log-error with Sentry + pino. This one is deliberately
// lighter: server-side log + optional Slack webhook for immediate
// visibility. No auth (it receives errors from broken pages), but
// rate-limited per IP so a runaway client can't flood us.
//
// Configure via env:
//   SLACK_ERROR_WEBHOOK_URL — optional; posts a formatted message
//   ERROR_LOG_RATE_CAPACITY — optional; defaults to 20
//
// Returns 204 on success so clients don't need to parse a body.

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Edge runtime — the Slack webhook + console.error are both edge-
// safe (global fetch, console). Rate-limit bucket is per-region,
// which is fine for anti-flood since a runaway client typically
// sticks to one region anyway.
export const runtime = "edge";

// Anonymous public telemetry — bounded but deliberately lenient so a
// legit error report is never rejected. Every field is optional and
// coerced (a numeric `message` still passes, matching the prior
// `String(...)` behaviour); generous `.max()` caps unbounded payloads.
// `.catch` on the whole object means even a non-object body degrades to
// `{}` rather than 400, mirroring the old hand-rolled extraction.
const reportSchema = z
  .object({
    message: z.coerce.string().max(10_000).optional(),
    stack: z.coerce.string().max(40_000).optional(),
    url: z.coerce.string().max(5_000).optional(),
    userAgent: z.coerce.string().max(5_000).optional(),
    source: z.coerce.string().max(500).optional(),
    digest: z.coerce.string().max(1_000).optional(),
  })
  .catch({});

// Simple in-memory token bucket — good enough for a single Vercel
// lambda instance. If we scale horizontally we'd move to Upstash
// or similar, but at that point we'd also be on Sentry proper.
type Bucket = { tokens: number; last: number };
const buckets = new Map<string, Bucket>();
const CAPACITY = Number(process.env.ERROR_LOG_RATE_CAPACITY ?? 20);
const REFILL_PER_SEC = 0.5;

function allow(ip: string): boolean {
  const now = Date.now();
  const b = buckets.get(ip) ?? { tokens: CAPACITY, last: now };
  const elapsed = (now - b.last) / 1000;
  b.tokens = Math.min(CAPACITY, b.tokens + elapsed * REFILL_PER_SEC);
  b.last = now;
  if (b.tokens < 1) {
    buckets.set(ip, b);
    return false;
  }
  b.tokens -= 1;
  buckets.set(ip, b);
  return true;
}

async function notifySlack(payload: {
  message: string;
  stack?: string;
  url?: string;
  userAgent?: string;
  source?: string;
  digest?: string;
}) {
  const hook = process.env.SLACK_ERROR_WEBHOOK_URL;
  if (!hook) return;

  const lines: string[] = [
    `:rotating_light: *Brand error* (${payload.source ?? "unknown"})`,
    `> ${payload.message.slice(0, 500)}`,
  ];
  if (payload.url) lines.push(`URL: \`${payload.url}\``);
  if (payload.digest) lines.push(`Digest: \`${payload.digest}\``);
  if (payload.userAgent) lines.push(`UA: \`${payload.userAgent.slice(0, 200)}\``);
  if (payload.stack) {
    lines.push("```" + payload.stack.split("\n").slice(0, 6).join("\n") + "```");
  }

  try {
    await fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: lines.join("\n") }),
    });
  } catch {
    // Swallow — sink shouldn't fail just because Slack is down.
  }
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!allow(ip)) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  // `.catch({})` guarantees success — schema only bounds/coerces, never
  // rejects, so a legit (if oddly-shaped) report still gets logged.
  const body = reportSchema.parse(raw);

  const message = (body.message ?? "client error").slice(0, 1000);
  const stack = body.stack ? body.stack.slice(0, 4000) : undefined;
  const url = body.url ? body.url.slice(0, 500) : undefined;
  const userAgent = body.userAgent ? body.userAgent.slice(0, 500) : undefined;
  const source = body.source ? body.source.slice(0, 50) : "brand";
  const digest = body.digest ? body.digest.slice(0, 100) : undefined;

  // Always land in Vercel logs — cheapest tier of visibility.
  console.error("[brand-error]", { message, url, source, digest });

  // Best-effort Slack notification. Don't await the response body.
  await notifySlack({ message, stack, url, userAgent, source, digest });

  return new NextResponse(null, { status: 204 });
}
