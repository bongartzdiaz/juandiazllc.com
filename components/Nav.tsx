"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/useT";
import { Logo } from "./Logo";

/** Eén bron voor de brede balk én het paneel.
 *
 *  De lijst twee keer in de markup zetten zou betekenen dat een nieuwe pagina
 *  in de een wel en in de ander niet verschijnt. Onder 860px waren zes van
 *  deze negen links helemaal onbereikbaar: ze werden met `display: none`
 *  verborgen en er was niets wat ze terugbracht. */
export const NAV_LINKS = [
  { href: "/about", sleutel: "nav.about" },
  { href: "/story", sleutel: "nav.story" },
  { href: "/work", sleutel: "nav.work" },
  { href: "/services", sleutel: "nav.services" },
  { href: "/sectors", sleutel: "nav.sectors" },
  { href: "/pricing", sleutel: "nav.pricing" },
  { href: "/insights", sleutel: "nav.insights" },
  { href: "/signals", sleutel: "nav.signals" },
  { href: "/contact", sleutel: "nav.contact" },
] as const;

export function Nav() {
  const t = useT();
  const pad = usePathname();
  const [open, setOpen] = useState(false);
  const knop = useRef<HTMLButtonElement>(null);
  const paneel = useRef<HTMLDivElement>(null);
  const paneelId = useId();

  // Next navigeert aan de clientkant, dus zonder dit blijft het paneel open
  // staan bovenop de nieuwe pagina.
  useEffect(() => setOpen(false), [pad]);

  useEffect(() => {
    if (!open) return;

    /** De knop hoort bij de val: hij blijft zichtbaar boven het paneel, dus
     *  Tab vanaf de laatste link hoort daarheen te gaan en niet naar de
     *  pagina eronder, die visueel volledig is afgedekt. */
    const beweegbaar = (): HTMLElement[] => [
      ...(knop.current ? [knop.current] : []),
      ...Array.from(paneel.current?.querySelectorAll<HTMLElement>("a[href]") ?? []),
    ];

    const opToets = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        knop.current?.focus();
        return;
      }
      if (e.key !== "Tab") return;
      const items = beweegbaar();
      if (items.length < 2) return;
      const eerste = items[0];
      const laatste = items[items.length - 1];
      if (!e.shiftKey && document.activeElement === laatste) {
        e.preventDefault();
        eerste.focus();
      } else if (e.shiftKey && document.activeElement === eerste) {
        e.preventDefault();
        laatste.focus();
      }
    };

    document.addEventListener("keydown", opToets);
    return () => document.removeEventListener("keydown", opToets);
  }, [open]);

  // Focus naar de eerste link, zodat een schermlezer in het paneel begint en
  // niet ergens op de pagina eronder.
  useEffect(() => {
    if (open) paneel.current?.querySelector<HTMLElement>("a[href]")?.focus();
  }, [open]);

  return (
    <nav className="top" aria-label={t("nav.aria.primary")}>
      <LocaleLink
        href="/"
        className="brand"
        aria-label={t("nav.aria.brand")}
        style={{ color: "var(--accent)", gap: 12 }}
      >
        <Logo size={26} animated />
        <span style={{ color: "var(--text)" }}>Juan Diaz, LLC</span>
      </LocaleLink>

      <div className="nav-right">
        <span id="navTime">—</span>
        {NAV_LINKS.map((l) => (
          <LocaleLink key={l.href} href={l.href}>
            {t(l.sleutel)}
          </LocaleLink>
        ))}
      </div>

      <button
        ref={knop}
        type="button"
        className="nav-toggle"
        aria-expanded={open}
        aria-controls={paneelId}
        aria-label={t(open ? "nav.aria.menuClose" : "nav.aria.menuOpen")}
        onClick={() => setOpen((v) => !v)}
      >
        <span className={`nav-toggle-icon${open ? " is-open" : ""}`} aria-hidden="true">
          <span />
          <span />
          <span />
        </span>
      </button>

      {/* Voorwaardelijk gerenderd in plaats van verborgen: zo staan er geen
          dubbele links in de DOM die een schermlezer of de audit meetelt. */}
      {open && (
        <div id={paneelId} ref={paneel} className="nav-panel">
          <ul>
            {NAV_LINKS.map((l) => (
              <li key={l.href}>
                <LocaleLink href={l.href} onClick={() => setOpen(false)}>
                  {t(l.sleutel)}
                </LocaleLink>
              </li>
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}
