import Link from "next/link";

export function Nav() {
  return (
    <nav className="top" aria-label="Primary">
      <Link href="/" className="brand" aria-label="Juan Diaz LLC — home">
        <span className="dot" aria-hidden="true" />
        <span>Juan Diaz LLC</span>
      </Link>
      <div className="nav-right">
        <span id="navTime">—</span>
        <Link href="/story" className="hide-mobile">Story</Link>
        <Link href="/work">Work</Link>
        <Link href="/signals" className="hide-mobile">Signals</Link>
        <Link href="/contact" className="hide-tiny">Contact</Link>
        <Link href="/login" className="auth">◉ Login</Link>
      </div>
    </nav>
  );
}
