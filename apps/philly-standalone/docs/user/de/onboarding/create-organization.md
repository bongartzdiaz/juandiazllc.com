---
slug: onboarding/create-organization
lang: de
title: Erstelle deine Organisation
summary: Wie eine brandneue Anmeldung einen frischen Tenant auf /onboarding bootstrapped und als erster Admin landet.
tags: [onboarding, organization, admin, tenancy]
related: [onboarding/welcome, onboarding/invite-team, concepts/tenancy, concepts/roles]
updated: 2026-04-25
---

# Erstelle deine Organisation

Wenn du dich zum ersten Mal mit einer neuen E-Mail-Adresse bei
Philly anmeldest, leitet das CRM dich zu `/onboarding`. Dort
erstellst du deine eigene Organisation — und wirst ihr Admin.

## Warum es das gibt

Jede Organisation in Philly ist ein Tenant. Jeder Datensatz —
Kontakte, Deals, Projekte, Audit-Logs — ist auf eine Organisation
gescoped und leakt niemals in eine andere. Der Bootstrap-Schritt
verhindert die Situation, in der zwei nicht zusammenhängende
Unternehmen sich anmelden und versehentlich Daten teilen.

Bevor dieser Flow existierte, fügte das CRM jeden neuen Benutzer
automatisch einer einzigen gemeinsamen Standardorganisation hinzu.
Das war ein Multi-Tenancy-Bug; der Onboarding-Schritt ist die
Korrektur.

## Der Flow

1. Melde dich auf der Brand-Site mit einem Supabase-verwalteten
   E-Mail-Konto an.
2. Das Dashboard-Layout ruft `GET /api/onboarding/status` auf.
   Wenn du noch keine Philly-Benutzerzeile hast, wirst du zu
   `/onboarding` weitergeleitet.
3. Fülle auf `/onboarding` aus:
   - **Organisationsname** — Pflicht; 2–120 Zeichen. Dies ist der
     öffentlich-artige Name in der Topbar.
   - **Anzeigename** — optional; wie Teamkollegen und Berichte sich
     auf dich beziehen. Standardmäßig der Teil deiner E-Mail vor dem `@`.
4. Absenden. Der Server erstellt eine `Organization`-Zeile + eine
   `User`-Zeile (du, mit `role: admin`) in einer
   Datenbank-Transaktion. Wenn eine fehlschlägt, committed keine —
   du landest niemals halb-erstellt.
5. Du wirst zum Dashboard weitergeleitet. Dein Tenant ist live.

## Was automatisch passiert

- Eine eindeutige Slug wird vom Organisationsnamen abgeleitet.
  Wenn du `Acme Inc.` eingibst, wird die Slug `acme-inc`. Wenn
  diese Slug vergeben ist, hängt das System `-2`, `-3` usw. an,
  bis eine freie Slug gefunden ist.
- Deine erste User-Zeile wird mit `role: admin` und vollem
  Dashboard-Zugriff (`dashboardSections: null`, was jede Sektion
  bedeutet) erstellt.
- Ein Audit-Log-Eintrag wird geschrieben — `entity: organization`,
  `action: create` — mit dir als Akteur. Das ist die Genesis-Zeile
  im Hash-Chained-Audit-Log deines Tenants.

## Was, wenn ich aktualisiere / doppelt absende?

Idempotent. Wenn der Server sieht, dass deine E-Mail bereits eine
Philly-Benutzerzeile hat, gibt er `409 ALREADY_ONBOARDED` zurück
und weigert sich, einen zweiten Tenant zu erstellen. Du kannst
dich nicht versehentlich duplizieren.

## Was, wenn meine Organisation schon in Philly ist?

Wenn ein Admin in einer bestehenden Organisation dich einlädt
(über `/settings/users` → New user), pre-erstellt er deine
Philly-Benutzerzeile. Wenn du dich dann anmeldest, findet das
System deine Zeile und landet dich in seiner Organisation — du
überspringst `/onboarding` vollständig.

Wenn du also eine Einladung erwartet hast, aber auf `/onboarding`
gelandet bist, hat der Admin dich wahrscheinlich noch nicht
eingeladen. Melde dich ab und bitte ihn, dich einzuladen, dann
melde dich wieder an.

## Berechtigungen als Bootstrap-Admin

- Alle Dashboard-Sektionen
- Benutzer in deiner Org einladen / bearbeiten / entfernen
- Betroffenenanfragen (Export, Löschung) für Kontakte verarbeiten
- Integrationen, Automatisierungen, Webhooks, API-Keys konfigurieren
- Audit-Log einsehen und verifizieren

Du kannst die Admin-Rolle später übergeben — siehe
[Rollen & Rechte](concepts/roles) — aber das System blockiert
das Entfernen des *letzten* Admins in der Org. Befördere zuerst
einen Nachfolger.

## Wo es weitergeht

- **[Lade dein Team ein](onboarding/invite-team)** — bringe
  Teamkollegen mit den richtigen Rollen in deine Org.
- **[Rollen & Rechte](concepts/roles)** — was Admin / Manager
  / Viewer jeweils tun können.
- **[Wähle deine Branche](onboarding/pick-industry)** — wähle
  Philanthropie / Immobilien / Hospitality, damit das Dashboard
  sich anpasst.
