"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import { useT } from "@/lib/i18n/useT";

// Interactive earth — every country is a clickable path. On click we
// animate the projection's rotate() + scale() to fly to the country,
// then slide in an info panel. Pure SVG, no WebGL; orthographic
// projection gives a real sphere that rotates in true 3D.
//
// Rendering architecture: the country layer + all rotation/zoom updates
// are IMPERATIVE (direct DOM writes into a <g ref>), not React state.
// The previous React version re-rendered 177 <path> elements per
// rotation frame — on slow hardware (Lighthouse CI runners, low-end
// laptops) a single frame crossed the 50ms long-task threshold and the
// home page's TBT ballooned. Direct `d`-attribute writes cost a few ms
// per frame and never involve the reconciler. React owns only the
// static chrome (sphere, defs), interaction state (hover hint,
// selected panel) and container size.

type CountryProps = { name: string };
type CountryFeature = Feature<Geometry, CountryProps>;

const ROTATION_SPEED = 0.05; // deg per 16.7ms — gentle drift
const BASE_SCALE_RATIO = 0.48; // fraction of min(w,h)/2
const BUILD_CHUNK = 12; // countries appended per animation frame

// Countries that get a richer info card. Everything else uses a
// generic "exploring here" placeholder. Extend as we add real work.
const FEATURED: Record<string, { eyebrow: string; body: string }> = {
  Netherlands: {
    eyebrow: "Origin",
    body: "Amsterdam — where Juan Diaz, LLC was first framed as a cross-sector operating thesis.",
  },
  "United States of America": {
    eyebrow: "Active",
    body: "Philadelphia — flagship CRM platform live for construction + service operators.",
  },
  Germany: {
    eyebrow: "Expanding",
    body: "Energy + real-estate partnerships under Voltafy / HMB in build-out.",
  },
  Spain: {
    eyebrow: "Network",
    body: "Hospitality + adjacent operators in the Iberian corridor.",
  },
};

const SVG_NS = "http://www.w3.org/2000/svg";

