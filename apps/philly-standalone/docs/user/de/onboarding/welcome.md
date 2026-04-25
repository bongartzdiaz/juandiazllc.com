---
slug: onboarding/welcome
lang: de
title: Willkommen bei Philly CRM
summary: Was das CRM tut, für wen es gedacht ist, und der Fünf-Minuten-Pfad von der ersten Anmeldung zu einem funktionierenden Tenant.
tags: [onboarding, getting-started, overview]
related: [onboarding/create-organization, onboarding/invite-team, concepts/tenancy]
updated: 2026-04-25
---

# Willkommen bei Philly CRM

Philly ist ein operator-first CRM. Es zentralisiert die Arbeit
einer kleinen oder mittelgroßen Organisation — deine Kontakte,
deine Deals, deine Projekte, deinen Posteingang, deinen Kalender —
und ergänzt die Integrationen und KI-Tools, die Rohdaten in
Aktion verwandeln.

## Für wen ist es

Philly bedient drei Branchen aus einer Codebase:

- **Philanthropie** — Partner, Spender, Begünstigte, Stakeholder, Fördermittel, Wirkungsmetriken.
- **Immobilien** — Käufer, Verkäufer, Objekte, Inserate, Transaktionen, Provisionen.
- **Hospitality** — Gäste, Reservierungen, Zimmer, Lieferanten, Personal.

Das Dashboard passt sich automatisch an die ausgewählte Branche
an. Die meisten Seiten existieren in allen drei Modi; eine
Handvoll ist branchenspezifisch.

## Was du am ersten Tag bekommst

- Eine Multi-Tenant-Datenbank, in der jeder Datensatz auf deine
  Organisation gescoped ist. Andere Organisationen können deine
  Daten niemals sehen.
- Rollenbasierte Zugriffe (Admin / Manager / Viewer) mit einer
  per-Sektion Allow-List — du kannst einem Viewer Zugriff auf
  "Deals" geben, aber "Audit-Log" verbergen.
- Eine vollständige Audit-Spur über wer-was-getan-hat, mit
  kryptografischer Manipulationssicherheit (Artikel 30 DSGVO
  Aufzeichnungspflicht).
- Selfservice-DSGVO-Tooling — Operatoren können ihren eigenen
  Account exportieren oder löschen; Admins können
  Betroffenenanfragen für Kontakte verarbeiten.
- Eine vollständige Privacy-Haltung: keine Analytics-Cookies,
  keine Fingerprinting, keine Drittanbieter-Tracker. Das CRM
  funktioniert ohne Cookie-Consent-Banner.

## Setup in fünf Minuten

Eine brandneue Anmeldung durchläuft `/onboarding`:

1. **Anmelden** mit deiner E-Mail-Adresse auf der Brand-Site (Supabase Auth).
2. **Erstelle deine Organisation** — wähle einen Namen; du wirst Admin.
3. **Lade dein Team ein** — Admin → `/settings/users` → E-Mail + Rolle.
4. **Wähle deine Branche** — Einstellungen → `industry` (Philanthropie / Immobilien / Hospitality).
5. **Füge deinen ersten Datensatz hinzu** — einen Kontakt, einen Deal, ein Projekt, ein Objekt — was auch immer du zuerst angehen würdest.

Das war's. Der Rest dieser Anleitung führt jeden dieser Schritte
detailliert durch und verlinkt unterwegs auf Feature-Docs.

## Wo es weitergeht

- **[Erstelle deine Organisation](onboarding/create-organization)** — der allererste Schritt bei der ersten Anmeldung.
- **[Lade dein Team ein](onboarding/invite-team)** — pre-erstelle Teamkollegen-Konten, damit sie bei der ersten Anmeldung in deiner Org landen.
- **[Rollen & Rechte](concepts/roles)** — Admin vs Manager vs Viewer, plus die per-Sektion Allow-List.
- **[Tenancy & Datenisolation](concepts/tenancy)** — wie das CRM deine Daten von anderen Organisationen getrennt hält.
- **[Deine Privatsphäre & Datenrechte](concepts/gdpr)** — die Selfservice "Meine Daten exportieren" und "Meinen Account löschen" Flows.

Wenn du nicht weiterkommst, kann der Assistent unten rechts
Fragen zu jedem Feature in einfacher Sprache beantworten.
