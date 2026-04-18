import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: { default: "Philly · Field ops", template: "%s · Philly" },
  description: "Field-first interface for ground teams under Juan Diaz LLC.",
  robots: { index: false, follow: false },
};

export default function PhillyLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="philly-shell">
      <nav className="philly-nav" aria-label="Philly">
        <Link href="/" className="brand" style={{ color: "var(--accent)", gap: 12 }}>
          <Logo size={24} animated />
          <span style={{ color: "var(--text)" }}>Philly · Ops</span>
        </Link>
        <div className="philly-nav-right">
          <a href="https://juandiazllc.com">← juandiazllc.com</a>
          <Link href="/login" className="auth">◉ Login</Link>
        </div>
      </nav>
      {children}
      <footer className="philly-footer">
        <div>© Juan Diaz LLC — Philly · 2026</div>
        <div>philly.juandiazllc.com · US field ops</div>
      </footer>
    </div>
  );
}
