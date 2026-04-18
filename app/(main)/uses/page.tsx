import type { Metadata } from "next";
import Link from "next/link";

// /uses — https://uses.tech convention. What I actually build with.
// Public so clients, collaborators, and hires know the stack before
// they ask. Also a small EEAT signal — concrete, specific, updated.
//
// Links that go out are affiliate-free. If something shows up here
// it's because I use it every week, not because someone paid for it.

export const metadata: Metadata = {
  title: "Uses — the stack behind Juan Diaz LLC",
  description:
    "The tools, frameworks, services and hardware I actually use to build revenue engines. No affiliate links. Updated as the stack evolves.",
  alternates: { canonical: "/uses" },
};

type Item = { name: string; note: string; url?: string };

const STACK: Array<{ section: string; items: Item[] }> = [
  {
    section: "Building the web",
    items: [
      { name: "Next.js 16", note: "App Router, server actions, route groups. Nothing beats it for operator dashboards right now.", url: "https://nextjs.org" },
      { name: "TypeScript", note: "Strict mode from day one. Types are a refactor superpower once the codebase is past ~10k lines." },
      { name: "Tailwind + CSS variables", note: "Tailwind for utility, CSS custom properties for theming. Keeps both sides honest." },
      { name: "Three.js", note: "For hero scenes where a gradient isn't enough. Used sparingly.", url: "https://threejs.org" },
    ],
  },
  {
    section: "Data + infra",
    items: [
      { name: "Supabase", note: "Postgres + auth + storage. Brand side and every consumer product I ship.", url: "https://supabase.com" },
      { name: "Prisma 7 + MariaDB", note: "Philly CRM runs on MariaDB via the Prisma adapter. Chosen for ops team compatibility, not fashion." },
      { name: "Vercel", note: "Edge CDN + serverless. For everything that doesn't need persistent state I start here.", url: "https://vercel.com" },
      { name: "Cloudflare", note: "DNS + caching in front of the origins that aren't on Vercel." },
    ],
  },
  {
    section: "Operator tooling",
    items: [
      { name: "Philly", note: "My own CRM — operator-first, field-team-first. Obviously.", url: "/work/philly" },
      { name: "GoHighLevel", note: "For client sites where we need a full WhatsApp + pipeline stack fast." },
      { name: "DM Champ", note: "WhatsApp automation layer on top of GHL for Dutch consumer funnels." },
      { name: "n8n (self-hosted)", note: "Orchestration for things that don't fit inside one app. Self-hosted on Digital Ocean." },
    ],
  },
  {
    section: "AI in the loop",
    items: [
      { name: "Claude (Anthropic)", note: "Primary reasoning model. Code, content, extraction.", url: "https://claude.ai" },
      { name: "Claude Code", note: "Agent-style coding sessions. Pair-programs cleanly with a strict codebase." },
      { name: "Relevance AI", note: "For the multi-agent pipelines that outlive a single request." },
    ],
  },
  {
    section: "Writing + shipping",
    items: [
      { name: "VS Code", note: "With Claude + the usual suspects." },
      { name: "Linear", note: "Only project tracker I've tolerated for more than a quarter." },
      { name: "Notion", note: "Client-facing docs + the part of the ops wiki that isn't in code." },
      { name: "GitHub", note: "Everything public + everything private. Branch-per-feature, squash-merge.", url: "https://github.com/bongartzdiaz" },
    ],
  },
  {
    section: "Hardware",
    items: [
      { name: "MacBook Pro (M4)", note: "Main driver. Runs the whole stack locally including the Philly DB." },
      { name: "Ultrawide 34\"", note: "Code on the left, reference / docs on the right. Non-negotiable for me." },
      { name: "Keychron K3", note: "Low-profile mechanical. Types for hours without the wrist tax." },
      { name: "Moleskine + rollerball", note: "Pre-build sketches still happen on paper. Some systems clarify faster that way." },
    ],
  },
];

export default function UsesPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Uses</div>
        <h1>
          The stack behind <em>the build</em>.
        </h1>
        <p>
          What I actually use — not what ended up on a vendor logo wall. No affiliate links, no
          referral codes. If it&apos;s listed, it earns its slot every week.
        </p>
      </header>

      <article className="long">
        {STACK.map((group) => (
          <section key={group.section}>
            <h2>{group.section}</h2>
            <ul>
              {group.items.map((it) => (
                <li key={it.name}>
                  {it.url ? (
                    it.url.startsWith("/") ? (
                      <Link href={it.url}>
                        <strong>{it.name}</strong>
                      </Link>
                    ) : (
                      <a href={it.url} target="_blank" rel="noopener noreferrer">
                        <strong>{it.name}</strong>
                      </a>
                    )
                  ) : (
                    <strong>{it.name}</strong>
                  )}{" "}
                  — {it.note}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p style={{ marginTop: 48 }}>
          Something missing you&apos;d expect here? <Link href="/contact">Say hi</Link> — I
          keep this page honest partly because readers flag the blind spots.
        </p>
      </article>
    </>
  );
}
