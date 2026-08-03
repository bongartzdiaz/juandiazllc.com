"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useLocale } from "@/lib/i18n/LocaleProvider";
import { localeHref } from "@/lib/i18n/href";

type Props = Omit<ComponentProps<typeof Link>, "href"> & { href: string };

/** next/link met de taalprefix er automatisch voor.
 *
 *  Bedoeld voor client-componenten die de taal niet als prop krijgen — de
 *  navigatie, de footer, de blokken op de homepage. Servercomponenten hebben
 *  `l` al in scope en gebruiken localeHref() rechtstreeks op een gewone Link,
 *  zodat ze servercomponent blijven.
 *
 *  localeHref laat externe adressen, ankers en de routes naast app/[locale]/
 *  ongemoeid, dus dit is veilig als vervanging van elke Link in die
 *  componenten. */
export function LocaleLink({ href, ...rest }: Props) {
  const { locale } = useLocale();
  return <Link href={localeHref(locale, href)} {...rest} />;
}
