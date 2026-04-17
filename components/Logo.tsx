export function Logo({ size = 28, animated = true }: { size?: number; animated?: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
      style={{ display: "block", flexShrink: 0 }}
    >
      <line x1="32" y1="3" x2="32" y2="9" />
      <line x1="32" y1="55" x2="32" y2="61" />
      <line x1="3" y1="32" x2="9" y2="32" />
      <line x1="55" y1="32" x2="61" y2="32" />
      <g
        style={
          animated
            ? { transformOrigin: "32px 32px", animation: "spin 40s linear infinite" }
            : undefined
        }
      >
        <circle cx="32" cy="32" r="25" strokeDasharray="2 5" opacity="0.55" />
      </g>
      <circle cx="32" cy="32" r="17" opacity="0.85" />
      <circle
        cx="32"
        cy="32"
        r="5.5"
        fill="currentColor"
        stroke="none"
        style={
          animated
            ? { transformOrigin: "32px 32px", animation: "pulse 2.4s ease-in-out infinite" }
            : undefined
        }
      />
    </svg>
  );
}

export function Wordmark({ italic = true }: { italic?: boolean }) {
  return (
    <span
      style={{
        fontFamily: "'Inter'",
        fontWeight: 500,
        letterSpacing: "-0.02em",
        fontSize: "inherit",
        whiteSpace: "nowrap",
      }}
    >
      Juan {italic ? <em style={{ fontFamily: "'Instrument Serif'", color: "var(--accent)" }}>Diaz</em> : <span>Diaz</span>}{" "}
      <span style={{ color: "var(--muted-soft)", fontFamily: "'JetBrains Mono'", fontSize: "0.78em", letterSpacing: ".14em", marginLeft: 4 }}>LLC</span>
    </span>
  );
}
