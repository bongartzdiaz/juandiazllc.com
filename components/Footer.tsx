import Link from "next/link";

export function Footer() {
  return (
    <footer>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div className="f-mark">Juan Diaz LLC</div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>© 2026 · Delaware, USA</div>
      </div>
      <nav aria-label="Footer" style={{ display: "flex", gap: 22, flexWrap: "wrap" }}>
        <Link href="/story">Story</Link>
        <Link href="/work">Work</Link>
        <Link href="/signals">Signals</Link>
        <Link href="/contact">Contact</Link>
        <Link href="/login">Login</Link>
      </nav>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, textAlign: "right" }}>
        <div>
          <span id="footTime">—</span> · Amsterdam CET
        </div>
        <div style={{ color: "var(--muted-soft)", fontSize: 11 }}>
          juandiazllc.com · v1.0
        </div>
      </div>
    </footer>
  );
}
