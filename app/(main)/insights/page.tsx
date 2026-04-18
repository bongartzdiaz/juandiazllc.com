import type { Metadata } from "next";
import { getAllInsights } from "@/lib/insights";
import { InsightsList } from "@/components/InsightsList";

// /insights — long-form writing. Primary SEO surface after the home
// page: each post is a standalone URL with its own Article schema,
// and the list page is keyword-dense around the brand topics
// (operator CRM, revenue systems, energy funnels).
export const metadata: Metadata = {
  title: "Insights — operator systems, energy funnels, revenue engines",
  description:
    "Field notes on building the systems that move real P&Ls. Operator CRMs, energy funnels, build-vs-buy — written for the people who own the number.",
  alternates: { canonical: "/insights" },
  openGraph: {
    title: "Insights — Juan Diaz LLC",
    description:
      "Field notes on building the systems that move real P&Ls.",
    type: "website",
    url: "/insights",
  },
};

export default function InsightsIndex() {
  const posts = getAllInsights();

  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Insights</div>
        <h1>
          Field notes from <em>the build</em>.
        </h1>
        <p>
          Short pieces on the systems I actually ship — operator CRMs, energy funnels,
          the decisions that separate a stack you own from a stack that owns you. No
          gated PDFs. No newsletter wall.
        </p>
      </header>

      <section
        style={{
          padding: "40px 40px 140px",
          maxWidth: "var(--max)",
          margin: "0 auto",
        }}
      >
        <InsightsList posts={posts} />
      </section>
    </>
  );
}
