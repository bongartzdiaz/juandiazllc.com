import { Logo } from "./Logo";

export function Preloader() {
  return (
    <div className="preload" id="preload" aria-hidden="true">
      <div className="preload-top">
        <div className="mono">Juan Diaz, LLC / 2026</div>
        <div className="mono" id="preloadTime">—</div>
      </div>
      <div className="preload-center">
        <div style={{ color: "var(--accent)", display: "grid", placeItems: "center" }}>
          <Logo size={160} draw />
        </div>
      </div>
      <div className="preload-bottom">
        <div className="mono" style={{ color: "var(--muted)" }}>Booting interface</div>
        <div className="preload-bar"><i /></div>
        <div className="preload-count" id="preloadCount">000</div>
      </div>
    </div>
  );
}
