import type { FaqItem } from "@/lib/seo/schema";

// Pure server component. Renders an accessible <details> list that:
//   - crawlers read without executing JS
//   - users expand/collapse without a client bundle
//   - answer-box scrapers extract from the same prose the schema mirrors
export function FaqSection({ title, items }: { title: string; items: FaqItem[] }) {
  if (items.length === 0) return null;
  return (
    <section className="faq-section" aria-labelledby="faq-heading">
      <div className="faq-inner">
        <div className="eyebrow">FAQ</div>
        <h2 id="faq-heading">{title}</h2>
        <div className="faq-list">
          {items.map((it, i) => (
            <details key={i} className="faq-item">
              <summary>{it.q}</summary>
              <p>{it.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
