import { NextRequest, NextResponse } from "next/server";
import { requireScope, requireRole, jsonError } from "@/lib/philly/auth-helpers";
import { liClient } from "@/lib/supabase/li-client";
import { validateBody } from "@/lib/philly/validation";
import { updateOutreachMessageSchema } from "@/lib/philly/validation/schemas";
import { enforceRateLimit, PRESET_MUTATION } from "@/lib/philly/rate-limit";
import { logger } from "@/lib/philly/logger";

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
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);

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
  if (error) {
    logger.error("[outreach/messages] list query failed", { error: error.message, scope: scope.userId });
    return jsonError("Could not load messages", 500);
  }

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
 *   Body: { id: uuid, action: "approve" | "reject" }
 *   Body: { id: uuid, action: "edit", body: string }
 *
 * Approve gates outbound LinkedIn DMs — operator/admin only.
 */
export async function PATCH(req: NextRequest) {
  const scope = await requireRole(["admin", "manager"]);
  if (scope instanceof NextResponse) return scope;

  const limited = enforceRateLimit(`outreach:messages:${scope.userId}`, PRESET_MUTATION);
  if (limited) return limited;

  const parsed = await validateBody(req, updateOutreachMessageSchema);
  if (!parsed.success) return parsed.response;
  const input = parsed.data;

  const db = liClient();

  // Confirm the message exists before mutating
  const { data: msg, error: fetchErr } = await db
    .from("messages")
    .select("id, status")
    .eq("id", input.id)
    .single();

  if (fetchErr || !msg) return jsonError("Message not found", 404);

  if (input.action === "approve") {
    const { error } = await db
      .from("messages")
      .update({
        status: "approved",
        approved_by: scope.email ?? scope.userId,
        approved_at: new Date().toISOString(),
      })
      .eq("id", input.id);

    if (error) {
      logger.error("[outreach/messages] approve failed", { id: input.id, error: error.message, by: scope.userId });
      return jsonError("Could not approve message", 500);
    }
    return NextResponse.json({ data: { id: input.id, status: "approved" } });
  }

  if (input.action === "reject") {
    const { error } = await db
      .from("messages")
      .update({ status: "draft" })
      .eq("id", input.id);

    if (error) {
      logger.error("[outreach/messages] reject failed", { id: input.id, error: error.message, by: scope.userId });
      return jsonError("Could not reject message", 500);
    }
    return NextResponse.json({ data: { id: input.id, status: "draft" } });
  }

  // input.action === "edit"
  const { error } = await db
    .from("messages")
    .update({
      body: input.body,
      char_count: input.body.length,
      status: "pending_approval",
    })
    .eq("id", input.id);

  if (error) {
    logger.error("[outreach/messages] edit failed", { id: input.id, error: error.message, by: scope.userId });
    return jsonError("Could not save edit", 500);
  }
  return NextResponse.json({ data: { id: input.id, status: "pending_approval", body: input.body } });
}
