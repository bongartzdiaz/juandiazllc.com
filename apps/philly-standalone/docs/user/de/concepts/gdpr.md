---
slug: concepts/gdpr
lang: de
title: Datenschutz & deine Datenrechte
summary: Selfservice-Export und Account-Löschung für Operatoren, plus der Admin-led-Betroffenenflow für Kontakte.
tags: [concepts, gdpr, privacy, data-rights, security]
related: [onboarding/create-organization, concepts/tenancy, features/gdpr]
updated: 2026-04-25
---

# Datenschutz & deine Datenrechte

Philly liefert DSGVO-konformes Tooling out-of-the-box. Zwei Flows
existieren:

1. **Selfservice** — für dich, den Operator. Exportiere deine
   Account-Daten oder plane die Löschung deines Accounts. Kein
   Admin nötig.
2. **Admin-led** — für Kontakte / Freiwillige / Gäste, die *von*
   einer Organisation gespeichert werden. Ein Admin verarbeitet
   den Antrag im Auftrag der Org als Datenverantwortlicher.

## Selfservice: deine Daten exportieren

Artikel 15 DSGVO (Auskunftsrecht).

- Endpoint: `GET /api/me/data-export`
- Gibt zurück: JSON-Download jedes Datensatzes, den das CRM
  über dich aufbewahrt — deine `User`-Zeile, deine geschriebenen
  Notizen, deine Aktivitätshistorie, deine Audit-Log-Einträge
  usw. Geheime Felder (`passwordHash`, `twoFactorSecret`,
  OAuth-Tokens) sind aus Sicherheitsgründen redigiert; der Rest
  sind deine Daten verbatim.
- Rate-limited auf 5 Exports pro Monat pro Benutzer.
- Audit-logged: eine `GdprExportLog`-Zeile dokumentiert, dass
  ein Export stattfand, mit einem SHA-256-Hash deiner E-Mail
  (damit der Beweis die eventuelle Löschung deines Accounts
  überlebt, ohne die E-Mail selbst zu behalten).

Trigger vom Dashboard über dein Profilmenü, oder `curl` direkt
mit deinem Session-Cookie.

## Selfservice: deinen Account löschen

Artikel 17 DSGVO (Recht auf Löschung).

- `POST /api/me/account-deletion {confirm: "DELETE"}` plant
  deinen Account für die Löschung in **30 Tagen**. Während des
  Karenzfensters:
  - Kannst du dich noch anmelden und das CRM normal verwenden.
  - Kannst du die geplante Löschung jederzeit per
    `DELETE /api/me/account-deletion` abbrechen.
- Nach 30 Tagen löscht der nächtliche Retention-Cron
  (`/api/cron/gdpr-retention`) hart deine `User`-Zeile.
  Cascade-Delete kümmert sich automatisch um `ContactNote`,
  `Activity`, `TwoFactorRecoveryCode` und ähnliche Children.
- Eine `GdprErasureLog`-Zeile dokumentiert die Löschung mit
  einem Hash deiner E-Mail — Beweis für eine Aufsichtsbehörde,
  dass wir den Antrag verarbeitet haben, unbegrenzt aufbewahrt.
- **Last-Admin-Schutz**: wenn du der einzige Admin in deiner
  Organisation bist, weigert sich das System, deine Löschung
  mit einem `409 Conflict` zu planen. Befördere zuerst einen
  anderen Teamkollegen zum Admin, sonst wäre die Org
  verwaist.

## Admin-led: Betroffenenanfrage Auskunft (DSAR)

Wenn ein Kontakt, Freiwilliger, Gast oder anderer Dritter in
deiner Organisation fragt "welche Daten habt ihr über mich?",
verarbeitet der Admin es per:

- `POST /api/admin/gdpr/data-subject-export` mit `{email, reason?}`
- Gibt zurück: JSON-Download jeder Zeile in jeder
  PII-tragenden Tabelle, die auf diese E-Mail verweist —
  innerhalb deiner Organisation. Cross-Tenant-Daten werden
  niemals zurückgegeben.

