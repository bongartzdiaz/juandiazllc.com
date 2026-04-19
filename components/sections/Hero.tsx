"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useT();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (prefersReducedMotion()) return;

    let ctx: WebGLRenderingContext | null = null;
    try {
      ctx =
        (canvas.getContext("webgl2") as WebGLRenderingContext | null) ??
        canvas.getContext("webgl");
    } catch {}
    if (!ctx) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    import("three").then((THREE) => {
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
      camera.position.z = 5.4;

      function resize() {
        const w = canvas!.clientWidth;
        const h = canvas!.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      const globe = new THREE.Group();
      scene.add(globe);

      // 1. Solid sphere core — deep forest green, Fresnel atmosphere.
      const coreGeom = new THREE.SphereGeometry(1.4, 96, 96);
      const coreMat = new THREE.ShaderMaterial({
        uniforms: {
          uDeep: { value: new THREE.Color("#0B3D2E") },
          uMid: { value: new THREE.Color("#0E6B44") },
          uGlow: { value: new THREE.Color("#2EC489") },
        },
        vertexShader: `
          varying vec3 vN; varying vec3 vP;
          void main(){
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vP = mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uDeep; uniform vec3 uMid; uniform vec3 uGlow;
          varying vec3 vN; varying vec3 vP;
          void main(){
            vec3 V = normalize(-vP);
            float ndv = max(dot(vN, V), 0.0);
            float rim = pow(1.0 - ndv, 2.6);
            vec3 base = mix(uDeep, uMid, ndv);
            vec3 col = base + uGlow * rim * 0.75;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      });
      const core = new THREE.Mesh(coreGeom, coreMat);
      globe.add(core);

      // 2. Meridian + parallel grid — the signature earth-globe look.
      const gridMat = new THREE.LineBasicMaterial({
        color: 0x2ec489,
        transparent: true,
        opacity: 0.35,
      });
      const gridRadius = 1.405;

      // parallels (latitude rings)
      for (let i = 1; i < 12; i++) {
        const lat = (i / 12) * Math.PI - Math.PI / 2;
        const r = Math.cos(lat) * gridRadius;
        const y = Math.sin(lat) * gridRadius;
        const pts: THREE.Vector3[] = [];
        const seg = 128;
        for (let j = 0; j <= seg; j++) {
          const a = (j / seg) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r));
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(g, gridMat);
        globe.add(line);
      }

      // meridians (longitude half-circles)
      for (let i = 0; i < 18; i++) {
        const lon = (i / 18) * Math.PI * 2;
        const pts: THREE.Vector3[] = [];
        const seg = 96;
        for (let j = 0; j <= seg; j++) {
          const a = (j / seg) * Math.PI - Math.PI / 2;
          const r = Math.cos(a) * gridRadius;
          pts.push(
            new THREE.Vector3(
              r * Math.cos(lon),
              Math.sin(a) * gridRadius,
              r * Math.sin(lon)
            )
          );
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const line = new THREE.Line(g, gridMat);
        globe.add(line);
      }

      // 3. Outer atmosphere shell — halo glow via back-face Fresnel.
      const atmGeom = new THREE.SphereGeometry(1.62, 96, 96);
      const atmMat = new THREE.ShaderMaterial({
        uniforms: { uGlow: { value: new THREE.Color("#1F8F5C") } },
        vertexShader: `
          varying vec3 vN; varying vec3 vP;
          void main(){
            vN = normalize(normalMatrix * normal);
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            vP = mv.xyz;
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uGlow;
          varying vec3 vN; varying vec3 vP;
          void main(){
            vec3 V = normalize(-vP);
            float rim = pow(1.0 - max(dot(vN, V), 0.0), 3.2);
            gl_FragColor = vec4(uGlow, rim * 0.55);
          }
        `,
        side: THREE.BackSide,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const atmosphere = new THREE.Mesh(atmGeom, atmMat);
      scene.add(atmosphere);

      // 4. Orbital rings — three thin inclined rings that rotate independently.
      const orbits: { ring: THREE.Line; speed: number; axis: THREE.Vector3 }[] = [];
      const orbitTilts = [
        { tilt: 0.35, radius: 2.15, speed: 0.10, axis: new THREE.Vector3(1, 0.2, 0.1) },
        { tilt: -0.55, radius: 2.45, speed: -0.07, axis: new THREE.Vector3(0.2, 1, 0.3) },
        { tilt: 1.1, radius: 2.75, speed: 0.05, axis: new THREE.Vector3(0.4, 0.3, 1) },
      ];
      for (const o of orbitTilts) {
        const pts: THREE.Vector3[] = [];
        const seg = 192;
        for (let j = 0; j <= seg; j++) {
          const a = (j / seg) * Math.PI * 2;
          pts.push(new THREE.Vector3(Math.cos(a) * o.radius, 0, Math.sin(a) * o.radius));
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts);
        const mat = new THREE.LineBasicMaterial({
          color: 0x1f8f5c,
          transparent: true,
          opacity: 0.28,
        });
        const ring = new THREE.Line(g, mat);
        ring.rotation.x = o.tilt;
        scene.add(ring);
        orbits.push({ ring, speed: o.speed, axis: o.axis.normalize() });
      }

      // 5. Satellite nodes on each orbit — one bright point per ring.
      const satGeom = new THREE.SphereGeometry(0.035, 12, 12);
      const satMat = new THREE.MeshBasicMaterial({ color: 0x2ec489 });
      const sats: { mesh: THREE.Mesh; radius: number; speed: number; phase: number; tilt: number }[] = [];
      for (let i = 0; i < orbitTilts.length; i++) {
        const o = orbitTilts[i];
        const m = new THREE.Mesh(satGeom, satMat);
        scene.add(m);
        sats.push({ mesh: m, radius: o.radius, speed: o.speed * 2, phase: i * 1.7, tilt: o.tilt });
      }

      // 6. Ambient data-dot cloud (sparse, subtle — not noisy).
      const N = 900;
      const cloudGeom = new THREE.BufferGeometry();
      const pos = new Float32Array(N * 3);
      const rand = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const phi = Math.acos(1 - 2 * t);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const r = 3.4 + Math.random() * 1.2;
        pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        pos[i * 3 + 2] = r * Math.cos(phi);
        rand[i] = Math.random();
      }
      cloudGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
      cloudGeom.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
      const cloudMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#2EC489") },
        },
        vertexShader: `
          uniform float uTime; attribute float aRand;
          varying float vR;
          void main(){
            vR = aRand;
            vec4 mv = modelViewMatrix * vec4(position, 1.0);
            gl_PointSize = (0.8 + aRand * 1.4) * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform vec3 uColor; varying float vR;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            gl_FragColor = vec4(uColor, a * 0.35 * (0.4 + vR * 0.6));
          }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const cloud = new THREE.Points(cloudGeom, cloudMat);
      scene.add(cloud);

      // Interaction — gentle parallax on mouse and scroll.
      let mx = 0, my = 0, tmx = 0, tmy = 0;
      const onMouse = (e: MouseEvent) => {
        tmx = e.clientX / window.innerWidth - 0.5;
        tmy = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("mousemove", onMouse);
      let scrollY = 0;
      const onScroll = () => {
        scrollY = window.scrollY;
      };
      window.addEventListener("scroll", onScroll, { passive: true });

      const clock = new THREE.Clock();
      let raf = 0;
      function loop() {
        const t = clock.getElapsedTime();
        cloudMat.uniforms.uTime.value = t;

        mx += (tmx - mx) * 0.05;
        my += (tmy - my) * 0.05;

        // steady axial rotation — looks like a spinning planet
        globe.rotation.y = t * 0.12 + mx * 0.5;
        globe.rotation.x = my * 0.25;

        // orbital rings — each spins around its own tilted axis
        for (let i = 0; i < orbits.length; i++) {
          const o = orbits[i];
          o.ring.rotation.y = t * o.speed + i;
        }

        // satellites ride their rings
        for (let i = 0; i < sats.length; i++) {
          const s = sats[i];
          const a = t * s.speed + s.phase;
          const x = Math.cos(a) * s.radius;
          const z = Math.sin(a) * s.radius;
          const y = Math.sin(a) * s.radius * Math.sin(s.tilt);
          const zz = Math.sin(a) * s.radius * Math.cos(s.tilt);
          s.mesh.position.set(x, y, zz);
        }

        cloud.rotation.y = t * 0.02 + mx * 0.15;
        cloud.rotation.x = -t * 0.01 + my * 0.1;

        const s = Math.min(scrollY / window.innerHeight, 1);
        camera.position.z = 5.4 + s * 2;
        globe.scale.setScalar(1 - s * 0.12);
        atmosphere.scale.setScalar(1 - s * 0.12);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      }
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("scroll", onScroll);
        coreGeom.dispose();
        coreMat.dispose();
        atmGeom.dispose();
        atmMat.dispose();
        satGeom.dispose();
        satMat.dispose();
        cloudGeom.dispose();
        cloudMat.dispose();
        gridMat.dispose();
        globe.traverse((obj) => {
          if ((obj as THREE.Line).isLine) {
            (obj as THREE.Line).geometry.dispose();
          }
        });
        for (const o of orbits) {
          o.ring.geometry.dispose();
          (o.ring.material as THREE.Material).dispose();
        }
        renderer.dispose();
      };
      if (disposed) cleanup();
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, []);

  return (
    <header className="hero" aria-label="Hero">
      <canvas ref={canvasRef} id="gl" aria-hidden="true" />
      <div className="hero-overlay">
        <div className="hero-tag">
          <span className="chip">{t("hero.chip.status")}</span>
          <span className="chip">{t("hero.chip.sectors")}</span>
        </div>
        <h1 className="hero-title">
          <span className="line"><span>{t("hero.title.1")}</span></span>
          <span className="line"><span>{t("hero.title.2")}</span></span>
          <span className="line"><span><em>{t("hero.title.3")}</em></span></span>
        </h1>
        <div className="hero-foot">
          <div style={{ maxWidth: 600 }}>
            <p className="hero-desc">
              <b>Juan Diaz LLC</b> {t("hero.desc")}
            </p>
            <div className="hero-ctas">
              <Link className="btn primary btn-mag" href="/contact">
                {t("hero.cta.primary")} <span className="arr">→</span>
              </Link>
              <Link className="btn ghost" href="/work">
                {t("hero.cta.secondary")} <span className="arr">→</span>
              </Link>
            </div>
          </div>
          <div className="scroll-hint">
            <i />
            <span>{t("hero.scroll")}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
