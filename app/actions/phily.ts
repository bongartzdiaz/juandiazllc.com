"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

async function orgId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("phily_users").select("organization_id").eq("id", user.id).single();
  return data?.organization_id ?? null;
}

// ── Projects ──

export type ProjectResult = { ok: boolean; id?: string; message?: string };

export async function createProject(formData: FormData): Promise<ProjectResult> {
  const org = await orgId();
  if (!org) return { ok: false, message: "Not authenticated." };

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const status = String(formData.get("status") ?? "planned");
  const category = String(formData.get("category") ?? "general");
  const start_date = String(formData.get("start_date") ?? new Date().toISOString().slice(0, 10));
  const end_date = String(formData.get("end_date") ?? "") || null;
  const budget_cents = Math.round(parseFloat(String(formData.get("budget") ?? "0")) * 100) || 0;
  const sdg_goals_raw = String(formData.get("sdg_goals") ?? "");
  const sdg_goals = sdg_goals_raw
    .split(",")
    .map((s) => parseInt(s.trim()))
    .filter((n) => n >= 1 && n <= 17);

  if (!title) return { ok: false, message: "Title is required." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .insert({
      organization_id: org,
      title,
      description,
      status,
      category,
      start_date,
      end_date,
      budget_cents,
      sdg_goals,
    })
    .select("id")
    .single();
  if (error) return { ok: false, message: error.message };
  revalidatePath("/philly/projects");
  revalidatePath("/philly");
  return { ok: true, id: data.id };
}

export async function updateProjectStatus(id: string, status: string) {
  const supabase = await createClient();
  await supabase.from("projects").update({ status }).eq("id", id);
  revalidatePath("/philly/projects");
  revalidatePath("/philly");
}

export async function deleteProject(id: string) {
  const supabase = await createClient();
  await supabase.from("projects").delete().eq("id", id);
  revalidatePath("/philly/projects");
  revalidatePath("/philly");
}

// ── Contacts ──

export async function createContact(formData: FormData) {
  const org = await orgId();
  if (!org) return { ok: false, message: "Not authenticated." };

  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const type = String(formData.get("type") ?? "stakeholder");
  const company = String(formData.get("company") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();

  if (!name) return { ok: false, message: "Name is required." };

  const supabase = await createClient();
  const { error } = await supabase.from("contacts").insert({
    organization_id: org,
    name,
    email,
    phone,
    type,
    company,
    notes,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/philly/contacts");
  revalidatePath("/philly");
  return { ok: true };
}

export async function deleteContact(id: string) {
  const supabase = await createClient();
  await supabase.from("contacts").delete().eq("id", id);
  revalidatePath("/philly/contacts");
}

// ── Impact metrics ──

export async function addImpactMetric(formData: FormData) {
  const project_id = String(formData.get("project_id") ?? "");
  const metric_type = String(formData.get("metric_type") ?? "custom");
  const value = parseFloat(String(formData.get("value") ?? "0"));
  const unit = String(formData.get("unit") ?? "");
  const notes = String(formData.get("notes") ?? "");
  if (!project_id || isNaN(value)) return { ok: false, message: "Project and value required." };

  const supabase = await createClient();
  const { error } = await supabase.from("impact_metrics").insert({
    project_id,
    metric_type,
    value,
    unit,
    notes,
  });
  if (error) return { ok: false, message: error.message };
  revalidatePath("/philly/impact");
  revalidatePath("/philly");
  return { ok: true };
}

// ── Kanban ──

export async function createKanbanCard(columnId: string, title: string) {
  if (!title.trim()) return { ok: false };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("kanban_cards")
    .select("position")
    .eq("column_id", columnId)
    .order("position", { ascending: false })
    .limit(1);
  const position = (existing?.[0]?.position ?? 0) + 1;
  await supabase.from("kanban_cards").insert({ column_id: columnId, title: title.trim(), position });
  revalidatePath("/philly/kanban");
  return { ok: true };
}

export async function moveKanbanCard(cardId: string, toColumnId: string, toPosition: number) {
  const supabase = await createClient();
  await supabase
    .from("kanban_cards")
    .update({ column_id: toColumnId, position: toPosition })
    .eq("id", cardId);
  revalidatePath("/philly/kanban");
}

export async function deleteKanbanCard(id: string) {
  const supabase = await createClient();
  await supabase.from("kanban_cards").delete().eq("id", id);
  revalidatePath("/philly/kanban");
}

// ── Seed a default kanban board if none exists ──

export async function ensureDefaultKanbanBoard(): Promise<string | null> {
  const org = await orgId();
  if (!org) return null;
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("kanban_boards")
    .select("id")
    .eq("organization_id", org)
    .limit(1)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: board } = await supabase
    .from("kanban_boards")
    .insert({ organization_id: org, title: "Operations" })
    .select("id")
    .single();
  if (!board) return null;

  const columns = [
    { title: "Backlog", position: 0, color: "#94A3B8" },
    { title: "In progress", position: 1, color: "#5EFFB1" },
    { title: "Review", position: 2, color: "#7DD3FC" },
    { title: "Done", position: 3, color: "#8BA89A" },
  ];
  await supabase
    .from("kanban_columns")
    .insert(columns.map((c) => ({ ...c, board_id: board.id })));
  return board.id;
}
