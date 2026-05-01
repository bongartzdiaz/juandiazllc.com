import { NextRequest, NextResponse } from "next/server";
import { requireScope, jsonError } from "@/lib/philly/auth-helpers";
import { liClient } from "@/lib/supabase/li-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/outreach/leads/[id]
 *
 * Returns the full lead profile with:
 *   - Lead fields
 *   - Company info
 *   - Account + campaign info
 *   - All messages (ordered by created_at)
 *   - All replies (ordered by detected_at)
 *   - GDPR events
 *   - Conversation timeline (messages + replies merged chronologically)
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const { id } = await params;
  const db = liClient();

  // Fetch lead
  const { data: lead, error: leadErr } = await db
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();

  if (leadErr || !lead) return jsonError("Lead not found", 404);

  // Parallel fetch related data
  const [compRes, accRes, campRes, msgsRes, repliesRes, gdprRes] =
    await Promise.all([
      lead.company_id
        ? db.from("companies").select("*").eq("id", lead.company_id).single()
        : Promise.resolve({ data: null }),
      lead.assigned_account_id
        ? db
            .from("accounts")
            .select("id, slug, display_name, real_human_name, linkedin_url, status")
            .eq("id", lead.assigned_account_id)
            .single()
        : Promise.resolve({ data: null }),
      lead.campaign_id
        ? db
            .from("campaigns")
            .select("id, slug, name, type, description, target_countries, status")
            .eq("id", lead.campaign_id)
            .single()
        : Promise.resolve({ data: null }),
      db
        .from("messages")
        .select(
          `id, type, status, body, char_count, model_used,
           approved_by, approved_at, sent_at, error_message, created_at`,
        )
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
      db
        .from("replies")
        .select(
          `id, raw_text, classification, classification_confidence,
           model_used, classified_at, detected_at, created_at`,
        )
        .eq("lead_id", id)
        .order("detected_at", { ascending: true }),
      db
        .from("gdpr_events")
        .select("id, event_type, details, created_at")
        .eq("lead_id", id)
        .order("created_at", { ascending: true }),
    ]);

  // Build chronological timeline from messages + replies
  const messages: any[] = msgsRes.data ?? [];
  const replies: any[] = repliesRes.data ?? [];

  const timeline = [
    ...messages.map((m: any) => ({
      id: m.id,
      kind: "message" as const,
      type: m.type,
      status: m.status,
      body: m.body,
      char_count: m.char_count,
      model_used: m.model_used,
      approved_at: m.approved_at,
      sent_at: m.sent_at,
      error_message: m.error_message,
      timestamp: m.sent_at ?? m.created_at,
    })),
    ...replies.map((r: any) => ({
      id: r.id,
      kind: "reply" as const,
      classification: r.classification,
      classification_confidence: r.classification_confidence,
      body: r.raw_text,
      model_used: r.model_used,
      timestamp: r.detected_at ?? r.created_at,
    })),
  ].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  );

  return NextResponse.json({
    data: {
      lead,
      company: compRes.data ?? null,
      account: accRes.data ?? null,
      campaign: campRes.data ?? null,
      messages,
      replies,
      gdpr_events: gdprRes.data ?? [],
      timeline,
    },
  });
}

/**
 * PATCH /api/outreach/leads/[id]
 *
 * Update lead fields: status, priority, notes, do_not_contact, dnc_reason
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const { id } = await params;
  const db = liClient();

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const allowedFields = [
    "status",
    "priority",
    "notes",
    "do_not_contact",
    "dnc_reason",
    "icp_segment",
  ];

  const updates: Record<string, unknown> = {};
  for (const key of allowedFields) {
    if (key in body) updates[key] = body[key];
  }

  if (Object.keys(updates).length === 0) {
    return jsonError("No valid fields to update", 400);
  }

  // If marking DNC, also log GDPR event
  if (updates.do_not_contact === true) {
    await db.from("gdpr_events").insert({
      lead_id: id,
      account_id: null,
      event_type: "opt_out",
      details: {
        reason: updates.dnc_reason ?? "manual_dashboard",
        by: scope.email ?? scope.userId,
      },
    });
  }

  const { data, error } = await db
    .from("leads")
    .update(updates)
    .eq("id", id)
    .select("id, status, priority, do_not_contact")
    .single();

  if (error) return jsonError(error.message, 500);

  return NextResponse.json({ data });
}
