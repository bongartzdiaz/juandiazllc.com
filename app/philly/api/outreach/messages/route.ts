import { NextRequest, NextResponse } from "next/server";
import { requireScope, jsonError } from "@/lib/philly/auth-helpers";
import { liClient } from "@/lib/supabase/li-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/outreach/messages
 *   ?status=draft|pending_approval|approved|sent|failed
 *   ?type=connection_note|first_dm|follow_up|nba
 *   ?limit=50
 *
 * Returns messages joined with lead name + account slug.
 */
export async function GET(req: NextRequest) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const db = liClient();
  const url = new URL(req.url);
  const status = url.searchParams.get("status") ?? "pending_approval";
  const type = url.searchParams.get("type");
  const limit = Math.min(Number(url.searchParams.get("limit") ?? 50), 200);

  let query = db
    .from("messages")
    .select(`
      id, lead_id, account_id, campaign_id, type, status, body,
      char_count, prompt_version, model_used, approved_by, approved_at,
      sent_at, error_message, created_at, updated_at
    `)
    .eq("status", status)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (type) query = query.eq("type", type);

  const { data: messages, error } = await query;
  if (error) return jsonError(error.message, 500);

  // Enrich with lead + account names
  const leadIds = [...new Set((messages ?? []).map((m: any) => m.lead_id))];
  const accountIds = [...new Set((messages ?? []).map((m: any) => m.account_id))];

  const [leadRes, accRes] = await Promise.all([
    leadIds.length > 0
      ? db.from("leads").select("id, first_name, last_name, company_id, headline, linkedin_url").in("id", leadIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? db.from("accounts").select("id, slug, display_name").in("id", accountIds)
      : Promise.resolve({ data: [] }),
  ]);

  const leads: any[] = leadRes.data ?? [];
  const accs: any[] = accRes.data ?? [];
  const leadMap = new Map(leads.map((l) => [l.id, l]));
  const accMap = new Map(accs.map((a) => [a.id, a]));

  const enriched = (messages ?? []).map((m: any) => {
    const lead: any = leadMap.get(m.lead_id);
    const account: any = accMap.get(m.account_id);
    return {
      ...m,
      lead_name: lead ? `${lead.first_name} ${lead.last_name}` : "Unknown",
      lead_headline: lead?.headline ?? null,
      lead_linkedin_url: lead?.linkedin_url ?? null,
      account_slug: account?.slug ?? "unknown",
      account_name: account?.display_name ?? "unknown",
    };
  });

  return NextResponse.json({ data: enriched });
}

/**
 * PATCH /api/outreach/messages
 *   Body: { id: string, action: "approve" | "reject" | "edit", body?: string }
 */
export async function PATCH(req: NextRequest) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const db = liClient();

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonError("Invalid JSON body", 400);
  }

  const { id, action, body: newBody } = body as {
    id?: string;
    action?: string;
    body?: string;
  };

  if (!id) return jsonError("Missing message id", 400);
  if (!action || !["approve", "reject", "edit"].includes(action)) {
    return jsonError("action must be approve, reject, or edit", 400);
  }

  // Fetch current message
  const { data: msg, error: fetchErr } = await db
    .from("messages")
    .select("id, status")
    .eq("id", id)
    .single();

  if (fetchErr || !msg) return jsonError("Message not found", 404);

  if (action === "approve") {
    const { error } = await db
      .from("messages")
      .update({
        status: "approved",
        approved_by: scope.email ?? scope.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data: { id, status: "approved" } });
  }

  if (action === "reject") {
    const { error } = await db
      .from("messages")
      .update({ status: "draft" })
      .eq("id", id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data: { id, status: "draft" } });
  }

  if (action === "edit") {
    if (!newBody || typeof newBody !== "string") {
      return jsonError("body is required for edit action", 400);
    }
    const { error } = await db
      .from("messages")
      .update({
        body: newBody,
        char_count: newBody.length,
        status: "pending_approval",
      })
      .eq("id", id);

    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data: { id, status: "pending_approval", body: newBody } });
  }

  return jsonError("Unknown action", 400);
}