export function Globe() {
  const t = useT();
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const countriesGRef = useRef<SVGGElement>(null);
  const graticuleElRef = useRef<SVGPathElement>(null);
  const circleRefs = useRef<(SVGCircleElement | null)[]>([null, null, null]);

  const [size, setSize] = useState({ w: 640, h: 640 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CountryFeature | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Imperative world state — mutated by the rAF loops, never React state.
  const rotationRef = useRef<[number, number, number]>([20, -20, 0]);
  const zoomRef = useRef(1);
  const featuresRef = useRef<CountryFeature[]>([]);
  const pathElsRef = useRef<SVGPathElement[]>([]);
  const sizeRef = useRef(size);
  const selectedRef = useRef<CountryFeature | null>(null);
  const animRef = useRef<number | null>(null);
  const flyRef = useRef<number | null>(null);
  const buildRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const reduceMotion = useRef(false);

  const graticule = useMemo(() => geoGraticule().step([15, 15])(), []);

  /** Recompute the projection and write every geo path + sphere radius
   *  straight into the DOM. ~5–25ms for the full 110m world — always
   *  under the 50ms long-task threshold, even on weak hardware. */
  const redraw = useCallback(() => {
    const { w, h } = sizeRef.current;
    const projection = geoOrthographic()
      .scale(Math.min(w, h) * BASE_SCALE_RATIO * zoomRef.current)
      .translate([w / 2, h / 2])
      .rotate(rotationRef.current)
      .clipAngle(90);
    const p = geoPath(projection);

    if (graticuleElRef.current) {
      graticuleElRef.current.setAttribute("d", p(graticule) || "");
    }
    const feats = featuresRef.current;
    const els = pathElsRef.current;
    for (let i = 0; i < els.length; i++) {
      const d = p(feats[i]);
      if (d) {
        els[i].setAttribute("d", d);
        els[i].style.display = "";
      } else {
        // Far side of the sphere — clipped away entirely.
        els[i].style.display = "none";
      }
    }
    const r = Math.min(w, h) * BASE_SCALE_RATIO * zoomRef.current;
    for (const c of circleRefs.current) {
      if (c) c.setAttribute("r", String(r));
    }
  }, [graticule]);

  // Measure + track container size
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const s = Math.min(r.width, r.height);
      setSize({ w: s, h: s });
      sizeRef.current = { w: s, h: s };
      redraw();
    });
    obs.observe(el);
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => obs.disconnect();
  }, [redraw]);

  // Gate heavy work on viewport entry — defer the ~108 KB TopoJSON
  // fetch until the globe scrolls into view. Keeps LCP fast on pages
  // where the globe is below the fold.
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setIsVisible(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setIsVisible(true);
          io.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Load TopoJSON once and build the country layer imperatively —
  // BUILD_CHUNK path elements appended per animation frame. Each frame
  // does a handful of feature() conversions + createElement calls, so
  // the build never produces a long task and the globe fills in over
  // ~15 frames (~a quarter second).
  useEffect(() => {
    if (!isVisible) return;
    let alive = true;
    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (!alive || !countriesGRef.current) return;
        const col = topo.objects.countries as GeometryCollection<CountryProps>;
        const geoms = col.geometries;
        let i = 0;
        const buildChunk = () => {
          if (!alive || !countriesGRef.current) return;
          const end = Math.min(i + BUILD_CHUNK, geoms.length);
          for (; i < end; i++) {
            const f = feature(topo, geoms[i]) as unknown as CountryFeature;
            const idx = featuresRef.current.length;
            featuresRef.current.push(f);
            const el = document.createElementNS(SVG_NS, "path");
            el.setAttribute("class", "country");
            el.dataset.idx = String(idx);
            const title = document.createElementNS(SVG_NS, "title");
            title.textContent = f.properties?.name || `c${idx}`;
            el.appendChild(title);
            countriesGRef.current.appendChild(el);
            pathElsRef.current.push(el);
          }
          redraw();
          if (i < geoms.length) buildRef.current = requestAnimationFrame(buildChunk);
        };
        buildRef.current = requestAnimationFrame(buildChunk);
      })
      .catch(() => {
        /* network blocked — globe still renders graticule only */
      });
    return () => {
      alive = false;
      if (buildRef.current) cancelAnimationFrame(buildRef.current);
    };
  }, [isVisible, redraw]);

  // Auto-rotate loop — throttled to ~30fps, mutates the rotation ref
  // and redraws imperatively. No React involvement per frame.
  useEffect(() => {
    if (selected || reduceMotion.current) return;
    let last = performance.now();
    function tick(now: number) {
      if (!draggingRef.current && !selectedRef.current && now - last >= 33) {
        const dt = now - last;
        last = now;
        rotationRef.current = [
          rotationRef.current[0] + ROTATION_SPEED * (dt / 16.7),
          rotationRef.current[1],
          rotationRef.current[2],
        ];
        redraw();
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [selected, redraw]);

  // Fly-to animation — lerp rotation + zoom via refs
  const flyTo = useCallback((f: CountryFeature) => {
    const [lng, lat] = geoCentroid(f);
    const targetRot: [number, number, number] = [-lng, -lat, 0];
    const targetZoom = 2.4;
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    const start = performance.now();
    const duration = reduceMotion.current ? 0 : 1100;
    const fromRot: [number, number, number] = [...rotationRef.current];
    const fromZoom = zoomRef.current;
    // Mark selected immediately in the ref so auto-rotate pauses.
    selectedRef.current = f;

    // shortest angular path on longitude
    let deltaLng = targetRot[0] - fromRot[0];
    while (deltaLng > 180) deltaLng -= 360;
    while (deltaLng < -180) deltaLng += 360;

    function step(now: number) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      rotationRef.current = [
        fromRot[0] + deltaLng * e,
        fromRot[1] + (targetRot[1] - fromRot[1]) * e,
        0,
      ];
      zoomRef.current = fromZoom + (targetZoom - fromZoom) * e;
      redraw();
      if (t < 1) flyRef.current = requestAnimationFrame(step);
      else setSelected(f);
    }
    flyRef.current = requestAnimationFrame(step);
  }, [redraw]);

  const flyHome = useCallback(() => {
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    const start = performance.now();
    const duration = reduceMotion.current ? 0 : 900;
    const fromZoom = zoomRef.current;
    const targetZoom = 1;
    selectedRef.current = null;
    setSelected(null);
    function step(now: number) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      zoomRef.current = fromZoom + (targetZoom - fromZoom) * e;
      redraw();
      if (t < 1) flyRef.current = requestAnimationFrame(step);
    }
    flyRef.current = requestAnimationFrame(step);
  }, [redraw]);

  // Hover + click via event delegation on the countries group — the
  // imperative <path> elements carry data-idx back to their feature.
  const featureFromEvent = useCallback((e: Event): { f: CountryFeature; el: SVGPathElement } | null => {
    const target = (e.target as Element | null)?.closest?.("path.country") as SVGPathElement | null;
    if (!target || target.dataset.idx === undefined) return null;
    const f = featuresRef.current[Number(target.dataset.idx)];
    return f ? { f, el: target } : null;
  }, []);

  useEffect(() => {
    const g = countriesGRef.current;
    if (!g) return;
    let hoverEl: SVGPathElement | null = null;
    const over = (e: Event) => {
      const hit = featureFromEvent(e);
      if (!hit || hit.el === hoverEl) return;
      hoverEl?.classList.remove("hover");
      hoverEl = hit.el;
      hoverEl.classList.add("hover");
      setHoveredId(hit.f.properties?.name || null);
    };
    const out = (e: Event) => {
      const related = (e as MouseEvent).relatedTarget as Element | null;
      if (related && related.closest("path.country")) return; // moving between countries
      hoverEl?.classList.remove("hover");
      hoverEl = null;
      setHoveredId(null);
    };
    const click = (e: Event) => {
      if (draggingRef.current) return;
      const hit = featureFromEvent(e);
      if (!hit) return;
      e.stopPropagation();
      g.querySelector("path.selected")?.classList.remove("selected");
      hit.el.classList.add("selected");
      flyTo(hit.f);
    };
    g.addEventListener("mouseover", over);
    g.addEventListener("mouseout", out);
    g.addEventListener("click", click);
    return () => {
      g.removeEventListener("mouseover", over);
      g.removeEventListener("mouseout", out);
      g.removeEventListener("click", click);
    };
  }, [featureFromEvent, flyTo]);

  // Clear the selected highlight when the panel closes.
  useEffect(() => {
    if (!selected) {
      countriesGRef.current?.querySelector("path.selected")?.classList.remove("selected");
    }
  }, [selected]);

  // Drag-to-rotate on pointer
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let lastX = 0, lastY = 0;
    function down(e: PointerEvent) {
      if (selectedRef.current) return;
      draggingRef.current = true;
      lastX = e.clientX;
      lastY = e.clientY;
      svg!.setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
      if (!draggingRef.current) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      const [l, p, g] = rotationRef.current;
      rotationRef.current = [l + dx * 0.3, Math.max(-80, Math.min(80, p - dy * 0.3)), g];
      redraw();
    }
    function up(e: PointerEvent) {
      draggingRef.current = false;
      try { svg!.releasePointerCapture(e.pointerId); } catch {}
    }
    svg.addEventListener("pointerdown", down);
    svg.addEventListener("pointermove", move);
    svg.addEventListener("pointerup", up);
    svg.addEventListener("pointerleave", up);
    return () => {
      svg.removeEventListener("pointerdown", down);
      svg.removeEventListener("pointermove", move);
      svg.removeEventListener("pointerup", up);
      svg.removeEventListener("pointerleave", up);
    };
  }, [redraw]);

  // Keep the sphere geometry in sync when React re-renders for a size
  // change (viewBox + circle centers are React-owned; radii + paths are
  // ref-owned and refreshed by redraw()).
  useEffect(() => {
    sizeRef.current = size;
    redraw();
  }, [size, redraw]);

  const featured = selected?.properties?.name ? FEATURED[selected.properties.name] : undefined;
  const r0 = Math.min(size.w, size.h) * BASE_SCALE_RATIO;

  return (
    <div className="globe-wrap" ref={wrapperRef}>
      <svg
        ref={svgRef}
        className="globe-svg"
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="img"
        aria-label={t("globe.aria.label")}
      >
        <defs>
          <radialGradient id="oceanGrad" cx="38%" cy="34%" r="68%">
            <stop offset="0%" stopColor="#0c2a1f" />
            <stop offset="55%" stopColor="#061a12" />
            <stop offset="100%" stopColor="#020b08" />
          </radialGradient>
          <radialGradient id="specularGrad" cx="30%" cy="25%" r="42%">
            <stop offset="0%" stopColor="rgba(255,255,255,.35)" />
            <stop offset="40%" stopColor="rgba(94,228,176,.08)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
          <radialGradient id="limbGrad" cx="50%" cy="50%" r="50%">
            <stop offset="86%" stopColor="rgba(94,228,176,0)" />
            <stop offset="96%" stopColor="rgba(94,228,176,.35)" />
            <stop offset="100%" stopColor="rgba(94,228,176,0)" />
          </radialGradient>
          <filter id="glowSoft" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" />
          </filter>
        </defs>

        {/* ocean sphere */}
        <circle
          ref={(el) => { circleRefs.current[0] = el; }}
          cx={size.w / 2}
          cy={size.h / 2}
          r={r0}
          fill="url(#oceanGrad)"
        />

        {/* graticule — lat/long wireframe */}
        <path ref={graticuleElRef} className="globe-graticule" />

        {/* countries — populated imperatively, see buildChunk() */}
        <g ref={countriesGRef} className="globe-countries" />

        {/* limb glow — atmospheric rim on top */}
        <circle
          ref={(el) => { circleRefs.current[1] = el; }}
          cx={size.w / 2}
          cy={size.h / 2}
          r={r0}
          fill="url(#limbGrad)"
          pointerEvents="none"
        />
        {/* specular highlight */}
        <circle
          ref={(el) => { circleRefs.current[2] = el; }}
          cx={size.w / 2}
          cy={size.h / 2}
          r={r0}
          fill="url(#specularGrad)"
          style={{ mixBlendMode: "screen" }}
          pointerEvents="none"
        />
      </svg>

      {/* Info panel — appears on country click */}
      {selected && (
        <div className="country-panel" role="dialog" aria-label={selected.properties?.name}>
          <button className="country-close" onClick={flyHome} aria-label={t("globe.btn.close")}>
            <span aria-hidden="true">×</span>
          </button>
          <div className="country-eyebrow">{featured?.eyebrow ?? t("globe.eyebrow.fallback")}</div>
          <h3 className="country-name">{selected.properties?.name}</h3>
          <p className="country-body">
            {featured?.body ?? t("globe.body.fallback")}
          </p>
          <button className="country-back" onClick={flyHome}>
            {t("globe.btn.back")} <span className="arr">→</span>
          </button>
        </div>
      )}

      {/* Hover label — shown when cursor is over a country */}
      {hoveredId && !selected && (
        <div className="globe-hint" aria-hidden="true">
          {hoveredId}
        </div>
      )}
    </div>
  );
}
