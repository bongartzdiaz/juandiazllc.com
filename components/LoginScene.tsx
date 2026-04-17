"use client";

import { useEffect, useRef } from "react";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function LoginScene() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (prefersReducedMotion()) return;

    let ctx: WebGLRenderingContext | null = null;
    try {
      ctx = canvas.getContext("webgl2") as WebGLRenderingContext | null ?? canvas.getContext("webgl");
    } catch {}
    if (!ctx) return;

    let disposed = false;
    let cleanup: (() => void) | null = null;

    import("three").then((THREE) => {
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0x000000, 0);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
      camera.position.z = 7;

      function resize() {
        const w = canvas!.clientWidth, h = canvas!.clientHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
      resize();
      window.addEventListener("resize", resize);

      // Wireframe icosahedron — calmer than hero
      const geom = new THREE.IcosahedronGeometry(1.8, 1);
      const wire = new THREE.LineSegments(
        new THREE.WireframeGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0x5effb1, transparent: true, opacity: 0.22 })
      );
      scene.add(wire);

      // Inner solid orb with fresnel-ish material
      const orbMat = new THREE.MeshBasicMaterial({ color: 0x0b3d2e, transparent: true, opacity: 0.4 });
      const orb = new THREE.Mesh(new THREE.IcosahedronGeometry(1.5, 2), orbMat);
      scene.add(orb);

      // Particle halo
      const N = 1400;
      const positions = new Float32Array(N * 3);
      const rand = new Float32Array(N);
      for (let i = 0; i < N; i++) {
        const t = i / N;
        const phi = Math.acos(1 - 2 * t);
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const r = 2.8 + Math.random() * 1.4;
        positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
        positions[i * 3 + 2] = r * Math.cos(phi);
        rand[i] = Math.random();
      }
      const pGeom = new THREE.BufferGeometry();
      pGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
      pGeom.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
      const pMat = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color("#5EFFB1") },
          uColor2: { value: new THREE.Color("#7DD3FC") },
        },
        vertexShader: `
          uniform float uTime; attribute float aRand; varying float vR;
          void main(){
            vec3 p = position;
            float s = sin(uTime * 0.3 + aRand * 6.28);
            p *= 1.0 + s * 0.015;
            vR = aRand;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = (1.0 + aRand * 1.6) * (260.0 / -mv.z);
            gl_Position = projectionMatrix * mv;
          }`,
        fragmentShader: `
          uniform vec3 uColor; uniform vec3 uColor2; varying float vR;
          void main(){
            vec2 uv = gl_PointCoord - 0.5;
            float d = length(uv);
            if (d > 0.5) discard;
            float a = smoothstep(0.5, 0.0, d);
            vec3 c = mix(uColor, uColor2, vR);
            gl_FragColor = vec4(c, a * 0.6);
          }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const points = new THREE.Points(pGeom, pMat);
      scene.add(points);

      // Mouse parallax
      let mx = 0, my = 0, tmx = 0, tmy = 0;
      const onMove = (e: MouseEvent) => {
        tmx = e.clientX / window.innerWidth - 0.5;
        tmy = e.clientY / window.innerHeight - 0.5;
      };
      window.addEventListener("mousemove", onMove);

      const clock = new THREE.Clock();
      let raf = 0;
      function loop() {
        const t = clock.getElapsedTime();
        pMat.uniforms.uTime.value = t;
        mx += (tmx - mx) * 0.04;
        my += (tmy - my) * 0.04;
        wire.rotation.y = t * 0.08 + mx * 0.5;
        wire.rotation.x = t * 0.04 + my * 0.3;
        orb.rotation.y = -t * 0.06;
        orb.rotation.x = t * 0.03;
        points.rotation.y = t * 0.02 + mx * 0.25;
        points.rotation.x = -t * 0.015 + my * 0.15;
        renderer.render(scene, camera);
        raf = requestAnimationFrame(loop);
      }
      loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMove);
        geom.dispose();
        orbMat.dispose();
        pGeom.dispose();
        pMat.dispose();
        renderer.dispose();
      };
      if (disposed) cleanup();
    });

    return () => { disposed = true; cleanup?.(); };
  }, []);

  return (
    <div className="auth-scene" aria-hidden>
      <canvas ref={canvasRef} />
    </div>
  );
}
