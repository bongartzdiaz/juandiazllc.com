---
slug: onboarding/your-first-week
lang: de
title: Deine erste Woche
summary: Eine tagesweise Checkliste, die einen brandneuen Admin in fünf Werktagen von null zu einem voll vernetzten CRM bringt.
tags: [onboarding, getting-started, admin, checklist]
related: [onboarding/welcome, onboarding/create-organization, onboarding/invite-team, onboarding/first-contact]
updated: 2026-04-25
---

# Deine erste Woche

Das ist eine Fünf-Tage-Checkliste. Sie geht davon aus, dass du der
erste Admin in einer brandneuen Organisation bist. Nichts davon
ist Pflicht — aber wenn du ihr folgst, landest du am Ende in einer
Position, in der das CRM echte Arbeit für dich erledigt, statt
leer dazustehen.

## Tag 1 — Tenant booten

- [ ] Melde dich auf der Brand-Site mit deiner Admin-E-Mail an.
- [ ] Schließe `/onboarding` ab — benenne deine Organisation,
      wähle einen Anzeigenamen. Du wirst Admin.
- [ ] Besuche `/settings` → setze deine Branche
      ([Philanthropie / Immobilien / Hospitality](onboarding/pick-industry)).
- [ ] Öffne `/api/health` im Browser. Erwarte 200 + einen
      Datenbank-Check unter 100ms. Bekommst du 503, sind die
      DB-Env-Vars nicht gesetzt — fix das zuerst.

**Ende Tag 1**: Tenant existiert, du bist Admin, Env ist
gesund.

## Tag 2 — Lade dein Team ein

- [ ] `/settings/users` → lade jeden Teamkollegen per E-Mail
      ein. Wähle die richtige Rolle:
      - Admin für jeden, der Benutzer einladen / bearbeiten muss
      - Manager für das operative Team (Sales, Ops, Comms)
      - Viewer für Vorstandsmitglieder, Auditoren,
        Read-Only-Execs
- [ ] Entscheide über Per-Sektion-Einschränkungen, wo nützlich
      — z.B. brauchen Vorstandsmitglieder typischerweise nur
      `dashboard`, `reports`, `impact`. Setze ihre
      `dashboardSections` entsprechend.
- [ ] Lass mindestens einen Teamkollegen erfolgreich einloggen,
      damit du den Einladungsfluss end-to-end bewiesen hast.

**Ende Tag 2**: Team kann einloggen. Jede Person sieht die
richtige Sidebar.

## Tag 3 — Richte dein Datenshape ein

- [ ] `/settings/pipelines` → überprüfe die Standard-Pipeline
      für deine Branche. Bearbeite Stage-Namen, um deinem
      tatsächlichen Sales-/Donor-/Booking-Prozess zu
      entsprechen. Füge eine zweite Pipeline hinzu, wenn du
      separate Flows hast (z.B. "Major gifts" vs "Recurring
      donors").
- [ ] Wenn du Immobilien oder Hospitality bist:
      - `/settings/property-taxonomy` → passe Districts,
        Property-Types und Flags an deinen Markt an.
- [ ] Entscheide, wie du Aufgaben verfolgst. Die meisten Teams
      nutzen:
      - `/calendar` für geplante Events + Meetings
      - Activity-Einträge auf Kontakten für Ad-hoc Follow-ups
      - `/automations` für wiederkehrende "if X then create
        task" Regeln

**Ende Tag 3**: Pipelines + Taxonomie passen zu der Art, wie
dein Team tatsächlich arbeitet.

## Tag 4 — Externe Tools verbinden

- [ ] `/integrations` → verbinde mindestens eines von:
      - Google (Gmail + Kalender) — speist `/email` und
        `/calendar`
      - Twilio (SMS + WhatsApp) — speist `/sms`
      - DocuSign / HelloSign — speist `/e-signatures` und
        `/transactions`
- [ ] Generiere einen API-Key unter `/settings/api-keys`, wenn
      du externe Tools hast, die programmatisch CRM-Daten lesen
      / schreiben müssen (Zapier, n8n, eigene Skripte).
- [ ] Richte einen Webhook unter `/settings/webhooks` ein, wenn
      du CRM-Events nach Slack, Discord oder dein eigenes
      Endpoint pushen willst.

**Ende Tag 4**: Externe Tools sind verkabelt. Eingehende
E-Mails und Kalender-Events fließen automatisch ins CRM.

## Tag 5 — Echte Daten laden + erste Automatisierung

- [ ] Bulk-importiere deine Kontakte über `/contacts` →
      CSV-Upload. Matche die Spalten zu den Formularfeldern;
      KI-Auto-Anreicherung füllt Industry / ICP-Fit / Summary
      im Hintergrund.
- [ ] Erstelle ein paar echte Deals in `/deals`, sodass du sie
      auf dem [Kanban-Board](features/kanban) fließen siehst.
- [ ] Baue deine erste Automatisierung in `/automations`.
      Häufige Starter-Regeln:
      - "Stage = stale (kein Update in 14 Tagen) → E-Mail an
        den Deal-Owner"
      - "Neuer Kontakt mit 'donor' getaggt → zu Mailing-Liste
        hinzufügen"
      - "Deal-Wert > €10.000 → benachrichtige Slack"

**Ende Tag 5**: Echte Daten sind drin. Das CRM erledigt
automatische Arbeit für dich.

## Über Woche 1 hinaus

Sobald du die Basics geschafft hast:

- **Richte den KI-Assistenten ein**, falls noch nicht — der
  In-App-Chat auf `/assistant` weiß, wie jede Feature
  funktioniert und beantwortet Fragen in einfacher Sprache.
  Operator-Setup ist in `docker/ollama/README.md`.
- **Überprüfe dein Audit-Log wöchentlich** — `/audit` zeigt
  jede Mutation in deinem Tenant. Verifiziere monatlich die
  [Hash-Chain](features/audit) auf
  `/api/admin/audit/verify`.
- **Mach eine DSGVO-Übung** — wähle eine echte
  Kontakt-E-Mail-Adresse, durchlaufe die
  `/gdpr`-Admin-Export- + Erasure-Flows auf einer Testkopie.
  Du willst Vertrauen in das Verfahren haben, bevor eine echte
  Anfrage eintrifft.

## Wo es weitergeht

- **[Rollen & Rechte](concepts/roles)** — Tiefenbohrung in das,
  was jede Rolle kann.
- **[Tenancy & Datenisolation](concepts/tenancy)** — wie Philly
  deine Daten von anderen Organisationen getrennt hält.
- **[DSGVO-Selfservice](concepts/gdpr)** — Operator- und
  Admin-led Datenrechts-Flows.
