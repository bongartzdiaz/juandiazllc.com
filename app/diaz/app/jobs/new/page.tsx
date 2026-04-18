import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { NewJobForm } from "@/components/diaz/NewJobForm";

export const metadata: Metadata = { title: "New job" };
export const dynamic = "force-dynamic";

export default async function NewJobPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/app/jobs/new");

  const { data: teams } = await supabase.from("teams").select("id,name,color").order("name");

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "140px 32px 120px" }}>
      <Link
        href="/diaz/app/jobs"
        style={{
          fontFamily: "'JetBrains Mono'",
          fontSize: 11,
          letterSpacing: ".14em",
          textTransform: "uppercase",
          color: "var(--muted-soft)",
          display: "inline-block",
          marginBottom: 24,
        }}
      >
        ← All jobs
      </Link>
      <h1 style={{ fontWeight: 300, fontSize: "clamp(40px, 5vw, 64px)", letterSpacing: "-.04em", lineHeight: 1, marginBottom: 12 }}>
        New <em>job.</em>
      </h1>
      <p style={{ color: "var(--muted)", fontSize: 17, lineHeight: 1.55, marginBottom: 40, maxWidth: "60ch" }}>
        Fill what you know. Assignment and schedule are optional — you can wire them up once the team takes it.
      </p>

      <NewJobForm teams={teams ?? []} />
    </div>
  );
}
