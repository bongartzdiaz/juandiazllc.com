"use client";

import { useLocale } from "./LocaleProvider";

export function useT() {
  const { t } = useLocale();
  return t;
}
