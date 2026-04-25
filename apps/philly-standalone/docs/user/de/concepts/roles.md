---
slug: concepts/roles
lang: de
title: Rollen & Rechte
summary: Was Admin, Manager und Viewer jeweils tun können, plus wie die Per-Sektion-Allow-List den Zugriff weiter einschränkt.
tags: [concepts, roles, permissions, security, admin]
related: [onboarding/invite-team, concepts/tenancy, features/settings-users]
updated: 2026-04-25
---

# Rollen & Rechte

Philly hat drei Rollen. Innerhalb jeder Rolle schränkt eine
optionale **Per-Sektion-Allow-List** den Zugriff weiter ein. Die
beiden Schichten kombinieren sich: ein Benutzer kann etwas nur
tun, wenn seine Rolle es erlaubt UND die Sektion in seiner
Allow-List steht.

## Die drei Rollen

### Admin

Kann alles in seiner Organisation tun:

- Benutzer einladen, bearbeiten, entfernen
- Die Rolle eines anderen ändern (außer er kann den letzten
  Admin nicht degradieren)
- Integrationen, Automatisierungen, Webhooks und API-Keys
  konfigurieren
- Betroffenenanfragen (Export, Löschung) für Kontakte
  verarbeiten
- Audit-Log einsehen und verifizieren
- Den Branchenmodus für die Org einstellen
- Auf jede Dashboard-Sektion zugreifen, ungeachtet der
  Allow-List

Admins existieren zum Administrieren. Die meisten Operatoren
müssen keine sein.

### Manager

Kann die alltäglichen Daten seiner Organisation mutieren, aber
nicht die Organisation selbst:

- Kontakte, Deals, Projekte, Objekte, Reservierungen,
  Kalenderereignisse erstellen, bearbeiten, löschen
- E-Mails und SMS versenden
- KI-Tools ausführen (Command-Bar, Scoring, Contact Attributes)
- Kann keine Benutzer einladen, keine Rollen ändern, keinen
  Zugriff auf Settings-Seiten, keine Integrationen oder
  Automatisierungen konfigurieren

Die meisten CRM-Benutzer sind Manager.

### Viewer

Nur-Lesen über die Sektionen, die ihre Allow-List enthält:

- Durch Kontakte, Deals, Projekte usw. browsen
- Dashboards und Berichte einsehen
- Kann nichts erstellen, bearbeiten oder löschen
- Kann nichts versenden (keine E-Mail, keine SMS, keine
  KI-Mutationen)

Verwende dies für Vorstandsmitglieder, Auditoren oder
Read-Only-Exec-Dashboards.

## Die Per-Sektion-Allow-List

Jeder Benutzer hat ein `dashboardSections`-Feld. Es kann sein:

- **`null`** — voller Zugriff. Der Benutzer sieht jede Sektion,
  die seine Rolle erlaubt. Neue Benutzer haben standardmäßig hier.
- **Eine Liste von Section-Slugs** — strikte Allow-List. Der
  Benutzer sieht nur die Sektionen in der Liste. Sidebar-Items
  außerhalb der Liste sind versteckt, und jede API-Route darunter
  gibt 403 zurück.

Beispiel: ein Viewer mit
`dashboardSections: ["dashboard", "contacts", "reports"]` sieht
nur diese drei Sektionen — keine Deals, kein Kanban, keine
Settings.

**Admins sind ausgenommen.** Ein Admin mit eingeschränkter
Allow-List bekommt trotzdem jede Sektion. Das verhindert, dass
ein Admin sich versehentlich aus Admin-Funktionen aussperrt.

Slugs sind in `lib/philly/sections.ts` definiert. Häufige:
`dashboard`, `contacts`, `deals`, `projects`, `kanban`, `calendar`,
`timeline`, `email`, `sms`, `ai`, `settings`, `audit`, `notifications`.

## Wo Rollen-Checks passieren

Jede API-Route unter `/api/` ruft oben einen von drei Guards auf:

- `requireScope()` — muss eingeloggt sein und einen
  Philly-Benutzer haben. Gibt den Auth-Scope (userId,
  organizationId, role, Allow-List) zurück.
- `requireRole(['admin', 'manager'])` — verlangt zusätzlich, dass
  die Rolle in der erlaubten Liste steht. Gibt sonst 403 zurück.
- `requireSection('contacts', ['admin', 'manager'])` — schützt
  sowohl per Section-Slug als auch (optional) per Rolle. Der
  Standard für die meisten CRM-Mutation-Routen.

Wenn du neue API-Routen baust, verwende eine davon. Das
[Tenant-Isolation-Audit-Skript](features/audit-tenancy)
verifiziert bei jedem Commit, dass keine Route ohne Guard
durchrutscht.

## Häufige Rollenwechsel

### Einen Manager zum Admin befördern

`/settings/users` → klicke auf den Benutzer → ändere Rolle → save.
Audit-logged.

### Einen Manager auf bestimmte Sektionen einschränken

`/settings/users` → klicke auf den Benutzer → klappe "Dashboard
sections" auf → entferne die Häkchen bei den Sektionen, die sie
nicht sehen sollten → save. Ihre bestehenden Sessions sind
unberührt; bei ihrem nächsten Request holt die API die neue
Liste ab.

### Einen Admin degradieren

Erlaubt, außer sie sind der letzte Admin. Das System blockiert
die Änderung mit einem 400-Fehler, wenn du es versuchst;
befördere zuerst einen anderen Benutzer.

## Audit-Spur

Jede Rollen- und Section-List-Änderung schreibt einen Eintrag in
das [Audit-Log](features/audit) mit den Vor/Nach-Werten. Du
kannst die Audit-Seite auf `entity: user` filtern, um alle
Rollenwechsel in deiner Org zu sehen.

## Wo es weitergeht

- **[Tenancy & Datenisolation](concepts/tenancy)** — wie der
  Org-Scope auf der Datenbankebene funktioniert.
- **[Settings → Users-Seite](features/settings-users)** —
  UI-Referenz für die Verwaltung des Teams.
- **[Audit-Log](features/audit)** — überprüfe jede Mutation in
  deiner Org, einschließlich Rollenwechsel.
