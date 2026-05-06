import { NextRequest, NextResponse } from "next/server";
import { requireScope, jsonError } from "@/lib/philly/auth-helpers";
import { liClient } from "@/lib/supabase/li-client";
import { leadSearchQuery, leadSortFieldEnum } from "@/lib/philly/validation/schemas";
import { logger } from "@/lib/philly/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/outreach/leads
 *   ?status=sourced|icp_scored|assigned|connection_sent|...
 *   ?campaign=<campaign_id>
 *   ?account=<account_id>
 *   ?search=<name or company>      (sanitized — PostgREST delimiters stripped)
 *   ?segment=1|2|3
 *   ?sort=icp_score|created_at|status|last_reply_at|...   (allowlisted)
 *   ?dir=asc|desc
 *   ?limit=50
 *   ?offset=0
 */
export async function GET(req: NextRequest) {
  const scope = await requireScope();
  if (scope instanceof NextResponse) return scope;

  const db = liClient();
  const url = new URL(req.url);

  const status = url.searchParams.get("status");
  const campaign = url.searchParams.get("campaign");
  const account = url.searchParams.get("account");
  const segment = url.searchParams.get("segment");

  // Allowlist sort field — anything outside the enum falls back to created_at
  const sortRaw = url.searchParams.get("sort") ?? "created_at";
  const sortParse = leadSortFieldEnum.safeParse(sortRaw);
  const sort = sortParse.success ? sortParse.data : "created_at";
  const dir = url.searchParams.get("dir") === "asc" ? true : false;

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  // Sanitize search — strips PostgREST delimiters that could break out of or()
  const searchRaw = url.searchParams.get("search");
  const searchParse = searchRaw ? leadSearchQuery.safeParse(searchRaw) : null;
  const search = searchParse?.success ? searchParse.data : null;

  let query = db
    .from("leads")
    .select(
      `id, first_name, last_name, headline, title, seniority,
       country, region, icp_score, icp_segment, priority, status,
       do_not_contact, linkedin_url, source, followup_count,
       assigned_account_id, campaign_id, company_id,
       connection_sent_at, connection_accepted_at,
       first_dm_sent_at, last_reply_at, discovery_call_at,
       created_at, updated_at`,
      { count: "exact" },
    )
    .range(offset, offset + limit - 1)
    .order(sort, { ascending: dir });

  if (status) query = query.eq("status", status);
  if (campaign) query = query.eq("campaign_id", campaign);
  if (account) query = query.eq("assigned_account_id", account);
  if (segment) query = query.eq("icp_segment", Number(segment));
  if (search) {
    query = query.or(
      `first_name.ilike.%${search}%,last_name.ilike.%${search}%,headline.ilike.%${search}%,title.ilike.%${search}%`,
    );
  }

  const { data: leads, error, count } = await query;
  if (error) {
    logger.error("[outreach/leads] list query failed", { error: error.message, scope: scope.userId });
    return jsonError("Could not load leads", 500);
  }

  // Enrich with company name + account slug + campaign slug
  const companyIds = [...new Set((leads ?? []).map((l: any) => l.company_id).filter(Boolean))];
  const accountIds = [...new Set((leads ?? []).map((l: any) => l.assigned_account_id).filter(Boolean))];
  const campaignIds = [...new Set((leads ?? []).map((l: any) => l.campaign_id).filter(Boolean))];

  const [compRes, accRes, campRes] = await Promise.all([
    companyIds.length > 0
      ? db.from("companies").select("id, name, country, website").in("id", companyIds)
      : Promise.resolve({ data: [] }),
    accountIds.length > 0
      ? db.from("accounts").select("id, slug, display_name").in("id", accountIds)
      : Promise.resolve({ data: [] }),
    campaignIds.length > 0
      ? db.from("campaigns").select("id, slug, name, type").in("id", campaignIds)
      : Promise.resolve({ data: [] }),
  ]);

  const companies: any[] = compRes.data ?? [];
  const accounts: any[] = accRes.data ?? [];
  const campaigns: any[] = campRes.data ?? [];

  const compMap = new Map(companies.map((c) => [c.id, c]));
  const accMap = new Map(accounts.map((a) => [a.id, a]));
  const campMap = new Map(campaigns.map((c) => [c.id, c]));

  const enriched = (leads ?? []).map((l: any) => {
    const company: any = compMap.get(l.company_id);
    const acc: any = accMap.get(l.assigned_account_id);
    const camp: any = campMap.get(l.campaign_id);
    return {
      ...l,
      company_name: company?.name ?? null,
      company_country: company?.country ?? null,
      account_slug: acc?.slug ?? null,
      account_name: acc?.display_name ?? null,
      campaign_slug: camp?.slug ?? null,
      campaign_name: camp?.name ?? null,
      campaign_type: camp?.type ?? null,
    };
  });

  return NextResponse.json({
    data: enriched,
    meta: { total: count ?? 0, limit, offset },
  });
}
