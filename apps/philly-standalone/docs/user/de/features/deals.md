---
slug: features/deals
lang: de
title: Deals
summary: Die Deals-Seite — Kanban-Board + Listenansicht, Drag-and-Drop-Stage-Bewegungen, Filter, Wertsummen, und wie Deals an Kontakte und Projekte verknüpfen.
tags: [features, deals, pipeline, kanban]
related: [onboarding/first-deal, features/kanban, features/automations, features/settings-pipelines]
updated: 2026-04-25
---

# Deals

Ein **Deal** ist eine Gelegenheit in Bewegung.
Immobilientransaktionen, Philanthropie-Geschenke in
Verhandlung, Hospitality-Buchungen, die vertraglich abgeschlossen
werden — alle teilen dasselbe Modell. Jeder Deal lebt in genau
einer **Pipeline** in einer **Stage** zur Zeit.

## Zwei Ansichten

`/deals` wechselt zwischen zwei Layouts über einen Button in der
Toolbar (bleibt in URL):

- **Kanban** — Drag-and-Drop-Board; eine Spalte pro
  Pipeline-Stage. Kartenstapel-Höhe = Stage-Anzahl. Am besten,
  um Deals auf einen Blick voranzubringen.
- **Liste** — Tabellenansicht mit sortierbaren Spalten (Titel,
  Stage, Wert, Owner, Kontakt, aktualisiert). Am besten für
  Bulk-Operationen, Exports und Filter.

## Toolbar

- **Pipeline-Picker** — wechsle zwischen Pipelines, wenn deine
  Org mehr als eine hat. Jede Pipeline hat ihre eigene
  Stage-Sammlung.
- **Status-Filter** — open / won / lost / all
- **Suche** — matcht Deal-Titel
- **+ New deal** — öffnet das Create-Modal (Admins + Manager)

Die Deals-Seite zeigt auch drei KPIs: gesamter offener Wert,
gewichteter Forecast, durchschnittliche Tage-in-Stage.

## Einen Deal erstellen

Pflicht: Titel, Pipeline, Stage. Optional: Wert, Owner, Kontakt,
Projekt. Submit erstellt den Deal in der gewählten Stage; die
Kanban-Karte erscheint sofort.

Wenn die Pipeline, die du wählst, keine Stages hat (selten,
frische Org), blockiert das Formular Submit mit "no stages —
füge Stages in `/settings/pipelines` zuerst hinzu".

## Einen Deal zwischen Stages bewegen

**In Kanban-Ansicht**: ziehe die Karte in eine neue Spalte.

- Optimistisches Update: Karte bewegt sich sofort.
- PATCH passiert im Hintergrund.
- Bei Fehler springt die Karte zurück und ein Toast zeigt den
  Fehler.
- Ein `Deal verschoben`-Toast bestätigt Erfolg; ein
  Audit-Log-Eintrag erfasst Vor/Nach-Stage-Werte.

**In Listenansicht oder Detailseite**: ändere die Stage im
Dropdown, save. Nicht-optimistisch; Button zeigt einen Spinner,
bis er zurückkommt.

Jede Stage-Änderung schreibt Audit + kann Automatisierungen
triggern (siehe [Automatisierungen](features/automations)).

## Die Deal-Detailseite

`/deals/[id]` zeigt:

- **Header-Karte** — Titel (inline-bearbeitbar),
  Stage-Picker, Status, Wert, Owner-Avatar
- **Inline-bearbeitbare Felder** — Titel, Wert, erwarteter
  Closing-Datum, Deal-Type — klicke zum Bearbeiten, Tab/Esc
  zum Speichern/Abbrechen
- **Sidebar** — verknüpfter Kontakt, verknüpftes Projekt, Tags
- **Activity-Feed** — jedes Event auf diesem Deal:
  Stage-Wechsel, Notizen, E-Mails, Anrufe
- **Files-Tab** — Dokumente, die dem Deal angehängt sind
- **E-Signatures-Tab** — Signaturanfragen + ihre Status

## Einen Deal mit einem Kontakt verknüpfen

Zwei Wege:

1. Beim Erstellen — wähle einen Kontakt im Modal.
2. Nach dem Erstellen — öffne den Deal → Sidebar → "Link
   contact" → wähle aus deiner Kontaktliste.

Einmal verknüpft:

- Der "Deals"-Tab des Kontakts enthält diesen Deal
- Activity fließt in beide Richtungen — eine Notiz auf dem
  Kontakt erscheint im Deal-Feed
- E-Mails an/von der E-Mail-Adresse des Kontakts werden
  automatisch an den Deal angehängt

## Status: open / won / lost

Status ist **getrennt** von Stage. Stage ist die Position in
der Pipeline; Status ist die Disposition.

- **Open** — Deal ist aktiv, in irgendeiner Stage. Standard
  für neue Deals.
- **Won** — Deal positiv abgeschlossen. Oft mit der finalen
  Pipeline-Stage gepaart.
- **Lost** — Deal negativ abgeschlossen. Optional mit einem
  "Lost-Reason" in den Notizen für Analytics.

Filter nach Status ist in der Toolbar; das Kanban zeigt offene
Deals standardmäßig und dimmt won/lost.

## Einen Deal löschen

`/deals/[id]` → Menü → Delete. Bestätigungsprompt; nur Admin
oder Manager.

Hard-Delete; es gibt keine Soft-Delete-Spalte auf `Deal`.
Audit-Log bewahrt den Eintrag (FK-Constraint ist `RESTRICT`,
also behält die Audit-Zeile die Deal-ID, aber der Deal selbst
ist weg). Verwende dies sparsam — für Tests oder
Hart-Datenkorrektur; für "wir haben den Deal nicht bekommen"
verwende Status = lost.

## Wo es weitergeht

- **[Kanban-Board](features/kanban)** — Drag-Drop-UX-Details
- **[Pipelines](features/settings-pipelines)** —
  Admin-Konfiguration von Stages
- **[Automatisierungen](features/automations)** —
  automatisiere basierend auf Stage-Änderungen
- **[Kontakte](features/contacts)** — verknüpfe Deals mit
  Personen
