"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export type JobState = { status: "idle" | "ok" | "err"; message?: string };

export async function createJob(_prev: JobState, formData: FormData): Promise<JobState> {
  const title = String(formData.get("title") ?? "").trim();
  const customer = String(formData.get("customer") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const assigned_team = String(formData.get("assigned_team") ?? "");
  const scheduled_for = String(formData.get("scheduled_for") ?? "");

  if (!title) return { status: "err", message: "Job title is required." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "err", message: "Not signed in." };

  const payload: Record<string, unknown> = {
    title,
    customer: customer || null,
    address: address || null,
    notes: notes || null,
    created_by: user.id,
  };
  if (assigned_team) {
    payload.assigned_team = assigned_team;
    payload.status = "assigned";
  }
  if (scheduled_for) payload.scheduled_for = scheduled_for;

  const { data, error } = await supabase.from("jobs").insert(payload).select("id").single();
  if (error) return { status: "err", message: error.message };

  await supabase.from("job_updates").insert({
    job_id: data.id,
    author: user.id,
    message: `Job created${assigned_team ? " and assigned" : ""}.`,
    kind: "event",
  });

  revalidatePath("/app/jobs");
  redirect(`/app/jobs/${data.id}`);
}

export async function updateJobStatus(jobId: string, status: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { error } = await supabase.from("jobs").update({ status }).eq("id", jobId);
  if (error) return;
  await supabase.from("job_updates").insert({
    job_id: jobId,
    author: user.id,
    message: `Status changed to ${status.replace("_", " ")}.`,
    kind: "event",
  });
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app/jobs");
}

export async function addJobNote(jobId: string, formData: FormData) {
  const message = String(formData.get("message") ?? "").trim();
  if (!message) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("job_updates").insert({
    job_id: jobId,
    author: user.id,
    message,
    kind: "note",
  });
  revalidatePath(`/app/jobs/${jobId}`);
}

export async function assignJob(jobId: string, teamId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: team } = await supabase.from("teams").select("name").eq("id", teamId).single();
  await supabase
    .from("jobs")
    .update({ assigned_team: teamId, status: "assigned" })
    .eq("id", jobId);
  await supabase.from("job_updates").insert({
    job_id: jobId,
    author: user.id,
    message: `Assigned to team ${team?.name ?? "?"}.`,
    kind: "event",
  });
  revalidatePath(`/app/jobs/${jobId}`);
  revalidatePath("/app/jobs");
}
