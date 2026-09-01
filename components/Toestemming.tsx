"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { LocaleLink } from "@/components/LocaleLink";
import { useT } from "@/lib/i18n/useT";
import {
  leesToestemming,
  schrijfToestemming,
  TOESTEMMING_EVENT,
  type Keuze,
} from "@/lib/toestemming";

/* De banner plus de GA4-lader, bewust in een bestand. Ze delen precies een
   feit -- staat er "ja" in de opslag -- en dat feit over twee componenten
   verdelen is hoe twee lijsten ontstaan die uit elkaar lopen.

   HET TAG-NUMMER STAAT LETTERLIJK IN process.env. Geen bracket-toegang: Next
   vervangt alleen letterlijke uitdrukkingen bij het bouwen, dus
   `process.env[NAAM]` levert op de client `undefined` op. lib/env-voorbeeld
   .test.ts dwingt dat af, na de CAL_WEBHOOK_SECRET die daar maanden door uit
   .env.example bleef. */
const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

type GtagVenster = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
};

let geladen = false;

/* Google's eigen uitschakelaar. Hij wordt bij het VERZENDEN gelezen, dus hij
   werkt ook nadat gtag.js al geladen is -- en dat is precies het geval dat
   telt: iemand die op /privacy zijn toestemming intrekt terwijl het script
   al draait. Zonder dit zou intrekken pas werken na een herlading, en dan is
   "net zo makkelijk als geven" niet waar. */
function zetGa4Uitschakelaar(uit: boolean): void {
  if (!GA4_ID || typeof window === "undefined") return;
  (window as unknown as Record<string, unknown>)[`ga-disable-${GA4_ID}`] = uit;
}

/* Injecteren via createElement, niet via next/script. Dat is geen smaak maar
   de enige vorm die aan BEIDE policies in proxy.ts voldoet:

     afgedwongen   host-allowlist  -> googletagmanager.com staat erin
     report-only   'strict-dynamic' -> host-allowlists worden genegeerd; wat
                                       telt is dat een vertrouwd script het
                                       injecteert, en dit effect draait in een
                                       Next-chunk die zijn nonce al droeg

   Met next/script zou de afgedwongen policy het toelaten en de strikte erover
   klagen, en dan wordt die canary onbruikbaar door de ruis. */
function laadGa4(): void {
  if (geladen || !GA4_ID || typeof window === "undefined") return;
  geladen = true;

  const w = window as GtagVenster;
  w.dataLayer = w.dataLayer || [];
  const gtag = (...args: unknown[]) => {
    w.dataLayer?.push(args);
  };
  w.gtag = gtag;

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);

  gtag("js", new Date());
  gtag("config", GA4_ID, {
    /* In GA4 is IP-anonimisering altijd aan en is deze vlag een no-op. Hij
       staat er voor pariteit met landing/_compliance.js op diazatlas, zodat
       de twee configuraties naast elkaar te lezen zijn. */
    anonymize_ip: true,
    /* Deze twee zijn geen no-op. Ze houden de data uit Google Signals en uit
       advertentiepersonalisatie, en dat is precies het verschil tussen "een
       statistiekdoel" en "een advertentiedoel". Gaan ze ooit aan, dan is dat
       een NIEUW doel en moet TOESTEMMING_VERSIE omhoog. */
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    send_page_view: true,
  });
}

export function Toestemming() {
  const t = useT();
  const pathname = usePathname();
  /* undefined = nog niet uitgelezen. Onderscheiden van null (niet gevraagd),
     anders knippert de banner een frame bij iedereen die al gekozen heeft. */
  const [keuze, setKeuze] = useState<Keuze | null | undefined>(undefined);
  const eersteMeting = useRef(true);

  useEffect(() => {
    const lees = () => {
      const k = leesToestemming();
      setKeuze(k);
      /* De uitschakelaar EERST, dan pas laden. Andersom zou een eerste
         page_view kunnen vertrekken voordat de vlag staat. */
      zetGa4Uitschakelaar(k !== "ja");
      if (k === "ja") laadGa4();
    };
    lees();
    window.addEventListener(TOESTEMMING_EVENT, lees);
    return () => window.removeEventListener(TOESTEMMING_EVENT, lees);
  }, []);

  /* GA4 stuurt zelf een page_view bij het laden en daarna nooit meer -- deze
     site navigeert client-side, dus zonder dit telt een heel bezoek als een
     pagina. De eerste navigatie na het laden slaan we over, want die heeft
     `send_page_view` al gedekt. */
  useEffect(() => {
    if (keuze !== "ja" || !geladen) return;
    if (eersteMeting.current) {
      eersteMeting.current = false;
      return;
    }
    (window as GtagVenster).gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
    });
  }, [pathname, keuze]);

  const kies = useCallback((k: Keuze) => {
    schrijfToestemming(k);
  }, []);

  /* Geen tag ingesteld, geen banner. Een toestemmingsvraag stellen over iets
     dat niet bestaat is de bezoeker lastigvallen zonder reden. */
  if (!GA4_ID) return null;
  if (keuze !== null) return null;

  return (
    <section className="toestemming" role="region" aria-label={t("consent.aria")}>
      <div className="toestemming-tekst">
        <strong>{t("consent.title")}</strong>
        <p>{t("consent.body")}</p>
        <p>
          <LocaleLink href="/privacy">{t("consent.more")}</LocaleLink>
        </p>
      </div>
      <div className="toestemming-knoppen">
        {/* Even zwaar, met opzet. Weigeren moet net zo makkelijk zijn als
            accepteren; een grote groene "accepteer" naast een grijs linkje is
            precies het patroon waar de AP handhaaft. */}
        <button type="button" className="btn" onClick={() => kies("nee")}>
          {t("consent.no")}
        </button>
        <button type="button" className="btn" onClick={() => kies("ja")}>
          {t("consent.yes")}
        </button>
      </div>
    </section>
  );
}
