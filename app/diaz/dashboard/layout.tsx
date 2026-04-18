import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientLayout } from "@/components/phily/layout/ClientLayout";
import "./phily.css";

export const metadata: Metadata = {
  title: { default: "Diaz · Dashboard", template: "%s · Diaz Dashboard" },
  description: "Juan Diaz LLC operations dashboard.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PhilyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/dashboard");

  return <ClientLayout>{children}</ClientLayout>;
}
