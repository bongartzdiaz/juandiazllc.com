import { createClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _liClient: any = null;

/**
 * Supabase service-role client targeting the `li` (LinkedIn outreach) schema.
 * Singleton — safe to call from any API route.
 *
 * The Supabase generated `Database` type only covers the public schema in
 * this repo. Hand-rolled types below mirror what the routes actually
 * select; keep them in sync if a column is added or renamed.
 */
export function liClient() {
  if (_liClient) return _liClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SERVICE_ROLE_KEY for li schema");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _liClient = createClient(url, key, { db: { schema: "li" } } as any);
  return _liClient;
}

/* ── Hand-rolled row types for the li.* schema ─────────────────────────
   The generated Database type doesn't cover the li schema, so these
   mirror what the routes actually `.select(...)`. */

export type LeadStatus =
  | "sourced" | "enriched" | "icp_scored" | "assigned"
  | "connection_sent" | "connection_accepted"
  | "first_dm_sent" | "follow_up_sent"
  | "reply_received" | "reply_classified" | "nba_sent"
  | "discovery_call_booked" | "partner_signed" | "handed_off"
  | "disqualified" | "do_not_contact" | "not_interested" | "dormant_90d";

export type LeadPriority = "low" | "normal" | "high" | "urgent";

export type MessageStatus =
  | "draft" | "pending_approval" | "approved" | "sent" | "failed";

export type MessageType =
  | "connection_note" | "first_dm" | "follow_up" | "nba";

/** Columns selected by the leads list route. */
export interface LiLeadListRow {
  id: string;
  first_name: string;
  last_name: string;
  headline: string | null;
  title: string | null;
  seniority: string | null;
  country: string;
  region: string | null;
  icp_score: number | null;
  icp_segment: number | null;
  priority: LeadPriority;
  status: LeadStatus;
  do_not_contact: boolean;
  linkedin_url: string;
  source: string;
  followup_count: number;
  assigned_account_id: string | null;
  campaign_id: string | null;
  company_id: string | null;
  connection_sent_at: string | null;
  connection_accepted_at: string | null;
  first_dm_sent_at: string | null;
  last_reply_at: string | null;
  discovery_call_at: string | null;
  created_at: string;
  updated_at: string;
}

/** Columns selected by the messages list route. */
export interface LiMessageRow {
  id: string;
  lead_id: string;
  account_id: string;
  campaign_id: string;
  type: MessageType;
  status: MessageStatus;
  body: string;
  char_count: number | null;
  prompt_version: string | null;
  model_used: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

/** Columns selected by the lead-detail timeline messages projection. */
export interface LiTimelineMessageRow {
  id: string;
  type: MessageType;
  status: MessageStatus;
  body: string;
  char_count: number | null;
  model_used: string | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  created_at: string;
}

/** Columns selected by the lead-detail replies projection. */
export interface LiReplyRow {
  id: string;
  raw_text: string;
  classification: string | null;
  classification_confidence: number | null;
  model_used: string | null;
  classified_at: string | null;
  detected_at: string | null;
  created_at: string;
}

export interface LiGdprEventRow {
  id: string;
  event_type: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

/* Enrichment projections (just the columns the list/detail routes pull
   when joining to look up names). */

export interface LiCompanyEnrichment {
  id: string;
  name: string | null;
  country: string | null;
  website: string | null;
}

export interface LiAccountEnrichment {
  id: string;
  slug: string;
  display_name: string;
}

export interface LiAccountDetail extends LiAccountEnrichment {
  real_human_name: string | null;
  linkedin_url: string | null;
  status: string;
}

export interface LiCampaignEnrichment {
  id: string;
  slug: string;
  name: string;
  type: string;
}

export interface LiCampaignDetail extends LiCampaignEnrichment {
  description: string | null;
  target_countries: string[] | null;
  status: string;
}

/** Errors view row used by the dashboard. */
export interface LiErrorRow {
  id: string;
  error_type: string;
  resolved: boolean;
  detected_at: string;
  account_slug: string | null;
  message: string | null;
}
