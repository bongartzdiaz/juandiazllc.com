/**
 * Supabase query helpers for the Phily dashboard.
 * Every function is server-side (called from Server Components / Server Actions).
 * RLS auto-scopes everything to the current user's organization via current_org_id().
 */
import { createClient } from "@/lib/supabase/server";

// ── Projects ───────────────────────────────────────────────────────────────

export type Project = {
  id: string;
  organization_id: string;
  title: string;
  description: string;
  status: "planned" | "active" | "completed" | "paused";
  category: string;
  start_date: string;
  end_date: string | null;
  budget_cents: number;
  spent_cents: number;
  sdg_goals: number[];
  created_at: string;
  updated_at: string;
};

export async function listProjects(): Promise<Project[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Project[];
}

export async function getProject(id: string): Promise<Project | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("projects").select("*").eq("id", id).single();
  return (data ?? null) as Project | null;
}

// ── Contacts ───────────────────────────────────────────────────────────────

export type Contact = {
  id: string;
  organization_id: string;
  name: string;
  email: string;
  phone: string;
  type: "partner" | "beneficiary" | "stakeholder" | "donor";
  company: string;
  notes: string;
  avatar_url: string | null;
  created_at: string;
};

export async function listContacts(): Promise<Contact[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) return [];
  return (data ?? []) as Contact[];
}

// ── Impact metrics ─────────────────────────────────────────────────────────

export type ImpactMetric = {
  id: string;
  project_id: string;
  metric_type: "co2_kg" | "people_helped" | "trees_planted" | "money_donated" | "water_liters" | "energy_kwh" | "custom";
  value: number;
  unit: string;
  date: string;
  notes: string;
};

export async function listImpactMetrics(): Promise<ImpactMetric[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("impact_metrics")
    .select("*")
    .order("date", { ascending: false });
  if (error) return [];
  return (data ?? []) as ImpactMetric[];
}

export async function impactSummary() {
  const metrics = await listImpactMetrics();
  const projects = await listProjects();
  const sumBy = (type: ImpactMetric["metric_type"]) =>
    metrics.filter((m) => m.metric_type === type).reduce((a, m) => a + m.value, 0);
  return {
    totalCO2Kg: sumBy("co2_kg"),
    totalPeopleHelped: sumBy("people_helped"),
    totalTreesPlanted: sumBy("trees_planted"),
    totalMoneyDonated: sumBy("money_donated"),
    totalWaterLiters: sumBy("water_liters"),
    totalEnergyKwh: sumBy("energy_kwh"),
    totalProjects: projects.length,
    activeProjects: projects.filter((p) => p.status === "active").length,
  };
}

// ── Kanban ─────────────────────────────────────────────────────────────────

export type KanbanBoard = {
  id: string;
  organization_id: string;
  title: string;
  created_at: string;
};

export type KanbanColumn = {
  id: string;
  board_id: string;
  title: string;
  position: number;
  color: string;
};

export type KanbanCard = {
  id: string;
  column_id: string;
  project_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string;
  position: number;
  priority: "low" | "medium" | "high" | "urgent";
  due_date: string | null;
};

export async function listKanbanBoards(): Promise<KanbanBoard[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("kanban_boards")
    .select("*")
    .order("created_at", { ascending: true });
  return (data ?? []) as KanbanBoard[];
}

export async function getKanbanBoardWithCards(boardId: string) {
  const supabase = await createClient();
  const [cols, cards] = await Promise.all([
    supabase.from("kanban_columns").select("*").eq("board_id", boardId).order("position"),
    supabase
      .from("kanban_cards")
      .select("*")
      .in(
        "column_id",
        (
          await supabase.from("kanban_columns").select("id").eq("board_id", boardId)
        ).data?.map((c) => c.id) ?? []
      )
      .order("position"),
  ]);
  return {
    columns: (cols.data ?? []) as KanbanColumn[],
    cards: (cards.data ?? []) as KanbanCard[],
  };
}

