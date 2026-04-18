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

export const runtime = "nodejs";

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

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const message = String(body.message ?? "client error").slice(0, 1000);
  const stack = body.stack ? String(body.stack).slice(0, 4000) : undefined;
  const url = body.url ? String(body.url).slice(0, 500) : undefined;
  const userAgent = body.userAgent ? String(body.userAgent).slice(0, 500) : undefined;
  const source = body.source ? String(body.source).slice(0, 50) : "brand";
  const digest = body.digest ? String(body.digest).slice(0, 100) : undefined;

  // Always land in Vercel logs — cheapest tier of visibility.
  console.error("[brand-error]", { message, url, source, digest });

  // Best-effort Slack notification. Don't await the response body.
  await notifySlack({ message, stack, url, userAgent, source, digest });

  return new NextResponse(null, { status: 204 });
}
