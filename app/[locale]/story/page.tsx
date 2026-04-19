import type { Metadata } from "next";
import { assertLocale, buildAlternates, ogLocale, alternateOgLocales } from "@/lib/i18n/metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  const l = assertLocale(locale);
  return {
    title: "Story — construction-trained, operator-built",
    description:
      "The story behind Juan Diaz LLC — construction management, the crossover to revenue operations, and why I build honest software for operators.",
    alternates: buildAlternates(l, "/story"),
    openGraph: { locale: ogLocale(l), alternateLocale: alternateOgLocales(l) },
  };
}

export default function StoryPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ The story</div>
        <h1>I build the tools I <em>couldn&apos;t</em> find.</h1>
        <p>
          A founder-hunter&apos;s take on why most businesses don&apos;t have revenue problems — they have
          blueprint problems. Written from Amsterdam, built for anywhere.
        </p>
      </header>

      <article className="long">
        <p>
          I grew up between two worlds — the Netherlands and a family that taught me another one.
          My people called me <em>el cazador.</em> The hunter. Patient. Specific about what I&apos;m after.
          What I&apos;ve been hunting, for most of a decade now, is the same thing: honest software for
          operators who are getting underserved by a market that keeps building for the screenshot
          instead of the shift.
        </p>

        <h2>Construction <em>as a teacher</em></h2>
        <p>
          I trained as a <strong>construction manager</strong>. Construction is the most ruthless
          discipline I know. You cannot lie to a building. Concrete either sets or it doesn&apos;t. Steel
          either holds or it doesn&apos;t. The schedule either ships or everyone goes home unpaid.
        </p>
        <p>
          What you learn — fast — is that every great build runs on the same five moves: survey,
          blueprint, build, commission, operate. Skip any one of them and the whole thing leaks.
          Survey too thin and you&apos;ll discover surprises once the cost clock is running. Skip
          commissioning and the client finds the faults instead of you.
        </p>

        <h2>The <em>crossover</em></h2>
        <p>
          At some point it clicked that every business I was touching as a studio client looked
          exactly like a badly-run construction project. Brilliant operators. Ambitious goals. No
          site survey. No sequencing. No honest numbers. A <em>vibe</em> for a blueprint.
        </p>
        <blockquote>
          Most businesses don&apos;t have revenue problems. They have blueprint problems.
        </blockquote>
        <p>
          So I stopped treating my work as &quot;branding&quot; or &quot;marketing&quot; or &quot;dev&quot; and started running
          it the way a construction manager runs a build. The revenue engine is the building. The
          five phases are the method. That&apos;s Juan Diaz LLC.
        </p>

        <h2>What I&apos;m <em>building now</em></h2>
        <p>
          Energy is the first big vertical, because the Dutch grid is about to change — the
          salderingsregeling ends January 1, 2027, and millions of households will wake up on a
          different economic model overnight. That&apos;s the kind of deadline that lets you make
          intentional bets. Voltafy, Performance Tracker, Help Mij Besparen, and Salderingsregeling
          2027 are each one phase of that larger play.
        </p>
        <p>
          Real estate, hospitality, logistics — they&apos;re next, because the same five-phase method
          works everywhere there are operators and a P&amp;L. That&apos;s the thesis, and I&apos;ll defend it
          with my schedule: <em>the next decade of great software gets built by operators, for
          operators.</em> I&apos;d rather be one of them than sell to them — and bring a few of you along
          while I&apos;m at it.
        </p>

        <p style={{ marginTop: 56 }}>
          — Juan Stefan Diaz<br />
          <span style={{ color: "var(--muted-soft)", fontSize: 14, letterSpacing: ".08em", textTransform: "uppercase", fontFamily: "'JetBrains Mono'" }}>
            Sole founder · Juan Diaz LLC
          </span>
        </p>
      </article>
    </>
  );
}
