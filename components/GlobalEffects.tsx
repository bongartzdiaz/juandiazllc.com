"use client";

import { useEffect } from "react";

const SCR_CHARS = "!<>-_\\/[]{}—=+*^?#█▓▒░01";

export function GlobalEffects() {
  useEffect(() => {
    /* Preloader — dismiss as soon as the page is painted. The fake
       counter that used to ramp 0→100 over ~1s was gating the hero
       behind a full-viewport dark overlay for up to 3.5s on slow JS
       paths ("blank black screen until you scroll" bug). Now: flip
       both classes on window.load (or immediately if already complete),
       with a 900ms failsafe for anything that stalls. */
    const pc = document.getElementById("preloadCount");
    const pre = document.getElementById("preload");
    const finish = () => {
      if (pc) pc.textContent = "100";
      if (pre && !pre.classList.contains("done")) {
        pre.classList.add("done");
        document.body.classList.add("loaded");
      }
    };
    if (document.readyState === "complete") {
      finish();
    } else {
      window.addEventListener("load", finish, { once: true });
    }
    const failsafe = window.setTimeout(finish, 900);

    /* Cursor-tracking visual effects (card glow follow / 3D tilt /
       magnetic buttons) were removed in Bundle AZ — they were
       distracting and felt gimmicky on touch devices that mostly
       saw stuck transforms after a tap. Cards now use plain CSS
       hover states. */

    /* Floating CTA */
    const floatCta = document.getElementById("floatCta");
    const cta = document.getElementById("cta");
    const onScrollCta = () => {
      if (!floatCta) return;
      const past = window.scrollY > window.innerHeight * 0.9;
      let inCta = false;
      if (cta) {
        const r = cta.getBoundingClientRect();
        inCta = r.top < window.innerHeight && r.bottom > 0;
      }
      floatCta.classList.toggle("show", past && !inCta);
    };
    window.addEventListener("scroll", onScrollCta, { passive: true });
    onScrollCta();

    /* Reveal on scroll */
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll("[data-reveal]").forEach((el) => io.observe(el));

    /* Scramble text on reveal */
    function scramble(el: Element, final: string, duration = 900) {
      const N = final.length;
      const start = performance.now();
      function frame(t: number) {
        const p = Math.min(1, (t - start) / duration);
        let out = "";
        for (let i = 0; i < N; i++) {
          const reveal = p * N;
          if (i < reveal - 2) out += final[i];
          else if (final[i] === " ") out += " ";
          else out += SCR_CHARS[Math.floor(Math.random() * SCR_CHARS.length)];
        }
        el.textContent = out;
        if (p < 1) requestAnimationFrame(frame);
        else el.textContent = final;
      }
      requestAnimationFrame(frame);
    }
    let sio: IntersectionObserver | null = null;
    try {
      const targets = document.querySelectorAll(".sec-head h2, .story-lead, .kinetic .sub span:first-child, .page-hero h1");
      sio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            try {
              const el = e.target;
              const nodes: Node[] = [];
              (function walk(node: Node) {
                node.childNodes.forEach((c) => {
                  if (c.nodeType === 3 && c.textContent?.trim()) nodes.push(c);
                  else if (c.nodeType === 1) walk(c);
                });
              })(el);
              nodes.forEach((node, i) => {
                const t = node.textContent ?? "";
                if (!t) return;
                node.textContent = "";
                window.setTimeout(() => {
                  try {
                    const span = document.createElement("span");
                    span.className = "scramble";
                    if (node.parentNode) {
                      node.parentNode.insertBefore(span, node);
                      scramble(span, t, 700 + i * 80);
                    }
                  } catch {}
                }, i * 60);
              });
            } catch {}
            sio?.unobserve(e.target);
          });
        },
        { threshold: 0.35 }
      );
      targets.forEach((el) => sio!.observe(el));
    } catch {}

    return () => {
      window.clearTimeout(failsafe);
      window.removeEventListener("load", finish);
      window.removeEventListener("scroll", onScrollCta);
      io.disconnect();
      sio?.disconnect();
    };
  }, []);

  return null;
}