Die Anfrage ist rate-limited (10 pro Stunde pro Admin) und
geloggt mit dem Akteur und dem SHA-256 der E-Mail des
Betroffenen.

## Admin-led: Betroffenen-Löschung

Wenn ein Kontakt sagt "löscht alles, was ihr über mich habt":

- `POST /api/admin/gdpr/data-subject-erasure` mit
  `{email, reason, confirm: "ERASE"}`
- Das Reason-Feld ist **Pflicht** — Artikel-30-Aufzeichnungen
  verlangen, dass der Verantwortliche dokumentiert, warum eine
  Löschung verarbeitet wurde.
- Hard-deletes jede PII-Zeile, die auf diese E-Mail verweist
  (Contact, Reservation, Volunteer, OpenHouseVisit, Message,
  ESignature, CallLog, SmsMessage). Cascade-Deletes kümmern
  sich um Children (ContactNote, Activity).
- Eine `GdprErasureLog`-Zeile dokumentiert die Löschung mit
  einem SHA-256-Hash der E-Mail und den
  Pro-Modell-Zeilenanzahlen. **Unbegrenzt aufbewahrt** — der
  Beweis muss die Daten selbst überleben.

Wenn das Proof-of-Erasure-Log fehlschlägt (DB-Fehler usw.),
gibt das Endpoint einen 500 statt 200 zurück. Ohne den
Log-Eintrag könnten wir die Löschung einer Aufsichtsbehörde
nicht beweisen — was selbst eine Verletzung wäre.

## Verzeichnis von Verarbeitungstätigkeiten (Artikel 30)

Das vollständige Register jeder Verarbeitungstätigkeit, die
Philly durchführt, lebt in `lib/gdpr/ropa.ts` und wird für
Admins auf `/gdpr` gerendert. Es dokumentiert:

- Welche Tätigkeiten wir durchführen
  (Operator-Authentifizierung, Kontaktverwaltung,
  Hospitality-Reservierungen usw.)
- Die Rechtsgrundlage für jede (Art. 6(1)(b) Vertrag, (1)(f)
  berechtigtes Interesse, (1)(c) rechtliche Verpflichtung
  usw.)
- Kategorien der Betroffenen
- Datenkategorie und Aufbewahrungsdauer
- Empfänger und etwaige Drittlandübermittlungen
- Technische und organisatorische Sicherheitsmaßnahmen

Das ist das Dokument, das eine Aufsichtsbehörde unter Artikel
30 anfordern würde.

## Datenschutzerklärung & Cookie-Richtlinie

Beide befinden sich in `docs/legal/`:

- `PRIVACY-NOTICE.md` — die Artikel-13/14-Erklärungsvorlage,
  bereit zur Anpassung an den Namen deiner Rechtspersönlichkeit.
- `COOKIE-POLICY.md` — die Audit jedes Cookies, das das CRM
  setzt. Spoiler: nur strikt notwendig, kein Banner nötig.

## Datenschutzverletzung-Reaktion

`docs/legal/BREACH-RESPONSE.md` ist das On-Call-Runbook für eine
vermutete personenbezogene Datenschutzverletzung: Triage,
Untersuchung, Meldung an die Aufsichtsbehörde innerhalb von 72
Stunden (Art. 33), Benachrichtigung der betroffenen Personen,
wenn das Risiko hoch ist (Art. 34), und Schreiben einer
Post-Incident-Review.

## Wo es weitergeht

- **[GDPR-Admin-Seite](features/gdpr)** — die UI, die Admins
  verwenden, um DSARs zu verarbeiten.
- **[Tenancy & Datenisolation](concepts/tenancy)** — warum
  Cross-Tenant-DSARs unmöglich sind.
- **[Audit-Log](features/audit)** — der forensische Datensatz,
  der alles oben Genannte untermauert.
