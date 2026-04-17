export function Preloader() {
  return (
    <div className="preload" id="preload" aria-hidden="true">
      <div className="preload-top">
        <div className="mono">Juan Diaz LLC / 2026</div>
        <div className="mono" id="preloadTime">—</div>
      </div>
      <div className="preload-center">
        <div className="preload-mark">
          <span>J</span>
          <span>D</span>
          <span>L</span>
        </div>
      </div>
      <div className="preload-bottom">
        <div className="mono" style={{ color: "var(--muted)" }}>
          Booting interface
        </div>
        <div className="preload-bar">
          <i />
        </div>
        <div className="preload-count" id="preloadCount">000</div>
      </div>
    </div>
  );
}
