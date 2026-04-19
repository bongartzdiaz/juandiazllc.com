"use client";

import { useEffect, useRef, useState } from "react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useT } from "@/lib/i18n/useT";

const TARGET = new Date("2027-01-01T00:00:00+01:00").getTime();

function pad(n: number, w = 2) {
  return String(Math.max(0, n)).padStart(w, "0");
}

export function Hud() {
  const t = useT();
  const [now, setNow] = useState("—");
  const [days, setDays] = useState("—");
  const [audioOn, setAudioOn] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);

  useEffect(() => {
    function tick() {
      const diff = Math.max(0, TARGET - Date.now());
      const d = Math.floor(diff / 86400000);
      setDays(String(d));
      setNow(
        new Intl.DateTimeFormat("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          timeZone: "Europe/Amsterdam",
          hour12: false,
        }).format(new Date())
      );
      const navEl = document.getElementById("navTime");
      const footEl = document.getElementById("footTime");
      const preEl = document.getElementById("preloadTime");
      const nowText = new Intl.DateTimeFormat("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZone: "Europe/Amsterdam",
        hour12: false,
      }).format(new Date()) + " CET";
      if (navEl) navEl.textContent = nowText;
      if (footEl) footEl.textContent = nowText;
      if (preEl) preEl.textContent = nowText;
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  function toggleAudio() {
    if (audioCtxRef.current) {
      try {
        gainRef.current?.gain.cancelScheduledValues(audioCtxRef.current.currentTime);
        gainRef.current?.gain.linearRampToValueAtTime(0, audioCtxRef.current.currentTime + 0.4);
        const ctx = audioCtxRef.current;
        setTimeout(() => { try { ctx.close(); } catch {} }, 500);
      } catch {}
      audioCtxRef.current = null;
      gainRef.current = null;
      setAudioOn(false);
      return;
    }
    const Ctx = (window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext);
    const ctx = new Ctx();
    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    const freqs = [55, 82.5, 110, 220];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? "sine" : "triangle";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.05 / (i + 1);
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.07 + i * 0.03;
      const lfoG = ctx.createGain();
      lfoG.gain.value = 0.03;
      lfo.connect(lfoG).connect(g.gain);
      o.connect(g).connect(master);
      o.start();
      lfo.start();
    });
    master.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 1.2);
    audioCtxRef.current = ctx;
    gainRef.current = master;
    setAudioOn(true);
  }

  return (
    <div className="hud">
      <div className="hud-inner">
        <span className="on">{t("hud.live")}</span>
        <span>
          AMS <b>{now}</b>
        </span>
        <span>
          {t("hud.grid")} <b style={{ color: "var(--accent)" }}>{t("hud.grid.stable")}</b>
        </span>
        <span>
          2027 · <b>{days}</b>d
        </span>
        <span>
          v<b>1.0</b>
        </span>
        <span>
          <LanguageSwitcher />
        </span>
        <span
          className={`hud-audio${audioOn ? " on-state" : ""}`}
          onClick={toggleAudio}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") toggleAudio();
          }}
        >
          {audioOn ? t("hud.sound.on") : t("hud.sound.off")}
        </span>
        <span
          className="hud-audio"
          onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true }))}
          role="button"
          tabIndex={0}
          title={t("hud.cmd.hint")}
        >
          ⌘K
        </span>
      </div>
    </div>
  );
}
