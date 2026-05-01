import { NextRequest, NextResponse } from "next/server";
import { requireScope, jsonError } from "@/lib/philly/auth-helpers";
import { liClient } from "@/lib/supabase/li-client";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const db = liClient();
  const url = new URL(req.url);
  const view = url.searchParams.get("view");

  if (view === "funnel") {
    const { data, error } = await db.from("v_pipeline_funnel").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "campaigns") {
    const { data, error } = await db.from("v_campaign_performance").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "accounts") {
    const { data, error } = await db.from("v_account_daily").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "replies") {
    const { data, error } = await db.from("v_reply_breakdown").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "costs") {
    const { data, error } = await db.from("v_ai_costs").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "countries") {
    const { data, error } = await db.from("v_country_heatmap").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  if (view === "errors") {
    const { data, error } = await db.from("v_recent_errors").select("*");
    if (error) return jsonError(error.message, 500);
    return NextResponse.json({ data });
  }

  // Default: return summary + all views
  const [funnel, campaigns, accounts, replies, costs, countries, errors, leadCount, accountCount, campaignCount] =
    await Promise.all([
      db.from("v_pipeline_funnel").select("*"),
      db.from("v_campaign_performance").select("*"),
      db.from("v_account_daily").select("*"),
      db.from("v_reply_breakdown").select("*"),
      db.from("v_ai_costs").select("*"),
      db.from("v_country_heatmap").select("*"),
      db.from("v_recent_errors").select("*"),
      db.from("leads").select("id", { count: "exact", head: true }),
      db.from("accounts").select("id", { count: "exact", head: true }).in("status", ["active", "warming"]),
      db.from("campaigns").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

  // Message queue counts
  const [pendingMsgs, approvedMsgs, sentMsgs, draftMsgs] = await Promise.all([
    db.from("messages").select("id", { count: "exact", head: true }).eq("status", "pending_approval"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("status", "sent"),
    db.from("messages").select("id", { count: "exact", head: true }).eq("status", "draft"),
  ]);

  return NextResponse.json({
    data: {
      summary: {
        total_leads: leadCount.count ?? 0,
        active_accounts: accountCount.count ?? 0,
        active_campaigns: campaignCount.count ?? 0,
      },
      message_queue: {
        pending_approval: pendingMsgs.count ?? 0,
        approved: approvedMsgs.count ?? 0,
        sent: sentMsgs.count ?? 0,
        draft: draftMsgs.count ?? 0,
      },
      funnel: funnel.data ?? [],
      campaigns: campaigns.data ?? [],
      accounts: accounts.data ?? [],
      replies: replies.data ?? [],
      costs: costs.data ?? [],
      countries: countries.data ?? [],
      errors: errors.data ?? [],
    },
  });
}
