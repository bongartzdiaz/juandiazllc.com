import type { Metadata } from "next";
import { LocaleLink } from "@/components/LocaleLink";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";
import { translate } from "@/lib/i18n/dict";

// /uses — https://uses.tech convention. What I actually build with.
// Public so clients, collaborators, and hires know the stack before
// they ask. Also a small EEAT signal — concrete, specific, updated.
//
// Links that go out are affiliate-free. If something shows up here
// it's because I use it every week, not because someone paid for it.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: translate(l, "meta.uses.title"),
    description: translate(l, "meta.uses.description"),
    alternates: buildAlternates(l, "/uses"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

type Item = { name: string; noteKey: string; url?: string };

const STACK: Array<{ sectionKey: string; items: Item[] }> = [
  {
    sectionKey: "uses.sec.web",
    items: [
      { name: "Next.js 16", noteKey: "uses.web.nextjs", url: "https://nextjs.org" },
      { name: "TypeScript", noteKey: "uses.web.ts" },
      { name: "Tailwind + CSS variables", noteKey: "uses.web.tw" },
      { name: "Three.js", noteKey: "uses.web.three", url: "https://threejs.org" },
    ],
  },
  {
    sectionKey: "uses.sec.data",
    items: [
      { name: "Supabase", noteKey: "uses.data.supabase", url: "https://supabase.com" },
      { name: "Prisma 7 + MariaDB", noteKey: "uses.data.prisma" },
      { name: "Vercel", noteKey: "uses.data.vercel", url: "https://vercel.com" },
      { name: "Cloudflare", noteKey: "uses.data.cloudflare" },
    ],
  },
  {
    sectionKey: "uses.sec.operator",
    items: [
      { name: "Philly", noteKey: "uses.op.philly", url: "/work/philly" },
      { name: "GoHighLevel", noteKey: "uses.op.ghl" },
      { name: "DM Champ", noteKey: "uses.op.dmchamp" },
      { name: "n8n (self-hosted)", noteKey: "uses.op.n8n" },
    ],
  },
  {
    sectionKey: "uses.sec.ai",
    items: [
      { name: "Claude (Anthropic)", noteKey: "uses.ai.claude", url: "https://claude.ai" },
      { name: "Claude Code", noteKey: "uses.ai.code" },
      { name: "Relevance AI", noteKey: "uses.ai.relevance" },
    ],
  },
  {
    sectionKey: "uses.sec.ship",
    items: [
      { name: "VS Code", noteKey: "uses.ship.vscode" },
      { name: "Linear", noteKey: "uses.ship.linear" },
      { name: "Notion", noteKey: "uses.ship.notion" },
      { name: "GitHub", noteKey: "uses.ship.github", url: "https://github.com/bongartzdiaz" },
    ],
  },
  {
    sectionKey: "uses.sec.hw",
    items: [
      { name: "MacBook Pro (M4)", noteKey: "uses.hw.mbp" },
      { name: "Ultrawide 34\"", noteKey: "uses.hw.ultrawide" },
      { name: "Keychron K3", noteKey: "uses.hw.keychron" },
      { name: "Moleskine + rollerball", noteKey: "uses.hw.moleskine" },
    ],
  },
];

export default async function UsesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const l = assertLocale(locale);
  const t = (k: string) => translate(l, k);

  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">{t("uses.eyebrow")}</div>
        <h1 dangerouslySetInnerHTML={{ __html: t("uses.title") }} />
        <p>{t("uses.lede")}</p>
      </header>

      <article className="long">
        {STACK.map((group) => (
          <section key={group.sectionKey}>
            <h2>{t(group.sectionKey)}</h2>
            <ul>
              {group.items.map((it) => (
                <li key={it.name}>
                  {it.url ? (
                    it.url.startsWith("/") ? (
                      <LocaleLink href={it.url}>
                        <strong>{it.name}</strong>
                      </LocaleLink>
                    ) : (
                      <a href={it.url} target="_blank" rel="noopener noreferrer">
                        <strong>{it.name}</strong>
                      </a>
                    )
                  ) : (
                    <strong>{it.name}</strong>
                  )}{" "}
                  — {t(it.noteKey)}
                </li>
              ))}
            </ul>
          </section>
        ))}

        <p style={{ marginTop: 48 }}>
          {t("uses.outro.1")} <LocaleLink href="/contact">{t("uses.outro.link")}</LocaleLink> {t("uses.outro.2")}
        </p>
      </article>
    </>
  );
}
