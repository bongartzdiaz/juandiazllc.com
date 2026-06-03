import type { Metadata } from "next";
import { LOCALES, type Locale } from "./dict";

// Shared helpers for route-aware metadata. Every page under
// app/[locale]/ uses buildAlternates() so Google sees a coherent
// hreflang map, locale-specific canonical, and og:locale. Keeps the
// URL construction in one place so we can swap strategies later
// (e.g. subdomain per locale) without touching every page.

const OG_LOCALE_MAP: Record<Locale, string> = {
  en: "en_US",
  nl: "nl_NL",
  de: "de_DE",
  es: "es_ES",
};

function normalize(path: string): string {
  if (!path || path === "/" || path === "") return "";
  return path.startsWith("/") ? path : `/${path}`;
}

/** `alternates` object for a given locale + unprefixed path (e.g. "/about").
 *  `locales` defaults to all four; pass a subset for market-restricted pages
 *  (e.g. a Dutch-only insight → ["nl"]) so hreflang only points at variants
 *  that actually exist. x-default favours en, else the first available locale. */
export function buildAlternates(
  locale: Locale,
  path: string,
  locales: readonly Locale[] = LOCALES,
): NonNullable<Metadata["alternates"]> {
  const p = normalize(path);
  const languages: Record<string, string> = {};
  for (const l of locales) languages[l] = `/${l}${p}`;
  const xDefault = locales.includes("en") ? "en" : locales[0];
  languages["x-default"] = `/${xDefault}${p}`;
  return {
    canonical: `/${locale}${p}`,
    languages,
  };
}

export function ogLocale(locale: Locale): string {
  return OG_LOCALE_MAP[locale];
}

/** Every OG locale except the current one — for `openGraph.alternateLocale`. */
export function alternateOgLocales(locale: Locale): string[] {
  return LOCALES.filter((l) => l !== locale).map((l) => OG_LOCALE_MAP[l]);
}

/** Type-narrow a possibly-invalid locale string coming from route params. */
export function assertLocale(raw: string): Locale {
  if ((LOCALES as readonly string[]).includes(raw)) return raw as Locale;
  return "en";
}
