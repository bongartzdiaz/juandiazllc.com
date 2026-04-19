"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatDate, type Insight } from "@/lib/insights";
import { useT } from "@/lib/i18n/useT";

// Client-side tag filter + search over the insights list.
// Keeps everything on /insights (no route changes, no server round-
// trips) — the post set is small, so shipping it to the client is
// cheaper than a query param dance. The "All" pill resets both
// filters. Search is a simple case-insensitive substring over title
// + summary + tag — nothing fancy, but it handles the 80% case
// (Googler lands on /insights, scans for "battery", narrows fast).

type Props = { posts: Insight[] };

export function InsightsList({ posts }: Props) {
  const t = useT();
  const [tag, setTag] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const tags = useMemo(() => {
    const set = new Set<string>();
    posts.forEach((p) => set.add(p.tag));
    return Array.from(set).sort();
  }, [posts]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return posts.filter((p) => {
      if (tag && p.tag !== tag) return false;
      if (query) {
        const hay = (p.title + " " + p.summary + " " + p.tag).toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }, [posts, tag, q]);

  return (
    <>
      <div className="insights-controls">
        <div className="insights-tags" role="group" aria-label={t("insights.filter.aria")}>
          <button
            type="button"
            className="tag-pill"
            data-active={tag === null}
            onClick={() => setTag(null)}
          >
            {t("insights.filter.all")} <span className="tp-count">{posts.length}</span>
          </button>
          {tags.map((tg) => {
            const count = posts.filter((p) => p.tag === tg).length;
            return (
              <button
                key={tg}
                type="button"
                className="tag-pill"
                data-active={tag === tg}
                onClick={() => setTag(tag === tg ? null : tg)}
              >
                {tg} <span className="tp-count">{count}</span>
              </button>
            );
          })}
        </div>
        <label className="insights-search">
          <span className="sr-only">{t("insights.search.aria")}</span>
          <input
            type="search"
            placeholder={t("insights.search.placeholder")}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            autoComplete="off"
            spellCheck={false}
          />
        </label>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: 14,
          marginTop: 24,
        }}
      >
        {filtered.map((p) => (
          <Link
            key={p.slug}
            href={`/insights/${p.slug}`}
            className="insight-card"
            data-reveal
          >
            <div className="ic-top">
              <span className="ic-tag">— {p.tag}</span>
              <span className="ic-meta">
                {formatDate(p.publishedAt)} · {p.readingMinutes} min
              </span>
            </div>
            <h2 className="ic-title">{p.title}</h2>
            <p className="ic-sum">{p.summary}</p>
            <span className="ic-read">
              {t("insights.card.read")} <span className="arr">→</span>
            </span>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="insights-empty">
          <p>{t("insights.empty")}</p>
          <button
            type="button"
            className="tag-pill"
            onClick={() => {
              setTag(null);
              setQ("");
            }}
          >
            {t("insights.empty.reset")}
          </button>
        </div>
      )}
    </>
  );
}
