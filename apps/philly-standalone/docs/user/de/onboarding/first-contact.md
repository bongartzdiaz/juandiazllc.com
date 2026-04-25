---
slug: onboarding/first-contact
lang: de
title: Füge deinen ersten Kontakt hinzu
summary: Wie man einen Kontakt erstellt, was im Hintergrund automatisch angereichert wird, und wie sich die Per-Branche-Typen unterscheiden.
tags: [onboarding, contacts, getting-started]
related: [features/contacts, onboarding/welcome, features/ai-attributes]
updated: 2026-04-25
---

# Füge deinen ersten Kontakt hinzu

Ein "Kontakt" in Philly ist jede Person oder Organisation, mit der
du Geschäfte machst. Das Formular ist über alle Branchen hinweg
gleich; der **Type**-Picker ändert sich basierend darauf, welche
Branche deine Org betreibt.

## Wo du das machst

`/contacts` → klicke **+ New contact** in der Topbar.

## Felder

Das Formular fragt nach:

- **Name** (Pflicht)
- **E-Mail** (optional, aber empfohlen — die meisten Automatisierungen schlüsseln auf E-Mail)
- **Telefon** (optional)
- **Firma** (optional)
- **Type** — abhängig von deiner Branche:
  - Philanthropie: `partner` / `donor` / `stakeholder` / `beneficiary`
  - Immobilien: `buyer` / `seller` / `tenant` / `landlord` / `investor`
  - Hospitality: `guest` / `vendor` / `partner` / `staff`
- **Notizen** — Freitext. Was auch immer du dir über sie merken willst.

Absenden und der Kontakt erscheint im Grid.

## Was im Hintergrund passiert

Wenn du einen Kontakt erstellst, starten ein paar Dinge automatisch:

1. **KI-Auto-Anreicherung** — wenn `ANTHROPIC_API_KEY` gesetzt ist,
   ruft der Server Claude im Hintergrund auf (über Vercel
   `after()`), um auszufüllen:
   - **Industry** — Best-Guess basierend auf Firmenname +
     E-Mail-Domain
   - **ICP-Fit-Score** — 0–100 Schätzung, wie gut sie zu deinem
     typischen Kunden passen
   - **Summary** — Ein-Zeilen-Beschreibung
   Der `aiAttributesStatus` des Kontakts wechselt von `pending`
   auf `complete`, wenn der LLM-Aufruf zurückkommt. Die UI zeigt
   einen kleinen Spinner auf der Kontaktkarte, während sie
   arbeitet.
2. **Realtime-Broadcast** — jede andere geöffnete Dashboard-Tab
   in deiner Org bekommt ein `contact:created`-Event und
   aktualisiert die Kontaktliste.
3. **Audit-Log-Eintrag** — `entity: contact, action: create` mit
   dir als Akteur.

## Viele Kontakte gleichzeitig importieren

Verwende das **Bulk-Import**-Formular auf der Contacts-Seite
(CSV-Upload). Die CSV muss Spalten haben, die mit den
Formularfeldern übereinstimmen. Bulk-Import läuft dieselbe
Auto-Anreicherung auf jeder Zeile, gedrosselt durch das AI-Rate-
Limit (~10/Sek).

## Einen Kontakt bearbeiten

Klicke auf einen Kontakt im Grid, um die Detailseite zu öffnen.
Klicke **Edit** in der Topbar, um in den Inline-Edit-Modus zu
wechseln. Die Seite holt Aktivität, Notizen, Projekte und Deals
ab, die mit diesem Kontakt verbunden sind.

Der Save-Button zeigt einen Spinner während des PATCH und ist
deaktiviert, um Doppel-Submits zu verhindern.

## Was durchsuchbar und filterbar ist

Die Toolbar über dem Grid hat:

- **Freitextsuche** über Name, E-Mail und Firma
- **Type-Filter** — Pillen oben rechts in der Toolbar
- URL-State — Filterauswahlen werden in der URL gespiegelt, sodass
  du eine gefilterte Ansicht teilen kannst

## Privacy-Haltung

Kontaktdaten sind PII. Sie sind:

- Auf deine Organisation gescoped (andere Orgs können sie
  niemals sehen)
- Auto-Purge 3 Jahre nach Erstellung, wenn die Zeile seitdem
  nicht berührt wurde (konfigurierbar in
  `lib/gdpr/pii-registry.ts`)
- Unterliegt Admin-led Data-Subject-Erasure, wenn der Kontakt
  fragt — siehe [DSGVO-Selfservice](concepts/gdpr).

## Wo es weitergeht

- **[Contacts page reference](features/contacts)** — die volle
  Feature-Aufschlüsselung.
- **[AI contact attributes](features/ai-attributes)** — was die
  Auto-Anreicherung tut und wie du sie per-Org deaktivierst.
- **[Füge deinen ersten Deal hinzu](onboarding/first-deal)** — das
  Nächste, was die meisten neuen Orgs tun.
