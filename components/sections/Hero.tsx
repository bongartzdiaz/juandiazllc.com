"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { useT } from "@/lib/i18n/useT";

function prefersReducedMotion() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const noiseGLSL = `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
float snoise(vec3 v){
  const vec2 C=vec2(1.0/6.0,1.0/3.0);
  const vec4 D=vec4(0.0,0.5,1.0,2.0);
  vec3 i=floor(v+dot(v,C.yyy));
  vec3 x0=v-i+dot(i,C.xxx);
  vec3 g=step(x0.yzx,x0.xyz);
  vec3 l=1.0-g;
  vec3 i1=min(g.xyz,l.zxy);
  vec3 i2=max(g.xyz,l.zxy);
  vec3 x1=x0-i1+C.xxx;
  vec3 x2=x0-i2+C.yyy;
  vec3 x3=x0-D.yyy;
  i=mod289(i);
  vec4 p=permute(permute(permute(i.z+vec4(0.0,i1.z,i2.z,1.0))+i.y+vec4(0.0,i1.y,i2.y,1.0))+i.x+vec4(0.0,i1.x,i2.x,1.0));
  float n_=0.142857142857;
  vec3 ns=n_*D.wyz-D.xzx;
  vec4 j=p-49.0*floor(p*ns.z*ns.z);
  vec4 x_=floor(j*ns.z);
  vec4 y_=floor(j-7.0*x_);
  vec4 x=x_*ns.x+ns.yyyy;
  vec4 y=y_*ns.x+ns.yyyy;
  vec4 h=1.0-abs(x)-abs(y);
  vec4 b0=vec4(x.xy,y.xy);
  vec4 b1=vec4(x.zw,y.zw);
  vec4 s0=floor(b0)*2.0+1.0;
  vec4 s1=floor(b1)*2.0+1.0;
  vec4 sh=-step(h,vec4(0.0));
  vec4 a0=b0.xzyw+s0.xzyw*sh.xxyy;
  vec4 a1=b1.xzyw+s1.xzyw*sh.zzww;
  vec3 p0=vec3(a0.xy,h.x);
  vec3 p1=vec3(a0.zw,h.y);
  vec3 p2=vec3(a1.xy,h.z);
  vec3 p3=vec3(a1.zw,h.w);
  vec4 norm=taylorInvSqrt(vec4(dot(p0,p0),dot(p1,p1),dot(p2,p2),dot(p3,p3)));
  p0*=norm.x; p1*=norm.y; p2*=norm.z; p3*=norm.w;
  vec4 m=max(0.6-vec4(dot(x0,x0),dot(x1,x1),dot(x2,x2),dot(x3,x3)),0.0);
  m=m*m;
  return 42.0*dot(m*m,vec4(dot(p0,x0),dot(p1,x1),dot(p2,x2),dot(p3,x3)));
}`;

