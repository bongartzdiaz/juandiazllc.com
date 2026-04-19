"use client";

import { createContext, useContext, useCallback, useMemo } from "react";
import { useParams, useRouter, usePathname } from "next/navigation";
import {
  DEFAULT_LOCALE,
  type Locale,
  LOCALES,
  translate,
} from "./dict";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LocaleCtx = createContext<Ctx>({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
  t: (k) => k,
});

const COOKIE = "jdl_locale";

function swapLocale(pathname: string, current: Locale, next: Locale): string {
  const prefix = `/${current}`;
  if (pathname === prefix) return `/${next}`;
  if (pathname.startsWith(prefix + "/")) return `/${next}${pathname.slice(prefix.length)}`;
  return `/${next}${pathname === "/" ? "" : pathname}`;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const params = useParams() as { locale?: string };
  const router = useRouter();
  const pathname = usePathname() ?? "/";

  const locale: Locale =
    params.locale && (LOCALES as readonly string[]).includes(params.locale)
      ? (params.locale as Locale)
      : DEFAULT_LOCALE;

  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `${COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
      // Keep the DOM in sync — root layout's <html lang> is cached across
      // client-side navigations, so we mirror the cookie on document.
      if (typeof document !== "undefined") document.documentElement.lang = l;
      router.push(swapLocale(pathname, locale, l));
    },
    [pathname, locale, router],
  );

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleCtx.Provider value={value}>{children}</LocaleCtx.Provider>;
}

export function useLocale() {
  return useContext(LocaleCtx);
}
