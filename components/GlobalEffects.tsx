"use client";

import { useEffect } from "react";

const SCR_CHARS = "!<>-_\\/[]{}—=+*^?#█▓▒░01";

export function GlobalEffects() {
  useEffect(() => {
    /* Preloader + failsafe */
    const pc = document.getElementById("preloadCount");
    const pre = document.getElementById("preload");
    let n = 0;
    const finish = () => {
      if (pre && !pre.classList.contains("done")) {
        pre.classList.add("done");
        document.body.classList.add("loaded");
      }
    };
    const pl = window.setInterval(() => {
      n = Math.min(100, n + Math.ceil(Math.random() * 6));
      if (pc) pc.textContent = String(n).padStart(3, "0");
      if (n >= 100) {
        window.clearInterval(pl);
        window.setTimeout(finish, 300);
      }
    }, 35);
    const failsafe = window.setTimeout(finish, 2600);

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
      window.clearInterval(pl);
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
