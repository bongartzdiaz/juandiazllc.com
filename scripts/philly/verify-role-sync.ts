/* scripts/philly/verify-role-sync.ts — verification pass for the
   MariaDB ↔ Supabase role sync added in auth-helpers.ts.

   For every Philly User row, fetch the corresponding Supabase auth
   user and compare: does app_metadata.role match User.role?

   Run:
     npx tsx scripts/philly/verify-role-sync.ts

   Requires env:
     DATABASE_URL (MariaDB)
     NEXT_PUBLIC_SUPABASE_URL
     SUPABASE_SERVICE_ROLE_KEY (not the anon key — we need admin)

   Read-only. Reports drift but does not write. If you want to
   force re-sync, either have each user re-login (requireScope
   will reconcile) or extend this script with a --fix flag that
   calls supabase.auth.admin.updateUserById. */

import "dotenv/config";

type Row = { id: string; email: string; role: string };

async function main() {
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaMariaDb } = await import("@prisma/adapter-mariadb");
  const { createClient } = await import("@supabase/supabase-js");

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Supabase env vars not set (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY)");
    process.exit(1);
  }

  const adapter = new PrismaMariaDb(process.env.DATABASE_URL);
  const prisma = new PrismaClient({ adapter });

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } }
  );

  const users = (await prisma.user.findMany({
    select: { id: true, email: true, role: true },
  })) as unknown as Row[];

  console.log(`Checking ${users.length} users...\n`);

  let inSync = 0;
  let drift = 0;
  let missing = 0;

  // Build email -> supabase user map. Paginate because listUsers
  // caps at ~50/page; we page until we have everyone referenced.
  const byEmail = new Map<string, { id: string; app_metadata: Record<string, unknown> | null }>();
  let page = 1;
  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
    if (error) {
      console.error("listUsers failed:", error);
      process.exit(1);
    }
    for (const u of data.users) {
      if (u.email) byEmail.set(u.email.toLowerCase(), { id: u.id, app_metadata: u.app_metadata ?? null });
    }
    if (data.users.length < 200) break;
    page++;
  }

  for (const u of users) {
    const sb = byEmail.get(u.email.toLowerCase());
    if (!sb) {
      console.log(`  [not-found]    ${u.email} — no Supabase user with that email`);
      missing++;
      continue;
    }
    const metaRole = (sb.app_metadata as Record<string, unknown> | null)?.role;
    if (metaRole === u.role) {
      inSync++;
    } else {
      drift++;
      console.log(
        `  [drift]        ${u.email} — mariadb=${u.role} supabase=${String(metaRole ?? "(none)")}`
      );
    }
  }

  console.log(`\nSummary: ${inSync} in sync, ${drift} drift, ${missing} missing`);
  console.log(
    drift > 0
      ? "Drift will reconcile on next login of each affected user (requireScope writes app_metadata.role)."
      : "All good."
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