export function Hero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const t = useT();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (prefersReducedMotion()) return; // respect reduced-motion

    let ctx: WebGLRenderingContext | null = null;
    try {
      ctx = canvas.getContext("webgl2") as WebGLRenderingContext | null ?? canvas.getContext("webgl");
    } catch {}
    if (!ctx) return; // graceful fallback — CSS gradient still provides atmosphere

    let disposed = false;
    let cleanup: (() => void) | null = null;

    // Dynamically import three.js so it doesn't block initial JS bundle
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
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5.2;

    function resize() {
      const w = canvas!.clientWidth;
      const h = canvas!.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener("resize", resize);

    const orbGeom = new THREE.IcosahedronGeometry(1.35, 64);
    const orbMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uAmp: { value: 0.28 },
        uFreq: { value: 1.05 },
        uColor: { value: new THREE.Color("#0B3D2E") },
        uGlow: { value: new THREE.Color("#4DE29C") },
      },
      vertexShader: `
        uniform float uTime; uniform float uAmp; uniform float uFreq;
        varying vec3 vN; varying vec3 vP; varying float vD;
        ${noiseGLSL}
        void main(){
          vec3 p=position;
          float n=snoise(p*uFreq + uTime*0.25);
          float n2=snoise(p*uFreq*2.1 - uTime*0.4)*0.4;
          vD=n;
          p += normal*(n*uAmp + n2*0.08);
          vN=normalize(normalMatrix*normal);
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          vP=mv.xyz;
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uGlow;
        varying vec3 vN; varying vec3 vP; varying float vD;
        void main(){
          vec3 V=normalize(-vP);
          float f=pow(1.0-max(dot(vN,V),0.0), 2.2);
          vec3 col=mix(uColor*0.12, uColor*0.9, f);
          col += uGlow*pow(f,5.0)*1.8;
          col += uGlow*0.08*smoothstep(-.2,.4,vD);
          gl_FragColor=vec4(col,1.0);
        }`,
    });
    const orb = new THREE.Mesh(orbGeom, orbMat);
    scene.add(orb);

    const wireGeom = new THREE.IcosahedronGeometry(1.55, 3);
    const wireMat = new THREE.MeshBasicMaterial({
      color: 0x5effb1,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const wire = new THREE.Mesh(wireGeom, wireMat);
    scene.add(wire);

    const N = 2600;
    const pGeom = new THREE.BufferGeometry();
    const pos = new Float32Array(N * 3);
    const rand = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / N;
      const phi = Math.acos(1 - 2 * t);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 2.2 + Math.random() * 1.6;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      pos[i * 3 + 2] = r * Math.cos(phi);
      rand[i] = Math.random();
    }
    pGeom.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    pGeom.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));

    const pMat = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color("#5EFFB1") },
        uColor2: { value: new THREE.Color("#7DD3FC") },
      },
      vertexShader: `
        uniform float uTime; attribute float aRand;
        varying float vR;
        void main(){
          vec3 p=position;
          float s=sin(uTime*0.4 + aRand*6.28);
          p *= 1.0 + s*0.02;
          vR=aRand;
          vec4 mv=modelViewMatrix*vec4(p,1.0);
          gl_PointSize = (1.0 + aRand*2.2) * (300.0 / -mv.z);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader: `
        uniform vec3 uColor; uniform vec3 uColor2; varying float vR;
        void main(){
          vec2 uv=gl_PointCoord-0.5;
          float d=length(uv);
          if(d>0.5) discard;
          float a=smoothstep(0.5,0.0,d);
          vec3 c=mix(uColor,uColor2,vR);
          gl_FragColor=vec4(c, a*0.7);
        }`,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const points = new THREE.Points(pGeom, pMat);
    scene.add(points);

    let mx = 0, my = 0, tmx = 0, tmy = 0;
    const onMouse = (e: MouseEvent) => {
      tmx = e.clientX / window.innerWidth - 0.5;
      tmy = e.clientY / window.innerHeight - 0.5;
    };
    window.addEventListener("mousemove", onMouse);
    let scrollY = 0;
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener("scroll", onScroll, { passive: true });

    const clock = new THREE.Clock();
    let raf = 0;
    function loop() {
      const t = clock.getElapsedTime();
      orbMat.uniforms.uTime.value = t;
      pMat.uniforms.uTime.value = t;
      mx += (tmx - mx) * 0.05;
      my += (tmy - my) * 0.05;
      orb.rotation.y = t * 0.18 + mx * 0.6;
      orb.rotation.x = t * 0.08 + my * 0.4;
      wire.rotation.y = -t * 0.12;
      wire.rotation.x = t * 0.04;
      points.rotation.y = t * 0.04 + mx * 0.3;
      points.rotation.x = -t * 0.02 + my * 0.2;
      const s = Math.min(scrollY / window.innerHeight, 1);
      camera.position.z = 5.2 + s * 2;
      orb.scale.setScalar(1 - s * 0.15);
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    }
    loop();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("resize", resize);
        window.removeEventListener("mousemove", onMouse);
        window.removeEventListener("scroll", onScroll);
        orbGeom.dispose();
        orbMat.dispose();
        wireGeom.dispose();
        wireMat.dispose();
        pGeom.dispose();
        pMat.dispose();
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
