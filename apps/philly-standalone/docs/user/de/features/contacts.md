---
slug: features/contacts
lang: de
title: Kontakte
summary: Die Kontakte-Seite — Grid, Suche, Filter-Pills, KI-Auto-Anreicherung, die Detailseite mit Tabs für Activity / Notizen / Projekte / Deals.
tags: [features, contacts, crm-core]
related: [onboarding/first-contact, features/ai-attributes, features/deals, concepts/gdpr]
updated: 2026-04-25
---

# Kontakte

Die `/contacts`-Seite ist das primäre Verzeichnis für jeden, mit
dem deine Organisation zu tun hat. Das Datenmodell ist über
Branchen hinweg dasselbe; nur die Type-Pill-Labels ändern sich
(donor vs buyer vs guest, etc. — siehe
[pick-industry](onboarding/pick-industry)).

## Das Seitenlayout

- **KPI-Strip** oben — Gesamtzahl der Kontakte, plus 3
  branchenspezifische Zählungen (z.B. Partner / Donors /
  Stakeholder für Philanthropie).
- **Toolbar** mit Freitextsuche + Type-Filter-Pills. Die Suche
  matcht über Name, E-Mail und Firma. Filterauswahlen werden in
  der URL gespiegelt, sodass du eine gefilterte Ansicht teilen
  kannst.
- **Grid von Kontaktkarten** — 3 pro Reihe auf Desktop, 1 auf
  Mobile. Jede Karte zeigt Avatar (Initialen), Name, Firma,
  E-Mail, Telefon und Projektanzahl.

Das Grid rendert synchron in den Immobilien-/Hospitality-Modi
(Demo-Daten); im Philanthropie-Modus holt es Live-Daten und
zeigt einen "Loading contacts…"-Banner über dem Grid, während
die API in flight ist.

## Einen Kontakt erstellen

Klicke **+ New contact** in der Topbar (nur Admins + Manager).
Fülle aus: Name (Pflicht), E-Mail, Telefon, Type, Firma, Notizen.

Bei Submit:

1. Der Kontakt wird gespeichert + erscheint im Grid.
2. **KI-Auto-Anreicherung** startet im Hintergrund (wenn
   `ANTHROPIC_API_KEY` gesetzt ist) — Claude leitet Industry,
   ICP-Fit-Score (0–100) und eine einzeilige Summary aus Name +
   Firma + E-Mail-Domain ab. Die Karte zeigt einen kleinen
   Spinner, bis der Aufruf zurückkommt; der Status wechselt von
   `pending` zu `complete`.
3. **Realtime-Broadcast** — jede andere geöffnete
   Dashboard-Tab in deiner Org aktualisiert die Kontaktliste.
4. **Audit-Log-Eintrag** — `entity: contact, action: create`.

## Bulk-Import

`/contacts` hat auch einen CSV-Upload (nur Admins + Manager).
Die erforderlichen Spalten entsprechen dem Erstellen-Formular.
Jede importierte Zeile durchläuft dieselbe Auto-Anreicherung,
gedrosselt auf ~10/Sek, um unter dem KI-Rate-Limit zu bleiben.

Validierung: leere E-Mails werden akzeptiert (Standard `""`);
leere Namen lehnen die Zeile ab; doppelte E-Mails werden
abgelehnt (die contacts-Tabelle behandelt E-Mail als soft-unique
innerhalb einer Org).

## Die Kontakt-Detailseite

Klicke auf eine beliebige Karte → `/contacts/[id]`. Layout:

- **Header-Karte** — Avatar, Name, Firma, Type-Badge,
  Edit/Save/Cancel-Buttons, Type-Farbhintergrund.
- **Tabs** — Overview | Activity | Emails | Notes | Projects | Deals
- **Overview-Tab** — Basisfelder (E-Mail, Telefon, Firma,
  Notizen) + KI-Attribut-Anzeige (Industry, ICP-Score, Summary).
- **Activity-Tab** — jede Interaktion, die gegen diesen Kontakt
  geloggt wurde: Notizen hinzugefügt, Deals verknüpft, E-Mails
  versendet, Anrufe getätigt.
- **Emails-Tab** — Gmail-synchronisierte Nachrichten, bei denen
  die E-Mail-Adresse dieses Kontakts die From- oder
  To-Adresse ist.
- **Notes-Tab** — vom Operator verfasste, mit Zeitstempel
  versehene Notizen; Quick-Add-Formular oben.
- **Projects-Tab** — Projekte, mit denen dieser Kontakt
  verbunden ist.
- **Deals-Tab** — Deals, bei denen dieser Kontakt die verknüpfte
  Gegenpartei ist.

## Inline-Editing

Im Header klicke **Edit**, um in den Inline-Edit-Modus zu
wechseln. Felder werden bearbeitbar; der Save-Button zeigt einen
Spinner während des PATCH und ist deaktiviert, um Doppel-Submits
zu verhindern. Cancel revertiert.

Edit-Modus ist nur für Admin + Manager; Viewer sehen die Daten,
aber keine Edit-Affordance.

## Suchsemantik

Die Freitextsuche in der Toolbar:

- Matcht im Contains-Stil (case-insensitive) über Name, E-Mail
  und Firma
- Debounced (250ms), sodass nicht jeder Tastenanschlag die API
  trifft
- URL-State — `?q=jane&type=donor` spiegelt die aktuellen Filter

Kombinierte Filter wirken additiv: Type-Pill `donor` + Suche
`acme` gibt Donors bei Firmen zurück, die zu "acme" passen.

## Privacy & Retention

Kontaktdaten sind PII (siehe [concepts/gdpr](concepts/gdpr)):

- Auf deine Organisation gescoped; andere Orgs können sie
  niemals sehen.
- Retention-Standard: 3 Jahre seit dem letzten sinnvollen
  Update — konfigurierbar per Zeile-Auto-Purge in
  `lib/gdpr/pii-registry.ts`.
- Unterliegt der Admin-led Data-Subject-Erasure, wenn der
  Kontakt fragt. Die `/gdpr`-Admin-Seite verarbeitet die
  Anfrage — findet jede Zeile, die die E-Mail über Contact,
  Reservation, Volunteer, CallLog, SmsMessage usw. referenziert,
  hard-deletet sie und schreibt einen
  Proof-of-Erasure-Log-Eintrag.

## Wo es weitergeht

- **[Füge deinen ersten Kontakt hinzu](onboarding/first-contact)**
  — die Walkthrough.
- **[KI-Kontakt-Attribute](features/ai-attributes)** — die
  Auto-Anreicherung, die nach dem Erstellen läuft.
- **[Deals](features/deals)** — verknüpfe Kontakte mit
  Gelegenheiten in Bewegung.
- **[GDPR Admin](features/gdpr)** — verarbeite
  Betroffenenanfragen für Kontakte.
