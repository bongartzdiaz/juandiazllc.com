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

    /* Cursor */
    const cur = document.getElementById("cursor");
    let cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    let tx = cx, ty = cy;
    const onMove = (e: MouseEvent) => { tx = e.clientX; ty = e.clientY; };
    window.addEventListener("mousemove", onMove);
    let raf = 0;
    const animCur = () => {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      if (cur) cur.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(animCur);
    };
    animCur();

    const hoverables = document.querySelectorAll("a, button, .v-card, .sec-card, .proc-step");
    const onEnter = () => cur?.classList.add("lg");
    const onLeave = () => cur?.classList.remove("lg");
    hoverables.forEach((el) => {
      el.addEventListener("mouseenter", onEnter);
      el.addEventListener("mouseleave", onLeave);
    });

    /* Card glow follow */
    const cards = document.querySelectorAll<HTMLElement>(".v-card, .sec-card");
    const cardHandlers = new Map<HTMLElement, (e: MouseEvent) => void>();
    cards.forEach((card) => {
      const handler = (e: MouseEvent) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty("--mx", `${((e.clientX - r.left) / r.width) * 100}%`);
        card.style.setProperty("--my", `${((e.clientY - r.top) / r.height) * 100}%`);
      };
      cardHandlers.set(card, handler);
      card.addEventListener("mousemove", handler);
    });

    /* 3D tilt on cards */
    const tiltCards = document.querySelectorAll<HTMLElement>(".v-card, .sec-card");
    const tiltHandlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();
    const isCoarse = window.matchMedia("(hover: none)").matches;
    if (!isCoarse) {
      tiltCards.forEach((card) => {
        const move = (e: MouseEvent) => {
          const r = card.getBoundingClientRect();
          const nx = (e.clientX - r.left) / r.width - 0.5;
          const ny = (e.clientY - r.top) / r.height - 0.5;
          const ry = nx * 6;
          const rx = -ny * 6;
          card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-4px)`;
        };
        const leave = () => { card.style.transform = ""; };
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", leave);
        tiltHandlers.set(card, { move, leave });
      });
    }

    /* Magnetic buttons */
    const mags = document.querySelectorAll<HTMLElement>(".btn-mag");
    const magHandlers = new Map<HTMLElement, { move: (e: MouseEvent) => void; leave: () => void }>();
    mags.forEach((b) => {
      const move = (e: MouseEvent) => {
        const r = b.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.28;
        const y = (e.clientY - r.top - r.height / 2) * 0.4;
        b.style.transform = `translate(${x}px,${y}px)`;
      };
      const leave = () => { b.style.transform = ""; };
      b.addEventListener("mousemove", move);
      b.addEventListener("mouseleave", leave);
      magHandlers.set(b, { move, leave });
    });

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

    /* Scramble text on reveal.
       Layout-stability contract (the old version scored CLS 4.2 on
       /insights): never leave a text node empty across a frame, and
       freeze the heading's box while the animation runs. Emptying the
       node collapsed the heading → every section below jumped up, then
       back down as the scramble refilled it — 15 layout shifts per page. */
    const randomChars = (final: string) => {
      let out = "";
      for (let i = 0; i < final.length; i++) {
        out += final[i] === " " ? " " : SCR_CHARS[Math.floor(Math.random() * SCR_CHARS.length)];
      }
      return out;
    };
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
    const scrambleUnfreeze = new Map<HTMLElement, number>();
    // Static text for reduced-motion users — and no CLS risk either.
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefersReduce) try {
      const targets = document.querySelectorAll(".sec-head h2, .story-lead, .kinetic .sub span:first-child, .page-hero h1");
      sio = new IntersectionObserver(
        (entries) => {
          entries.forEach((e) => {
            if (!e.isIntersecting) return;
            try {
              const el = e.target as HTMLElement;
              // Clamp the box: same-length scramble chars include wide
              // glyphs (█▓▒), so mid-animation the text can wrap to an
              // extra line and grow the element — shifting every section
              // below it. Fixing both bounds + clipping keeps the outer
              // geometry constant for the whole animation.
              const boxH = el.getBoundingClientRect().height;
              el.style.minHeight = `${boxH}px`;
              el.style.maxHeight = `${boxH}px`;
              el.style.overflow = "hidden";
              const nodes: Node[] = [];
              (function walk(node: Node) {
                node.childNodes.forEach((c) => {
                  if (c.nodeType === 3 && c.textContent?.trim()) nodes.push(c);
                  else if (c.nodeType === 1) walk(c);
                });
              })(el);
              let lastEnd = 0;
              nodes.forEach((node, i) => {
                const t = node.textContent ?? "";
                if (!t) return;
                // Atomic swap: the span carries same-length placeholder
                // text from the same frame the node is cleared, so the
                // heading never collapses.
                const span = document.createElement("span");
                span.className = "scramble";
                span.textContent = randomChars(t);
                node.textContent = "";
                node.parentNode?.insertBefore(span, node);
                const delay = i * 60;
                const duration = 700 + i * 80;
                window.setTimeout(() => scramble(span, t, duration), delay);
                lastEnd = Math.max(lastEnd, delay + duration);
              });
              scrambleUnfreeze.set(
                el,
                window.setTimeout(() => {
                  el.style.minHeight = "";
                  el.style.maxHeight = "";
                  el.style.overflow = "";
                }, lastEnd + 250),
              );
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
      scrambleUnfreeze.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("load", finish);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("scroll", onScrollCta);
      cancelAnimationFrame(raf);
      hoverables.forEach((el) => {
        el.removeEventListener("mouseenter", onEnter);
        el.removeEventListener("mouseleave", onLeave);
      });
      cards.forEach((card) => {
        const h = cardHandlers.get(card);
        if (h) card.removeEventListener("mousemove", h);
      });
      tiltCards.forEach((card) => {
        const h = tiltHandlers.get(card);
        if (h) {
          card.removeEventListener("mousemove", h.move);
          card.removeEventListener("mouseleave", h.leave);
        }
      });
      mags.forEach((b) => {
        const h = magHandlers.get(b);
        if (h) {
          b.removeEventListener("mousemove", h.move);
          b.removeEventListener("mouseleave", h.leave);
        }
      });
      io.disconnect();
      sio?.disconnect();
    };
  }, []);

  return null;
}
