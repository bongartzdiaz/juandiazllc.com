import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/Logo";

export const metadata: Metadata = {
  title: { default: "Diaz · Command", template: "%s · Diaz" },
  description: "Juan's master command surface across every Juan Diaz LLC venture.",
  robots: { index: false, follow: false },
};

export default function DiazLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="philly-shell">
      <nav className="philly-nav" aria-label="Diaz">
        <Link href="/app" className="brand" style={{ color: "var(--accent)", gap: 12 }}>
          <Logo size={24} animated />
          <span style={{ color: "var(--text)" }}>Diaz · Command</span>
        </Link>
        <div className="philly-nav-right">
          <a href="https://juandiazllc.com">juandiazllc.com</a>
          <a href="https://philly.juandiazllc.com">philly</a>
        </div>
      </nav>
      {children}
      <footer className="philly-footer">
        <div>© Juan Diaz LLC — Diaz · Internal</div>
        <div>diaz.juandiazllc.com · Master command</div>
      </footer>
    </div>
  );
}
