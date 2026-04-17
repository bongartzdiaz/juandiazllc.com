"use client";

import { createContext, useContext, useEffect, useState, useCallback } from "react";
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

function readCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${COOKIE}=([^;]*)`));
  const v = m?.[1] as Locale | undefined;
  return v && (LOCALES as readonly string[]).includes(v) ? v : null;
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);

  useEffect(() => {
    const fromCookie = readCookie();
    if (fromCookie) {
      setLocaleState(fromCookie);
      document.documentElement.lang = fromCookie;
      return;
    }
    // Detect from browser
    const browser = navigator.language?.slice(0, 2).toLowerCase();
    if (browser && (LOCALES as readonly string[]).includes(browser)) {
      setLocaleState(browser as Locale);
      document.documentElement.lang = browser;
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    document.documentElement.lang = l;
    document.cookie = `${COOKIE}=${l}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;
  }, []);

  const t = useCallback((key: string) => translate(locale, key), [locale]);

  return (
    <LocaleCtx.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleCtx.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleCtx);
}
