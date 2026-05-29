"use server";

import { createClient } from "@/lib/supabase/server";

export type ContactState = { status: "idle" | "ok" | "err"; message?: string };

// Contact submission pipeline.
// - Primary: insert into Supabase `leads` so nothing is ever lost.
// - Secondary: best-effort email to juan@ via Resend (only if
//   RESEND_API_KEY is set — otherwise silently skipped). We don't
//   fail the user if the email hop breaks, since the lead row is
//   already persisted.
// - Spam: honeypot field ("website") + min-length message. The
//   honeypot is a hidden input that real users never touch; bots
//   fill every field they can find. If it's non-empty, we fake-ok
//   so the bot doesn't retry, and skip all side effects.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
// Lead notifications land in Juan's Proton inbox by default. Override
// per-environment with CONTACT_NOTIFY_TO. The lead is ALSO persisted to
// Supabase regardless, so nothing is lost even if the email hop fails.
const NOTIFY_TO = process.env.CONTACT_NOTIFY_TO ?? "diazJSBD@proton.me";
const NOTIFY_FROM = process.env.CONTACT_NOTIFY_FROM ?? "noreply@juandiazllc.com";

async function notifyEmail(payload: {
  name: string;
  email: string;
  company: string;
  sector: string;
  message: string;
  source: string;
}) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return; // silently no-op if not configured

  const subject = `New contact — ${payload.name || payload.email}${payload.company ? " @ " + payload.company : ""}`;
  const text =
    `New blueprint-call request from juandiazllc.com\n\n` +
    `Name:    ${payload.name || "(not provided)"}\n` +
    `Email:   ${payload.email}\n` +
    `Company: ${payload.company || "(not provided)"}\n` +
    `Sector:  ${payload.sector || "(not provided)"}\n` +
    `Source:  ${payload.source}\n\n` +
    `Message:\n${payload.message}\n`;

  try {
    await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        from: NOTIFY_FROM,
        to: [NOTIFY_TO],
        reply_to: payload.email,
        subject,
        text,
      }),
    });
  } catch {
    // Swallow — the row is safe in Supabase, email is just a nicety.
  }
}

export async function submitLead(
  _prev: ContactState,
  formData: FormData
): Promise<ContactState> {
  // Honeypot: real users never fill this (hidden via CSS). Bots do.
  const honeypot = String(formData.get("website") ?? "").trim();
  if (honeypot) {
    // Pretend success so bots don't retry; skip all real side effects.
    return { status: "ok", message: "Got it. I'll come back to you within 24 hours." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const company = String(formData.get("company") ?? "").trim();
  const sector = String(formData.get("sector") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();
  const source = String(formData.get("source") ?? "contact_page");

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { status: "err", message: "Enter a valid email." };
  }
  if (!message || message.length < 10) {
    return { status: "err", message: "Tell me a bit more — at least a sentence." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("leads")
      .insert({ name, email, company, sector, message, source });

    if (error) {
      return { status: "err", message: "Something went wrong. Try again." };
    }

    // Fire-and-forget email notification. Don't await failure to the user.
    await notifyEmail({ name, email, company, sector, message, source });

    return {
      status: "ok",
      message: "Got it. I'll come back to you within 24 hours.",
    };
  } catch {
    return { status: "err", message: "Network error. Try again." };
  }
}
