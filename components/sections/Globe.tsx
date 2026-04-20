"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoCentroid } from "d3-geo";
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, GeoJsonProperties } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";

// Interactive earth — every country is a clickable path. On click we
// animate the projection's rotate() + scale() to fly to the country,
// then slide in an info panel. Pure SVG, no WebGL; orthographic
// projection gives a real sphere that rotates in true 3D.

type CountryProps = { name: string };
type CountryFeature = Feature<Geometry, CountryProps>;

const ROTATION_SPEED = 0.05; // deg per frame — gentle drift
const BASE_SCALE_RATIO = 0.48; // fraction of min(w,h)/2

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

export function Globe() {
  const svgRef = useRef<SVGSVGElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 640, h: 640 });
  const [countries, setCountries] = useState<CountryFeature[]>([]);
  const [rotation, setRotation] = useState<[number, number, number]>([20, -20, 0]);
  const [zoom, setZoom] = useState(1);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CountryFeature | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const animRef = useRef<number | null>(null);
  const flyRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const reduceMotion = useRef(false);

  // Measure + track container size
  useEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    const obs = new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      const s = Math.min(r.width, r.height);
      setSize({ w: s, h: s });
    });
    obs.observe(el);
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    return () => obs.disconnect();
  }, []);

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

  // Load TopoJSON once — only after the globe enters viewport
  useEffect(() => {
    if (!isVisible) return;
    let alive = true;
    fetch("/world-110m.json")
      .then((r) => r.json())
      .then((topo: Topology) => {
        if (!alive) return;
        const col = topo.objects.countries as GeometryCollection<CountryProps>;
        const fc = feature(topo, col) as unknown as FeatureCollection<Geometry, CountryProps>;
        setCountries(fc.features as CountryFeature[]);
      })
      .catch(() => {
        /* network blocked — globe still renders graticule only */
      });
    return () => {
      alive = false;
    };
  }, [isVisible]);

  // Auto-rotate loop (paused when a country is selected or user drags)
  useEffect(() => {
    if (selected || reduceMotion.current) return;
    function tick() {
      if (!draggingRef.current) {
        setRotation(([l, p, g]) => [l + ROTATION_SPEED, p, g]);
      }
      animRef.current = requestAnimationFrame(tick);
    }
    animRef.current = requestAnimationFrame(tick);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [selected]);

  // Fly-to animation — lerp rotation + zoom
  const flyTo = useCallback((f: CountryFeature) => {
    const [lng, lat] = geoCentroid(f);
    const targetRot: [number, number, number] = [-lng, -lat, 0];
    const targetZoom = 2.4;
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    const start = performance.now();
    const duration = reduceMotion.current ? 0 : 1100;
    const fromRot: [number, number, number] = [...rotation];
    const fromZoom = zoom;

    // shortest angular path on longitude
    let deltaLng = targetRot[0] - fromRot[0];
    while (deltaLng > 180) deltaLng -= 360;
    while (deltaLng < -180) deltaLng += 360;

    function step(now: number) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // easeInOutQuad
      setRotation([
        fromRot[0] + deltaLng * e,
        fromRot[1] + (targetRot[1] - fromRot[1]) * e,
        0,
      ]);
      setZoom(fromZoom + (targetZoom - fromZoom) * e);
      if (t < 1) flyRef.current = requestAnimationFrame(step);
      else setSelected(f);
    }
    flyRef.current = requestAnimationFrame(step);
  }, [rotation, zoom]);

  const flyHome = useCallback(() => {
    if (flyRef.current) cancelAnimationFrame(flyRef.current);
    const start = performance.now();
    const duration = reduceMotion.current ? 0 : 900;
    const fromRot: [number, number, number] = [...rotation];
    const fromZoom = zoom;
    const targetZoom = 1;
    setSelected(null);
    function step(now: number) {
      const t = duration === 0 ? 1 : Math.min(1, (now - start) / duration);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      setZoom(fromZoom + (targetZoom - fromZoom) * e);
      setRotation(fromRot); // keep current longitude, let auto-rotate resume
      if (t < 1) flyRef.current = requestAnimationFrame(step);
    }
    flyRef.current = requestAnimationFrame(step);
  }, [rotation, zoom]);

  // Drag-to-rotate on pointer
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    let lastX = 0, lastY = 0;
    function down(e: PointerEvent) {
      if (selected) return;
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
      setRotation(([l, p, g]) => [l + dx * 0.3, Math.max(-80, Math.min(80, p - dy * 0.3)), g]);
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
  }, [selected]);

  const projection = useMemo(() => {
    return geoOrthographic()
      .scale(Math.min(size.w, size.h) * BASE_SCALE_RATIO * zoom)
      .translate([size.w / 2, size.h / 2])
      .rotate(rotation)
      .clipAngle(90);
  }, [size.w, size.h, zoom, rotation]);

  const path = useMemo(() => geoPath(projection), [projection]);
  const graticule = useMemo(() => geoGraticule().step([15, 15])(), []);

  const featured = selected?.properties?.name ? FEATURED[selected.properties.name] : undefined;

  return (
    <div className="globe-wrap" ref={wrapperRef}>
      <svg
        ref={svgRef}
        className="globe-svg"
        viewBox={`0 0 ${size.w} ${size.h}`}
        role="img"
        aria-label="Interactive earth globe — drag to rotate, click a country to zoom in"
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
          cx={size.w / 2}
          cy={size.h / 2}
          r={Math.min(size.w, size.h) * BASE_SCALE_RATIO * zoom}
          fill="url(#oceanGrad)"
        />

        {/* graticule — lat/long wireframe */}
        <path d={path(graticule) || undefined} className="globe-graticule" />

        {/* countries */}
        <g className="globe-countries">
          {countries.map((f, i) => {
            const d = path(f);
            if (!d) return null;
            const name = f.properties?.name || `c${i}`;
            const isHover = hoveredId === name;
            const isSelected = selected?.properties?.name === name;
            return (
              <path
                key={name}
                d={d}
                className={`country${isHover ? " hover" : ""}${isSelected ? " selected" : ""}`}
                onMouseEnter={() => setHoveredId(name)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (draggingRef.current) return;
                  flyTo(f);
                }}
              >
                <title>{name}</title>
              </path>
            );
          })}
        </g>

        {/* limb glow — atmospheric rim on top */}
        <circle
          cx={size.w / 2}
          cy={size.h / 2}
          r={Math.min(size.w, size.h) * BASE_SCALE_RATIO * zoom}
          fill="url(#limbGrad)"
          pointerEvents="none"
        />
        {/* specular highlight */}
        <circle
          cx={size.w / 2}
          cy={size.h / 2}
          r={Math.min(size.w, size.h) * BASE_SCALE_RATIO * zoom}
          fill="url(#specularGrad)"
          style={{ mixBlendMode: "screen" }}
          pointerEvents="none"
        />
      </svg>

      {/* Info panel — appears on country click */}
      {selected && (
        <div className="country-panel" role="dialog" aria-label={selected.properties?.name}>
          <button className="country-close" onClick={flyHome} aria-label="Close">
            <span aria-hidden="true">×</span>
          </button>
          <div className="country-eyebrow">{featured?.eyebrow ?? "Signal"}</div>
          <h3 className="country-name">{selected.properties?.name}</h3>
          <p className="country-body">
            {featured?.body ?? "Exploring opportunities here — tap another country, or close to return to orbit."}
          </p>
          <button className="country-back" onClick={flyHome}>
            Back to orbit <span className="arr">→</span>
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