// ── Current user + org ────────────────────────────────────────────────────

export async function getCurrentUserContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: phUser } = await supabase
    .from("phily_users")
    .select("*, organization:organizations(*)")
    .eq("id", user.id)
    .single();
  return { auth: user, profile: phUser };
}

// ── Project milestones ────────────────────────────────────────────────────

export type Milestone = {
  id: string;
  project_id: string;
  title: string;
  due_date: string;
  completed_at: string | null;
  status: "pending" | "completed" | "overdue";
};

export async function listMilestones(): Promise<Milestone[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_milestones")
    .select("*")
    .order("due_date", { ascending: true });
  return (data ?? []) as Milestone[];
}

// ── Recent activity (cross-entity) ────────────────────────────────────────

export type ActivityEntry = {
  id: string;
  kind: "project" | "contact" | "kanban" | "impact" | "milestone";
  title: string;
  detail?: string;
  at: string;
};

export async function recentActivity(limit = 10): Promise<ActivityEntry[]> {
  const supabase = await createClient();
  const [projects, contacts, impact, cards] = await Promise.all([
    supabase.from("projects").select("id,title,status,created_at,updated_at").order("updated_at", { ascending: false }).limit(limit),
    supabase.from("contacts").select("id,name,type,company,created_at").order("created_at", { ascending: false }).limit(limit),
    supabase.from("impact_metrics").select("id,metric_type,value,unit,date").order("date", { ascending: false }).limit(limit),
    supabase.from("kanban_cards").select("id,title").order("id", { ascending: false }).limit(limit),
  ]);
  const all: ActivityEntry[] = [
    ...(projects.data ?? []).map((p) => ({
      id: `p-${p.id}`,
      kind: "project" as const,
      title: `Project ${p.status === "completed" ? "completed" : "updated"}: ${p.title}`,
      at: p.updated_at,
    })),
    ...(contacts.data ?? []).map((c) => ({
      id: `c-${c.id}`,
      kind: "contact" as const,
      title: `New contact: ${c.name}`,
      detail: c.company || c.type,
      at: c.created_at,
    })),
    ...(impact.data ?? []).map((m) => ({
      id: `i-${m.id}`,
      kind: "impact" as const,
      title: `${m.metric_type.replace("_", " ")} +${m.value} ${m.unit}`.trim(),
      at: m.date,
    })),
    ...(cards.data ?? []).map((k) => ({
      id: `k-${k.id}`,
      kind: "kanban" as const,
      title: `Kanban card: ${k.title}`,
      at: new Date().toISOString(),
    })),
  ];
  return all.sort((a, b) => b.at.localeCompare(a.at)).slice(0, limit);
}

// ── Dashboard aggregates ───────────────────────────────────────────────────

export async function dashboardAggregates() {
  const [projects, contacts, impact, boards] = await Promise.all([
    listProjects(),
    listContacts(),
    impactSummary(),
    listKanbanBoards(),
  ]);

  const activeProjects = projects.filter((p) => p.status === "active").length;
  const plannedProjects = projects.filter((p) => p.status === "planned").length;
  const completedProjects = projects.filter((p) => p.status === "completed").length;

  const totalBudgetCents = projects.reduce((a, p) => a + (p.budget_cents ?? 0), 0);
  const totalSpentCents = projects.reduce((a, p) => a + (p.spent_cents ?? 0), 0);

  return {
    projects: {
      total: projects.length,
      active: activeProjects,
      planned: plannedProjects,
      completed: completedProjects,
      list: projects.slice(0, 8),
    },
    contacts: { total: contacts.length },
    impact,
    kanban: { boardCount: boards.length },
    budget: {
      total: totalBudgetCents / 100,
      spent: totalSpentCents / 100,
      remaining: (totalBudgetCents - totalSpentCents) / 100,
    },
  };
}
