---
slug: onboarding/first-deal
lang: de
title: Füge deinen ersten Deal hinzu
summary: Wie man einen Deal erstellt, ihn an einen Kontakt koppelt und durch Pipeline-Stages auf der Kanban- oder Listenansicht bewegt.
tags: [onboarding, deals, pipeline, kanban, getting-started]
related: [features/deals, features/kanban, onboarding/first-contact, features/automations]
updated: 2026-04-25
---

# Füge deinen ersten Deal hinzu

Ein **Deal** ist eine Gelegenheit in Bewegung — eine
Immobilientransaktion, eine Spende in Verhandlung, eine
Event-Buchung. Deals gehören zu einer **Pipeline** und
durchlaufen Pipeline-**Stages**.

## Wo du das machst

`/deals` → klicke **+ New deal** in der Topbar.

## Felder

- **Titel** (Pflicht) — wie du es im Gespräch nennen würdest.
  Z.B. "Acme partnership Q3" oder "1234 Elm St — Verkauf".
- **Pipeline** (Pflicht) — wähle, in welcher Pipeline dieser
  Deal lebt. Neue Orgs bekommen eine Standard-Pipeline; Admins
  können mehr in `/settings/pipelines` erstellen.
- **Stage** (Pflicht) — die aktuelle Position. Stages sind
  pipeline-spezifisch. Die Standard-Neue-Deal-Stage ist die
  linkeste ("Lead", "Inquiry", usw.).
- **Wert** (optional) — Geldwert in Cents. Wird für
  Pipeline-KPIs verwendet.
- **Owner** (optional) — welcher Benutzer ist der Deal-Owner.
  Standard ist du.
- **Kontakt** (optional) — verknüpfe den Deal mit einem
  bestehenden Kontakt. Empfohlen; viele Automatisierungen
  brauchen diese Verknüpfung.
- **Projekt** (optional) — verknüpfe mit einem Projekt, falls
  relevant.

Absenden und der Deal landet auf dem Kanban-Board in der
gewählten Stage.

## Zwei Ansichten: Kanban und Liste

Die Deals-Seite wechselt zwischen:

- **Kanban** — Drag-and-Drop-Board, eine Spalte pro
  Pipeline-Stage. Am besten zum Vorwärtsbewegen von Deals.
- **Liste** — Tabellenansicht mit voll filterbaren Spalten. Am
  besten für Bulk-Operationen, Exports oder Sortierung nach
  Wert.

Der Wechsel bleibt in der URL erhalten.

## Einen Deal zwischen Stages bewegen

In der Kanban-Ansicht: ziehe die Karte in eine neue Spalte. Der
PATCH erfolgt optimistisch — die Karte bewegt sich sofort, und
springt mit einem Toast zurück, wenn die API fehlschlägt.

In der Listen- oder Detailansicht: öffne den Deal, ändere die
Stage im Dropdown, save. Der Patch ist nicht-optimistisch; der
Button zeigt einen Spinner, bis er zurückkommt.

Jede Stage-Änderung schreibt einen Audit-Log-Eintrag mit den
Vor/Nach-Stage-Werten und triggert alle passenden
Automatisierungsregeln (siehe
[Automatisierungen](features/automations)).

## Einen Deal mit einem Kontakt verknüpfen

Wenn du das Kontakt-Feld bei der Erstellung übersprungen hast,
kannst du später von der Deal-Detailseite → "Related"-Sidebar
→ "Link contact" verknüpfen.

Einmal verknüpft:

- Der "Deals"-Tab des Kontakts zeigt diesen Deal
- Notizen, die du auf dem Kontakt schreibst, erscheinen im
  Activity-Feed des Deals
- E-Mail-Korrespondenz mit der E-Mail-Adresse des Kontakts
  wird automatisch an beide Datensätze angehängt

## Häufige Automatisierungen zum Einrichten

`/automations` (nur Admin) lässt dich `Trigger → Aktion`-Regeln
definieren. Häufige für Deals:

- **Stage = closed-won → erstelle eine Follow-up-Aufgabe in 30
  Tagen** — treibt Renewal-Gespräche an
- **Stage = stale (kein Update in 14 Tagen) → E-Mail an den
  Owner** — verhindert Deal-Verfall
- **Wert > €X → benachrichtige Slack** — hält die Führung
  informiert

Siehe [Automatisierungen](features/automations) für den vollen
Builder.

## Was ist mit Pipelines?

Eine Pipeline ist eine Folge von Stages — der Funnel, durch den
du Deals schiebst. Die Standard-Pipeline für eine neue Org hat
eine generische 5-Stage-Form; Admins passen pro Branche in
`/settings/pipelines` an:

- **Immobilien**: Lead → Showing → Offer → Under contract → Closed
- **Philanthropie**: Prospect → Engaged → Cultivated → Solicited → Stewarded
- **Hospitality**: Inquiry → Hold → Confirmed → Checked-in → Checked-out

Du kannst mehrere Pipelines parallel laufen lassen. Jeder Deal
lebt in genau einer Pipeline zur Zeit, aber Admins können einen
Deal über Pipelines bewegen, falls Umstände sich ändern.

## Wo es weitergeht

- **[Deals-Seitenreferenz](features/deals)** — die volle
  Feature-Aufschlüsselung inklusive Filter, Exports und
  Bulk-Operationen.
- **[Kanban-Board](features/kanban)** — Drag-and-Drop-UX-Muster.
- **[Pipelines & Stages](features/settings-pipelines)** —
  Admin-Konfiguration.
- **[Automatisierungen](features/automations)** —
  Automatisiere basierend auf Deal-Events.
