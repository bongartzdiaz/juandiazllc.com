import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { DashboardFrame } from "@/components/diaz/DashboardFrame";

export const metadata: Metadata = { title: "DEUS Dashboard" };
export const dynamic = "force-dynamic";

export default async function AppPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/app");

  return <DashboardFrame />;
}
