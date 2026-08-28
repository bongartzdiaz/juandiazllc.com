// Brand-side client error sink. The CRM left with #134 and lives in
// bongartzdiaz/DEUS-SHARED with its own sink. This one is deliberately
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
import { maakLimiet, sleutelUitVerzoek, leesBegrensd, TeGroot } from "@/lib/verzoeklimiet";

export const runtime = "nodejs";

// Was een eigen kopie van het token-bucket-algoritme; staat nu in
// lib/verzoeklimiet.ts, samen met die van vitals. Capaciteit en snelheid
// blijven wat ze waren.
const limiet = maakLimiet({
  capaciteit: Number(process.env.ERROR_LOG_RATE_CAPACITY ?? 20),
  perSeconde: 0.5,
});

/** stack wordt hieronder op 4000 tekens gekapt, message op 1000. Een body
    die daar ver boven zit draagt niets bij. */
const MAX_BYTES = 32 * 1024;

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
  if (!limiet.toestaan(sleutelUitVerzoek(req))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  let body: Record<string, unknown> = {};
  try {
    const text = await leesBegrensd(req, MAX_BYTES);
    body = text ? JSON.parse(text) : {};
  } catch (e) {
    if (e instanceof TeGroot) {
      return NextResponse.json({ ok: false, error: "too_large" }, { status: 413 });
    }
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
