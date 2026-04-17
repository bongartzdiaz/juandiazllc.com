"use client";

import { useActionState } from "react";
import Link from "next/link";
import { subscribe, type SubscribeState } from "@/app/actions/subscribe";

const initial: SubscribeState = { status: "idle" };

export function CtaBig() {
  const [state, formAction, pending] = useActionState(subscribe, initial);

  return (
    <section className="cta-big" id="cta">
      <div className="label">◉ Work with me</div>
      <h2 data-reveal>Ready to find the revenue you&apos;re <em>leaving on the table?</em></h2>
      <p className="lede" data-reveal>
        One founder. Five phases. Zero fluff. The <em>blueprint call</em> is free and blunt. If I can help, I will. If I can&apos;t, I&apos;ll tell you who can — and send you on your way.
      </p>
      <div className="btns" data-reveal>
        <Link className="btn primary btn-mag" href="/contact">
          Book a blueprint call <span className="arr">→</span>
        </Link>
        <Link className="btn ghost" href="/work">
          See the playbook <span className="arr">→</span>
        </Link>
      </div>
      <form className="news" data-reveal action={formAction}>
        <input
          type="email"
          name="email"
          placeholder="— Your email for the field notes"
          required
          disabled={state.status === "ok"}
        />
        <input type="hidden" name="source" value="cta_landing" />
        <button type="submit" disabled={pending || state.status === "ok"}>
          {state.status === "ok" ? "✓ Subscribed" : pending ? "..." : "Subscribe"}
        </button>
      </form>
      {state.status !== "idle" && state.message && (
        <div
          className="news-hint"
          style={{ color: state.status === "ok" ? "var(--accent)" : "#FF9B9B" }}
        >
          {state.message}
        </div>
      )}
      {state.status === "idle" && (
        <div className="news-hint" data-reveal>
          ◐ Monthly, blunt, useful. No spam, ever.
        </div>
      )}
    </section>
  );
}
