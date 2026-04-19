import type { Metadata } from "next";
import Link from "next/link";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

// /now — https://nownownow.com convention. A public "what I'm
// actually focused on right this quarter" page. Updated roughly
// monthly. Stays honest because it's dated; anyone checking a year
// later can see how plans held up. Good EEAT signal: concrete, recent,
// and signed with a timestamp.

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Now — what I'm focused on this quarter",
    description:
      "A monthly-ish snapshot of what Juan Diaz LLC is actually building, shipping, and thinking about. Last updated inline.",
    alternates: buildAlternates(l, "/now"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

const LAST_UPDATED = "2026-04-18";

const SHIPPING = [
  "Philly CRM v1.2 — field-team pipeline view, offline-first drafts.",
  "Voltafy installer mode — rolling out to first five installer partners in NL.",
  "Help Mij Besparen — new content cluster around thuisbatterij ROI post-2027.",
];

const WRITING = [
  "A long piece on why operator dashboards lie (half-drafted).",
  "Case notes from the salderingsregeling-2027 rollout work.",
  "A practical guide to 'buy the commodity, build the moat' with worked examples.",
];

const LEARNING = [
  "Where AI search (ChatGPT, Perplexity, Google AI Overviews) actually sources its citations — and what that means for SEO strategy in 2026.",
  "Practical Postgres + pgvector patterns for operator-scale knowledge bases.",
  "Spanish — slow and steady. El cazador doesn't hunt without the language.",
];

const NOT_DOING = [
  "New client engagements until July — the bench is full.",
  "Conferences. Ship first, speak later.",
  "Anything that requires a pitch deck.",
];

export default function NowPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Now</div>
        <h1>
          What I&apos;m <em>actually</em> building right now.
        </h1>
        <p>
          A monthly-ish snapshot of the work that has my attention. Short, dated, honest. If
          it isn&apos;t here, it isn&apos;t the focus.
        </p>
      </header>

      <article className="long">
        <div style={{ color: "var(--muted)", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 24 }}>
          Last updated {new Date(LAST_UPDATED).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        </div>

        <h2>Shipping</h2>
        <ul>
          {SHIPPING.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <h2>Writing</h2>
        <ul>
          {WRITING.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <h2>Learning</h2>
        <ul>
          {LEARNING.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <h2>Not doing</h2>
        <ul>
          {NOT_DOING.map((x, i) => <li key={i}>{x}</li>)}
        </ul>

        <p style={{ marginTop: 48 }}>
          If anything here matches what you&apos;re wrestling with,{" "}
          <Link href="/contact">start a conversation</Link>. If you want context on how I
          think, the <Link href="/insights">insights</Link> and{" "}
          <Link href="/story">story</Link> pages are the longer read. Tools I actually use
          are on <Link href="/uses">/uses</Link>.
        </p>
      </article>
    </>
  );
}
