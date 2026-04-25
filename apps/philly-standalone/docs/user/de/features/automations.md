---
slug: features/automations
lang: de
title: Automatisierungen
summary: Trigger-basierte Regeln, die bei Entity-Events feuern — Aufgaben erstellen, E-Mails versenden, Webhooks posten, Felder aktualisieren. Nur-Admin-Konfiguration.
tags: [features, automations, rules, admin]
related: [features/deals, features/settings-webhooks, features/integrations]
updated: 2026-04-25
---

# Automatisierungen

Trigger-basierte Regeln. Wenn etwas im CRM passiert (ein Deal
wechselt die Stage, ein Kontakt wird erstellt, ein Projekt
erreicht einen Meilenstein), evaluiert die
Automatisierungs-Engine jede aktivierte Regel und führt die
passenden Aktionen aus.

`/automations` — nur Admin. Manager + Viewer sehen nichts.

## Die Regelform

Jede Regel ist `Trigger → Bedingungen → Aktionen`:

- **Trigger** — was die Regel auslöst. Beispiele:
  - `deal.stage_changed` — feuert, wann immer sich die Stage eines Deals ändert
  - `deal.value_threshold` — feuert, wenn Wert eine Schwelle überschreitet
  - `contact.created` — feuert bei neuem Kontakt
  - `contact.tagged` — feuert bei Tag-Hinzufügen/Entfernen
  - `project.milestone_completed`
  - `task.overdue`
  - `email.received` — wenn Gmail-Sync eine passende Nachricht aufnimmt
- **Bedingungen** — optionale Filter. AND-kombiniert. Beispiele:
  - `deal.pipeline = "Major Gifts"`
  - `deal.value >= 10000`
  - `contact.type = "donor"`
- **Aktionen** — was zu tun. Eine oder mehrere, in Reihenfolge ausgeführt:
  - `create_task` — fügt eine Activity vom Typ "task" zu einem Datensatz hinzu
  - `send_email` — sendet von einem verbundenen E-Mail-Konto
  - `post_webhook` — POSTet an einen registrierten Webhook
  - `update_field` — patcht ein Feld auf dem auslösenden Datensatz
  - `notify_user` — erstellt eine In-App-Benachrichtigung
  - `tag_contact` — fügt einen Tag hinzu / entfernt einen

## Eine Regel bauen

`/automations` → **+ New rule**. Modal öffnet sich mit:

1. **Name** — Freitext; erscheint im Audit-Log.
2. **Trigger** — wähle aus Dropdown.
3. **Bedingungen** — standardmäßig leer. Klicke "+ Condition",
   um Field-Value-Paare hinzuzufügen. Field-Optionen sind auf
   die Entity des Triggers gescoped.
4. **Aktionen** — mindestens eine Pflicht. Jede Aktion hat ihr
   eigenes Formular (z.B. send_email fragt nach From-Account,
   To-Template, Subject-Template, Body-Template).
5. **Aktiviert** — Toggle. Neue Regeln sind standardmäßig
   aktiviert.

Save. Die Regel erscheint in der Liste; die Engine nimmt sie
beim nächsten passenden Event auf.

## Ausführungsverlauf

Jede Regel-Zeile zeigt:

- **Total runs** — Lebenszeit
- **Last run** — Zeitstempel
- **Status** — Ergebnis des letzten Runs (ok / partial / failed)

Klicke auf eine Regel, um ihren Run-Log auszuklappen:
chronologische Liste jedes Feuerns, mit der ID des auslösenden
Datensatzes, Bedingungsergebnissen und Aktionsausgängen.

Die Engine wiederholt fehlgeschlagene Aktionen bis zu 3-mal mit
Exponential-Backoff. Nach 3 Fehlern wird die Aktion dauerhaft
als fehlgeschlagen markiert und die Regel fährt mit
nachfolgenden Aktionen fort.

## Templates

Aktionsfelder wie E-Mail-Subject + Body unterstützen
Handlebars-Stil-Templates mit den Feldern des auslösenden
Datensatzes:

```
Subject: Deal {{deal.title}} verschoben nach {{deal.stage}}
Body:    Hi {{deal.owner.name}}, der Deal "{{deal.title}}" ist
         gerade nach Stage {{deal.stage}} verschoben worden.
         Verknüpfter Kontakt: {{deal.contact.name}}.
```

Verfügbare Variablen hängen vom Trigger ab. Der
Variable-Picker des Formulars (kleines `{}`-Icon neben dem
Feld) listet, was verfügbar ist.

## Häufige Starter-Regeln

Drei Regeln, die fast jede Org will:

1. **Stale-Deal-Nudge** — Trigger `deal.no_update_in`, Tage = 14,
   Aktion `notify_user` an den Deal-Owner.
2. **High-Value-Slack-Ping** — Trigger `deal.value_threshold`,
   Schwelle = €10.000, Aktion `post_webhook` an einen Slack
   Incoming Webhook.
3. **New-Donor-Welcome** — Trigger `contact.created`,
   Bedingung `contact.type = "donor"`, Aktion `send_email`
   mit einem Willkommens-Template.

## Eine Regel deaktivieren

Toggle den "Enabled"-Switch. Die Regel bleibt in der Liste,
aber die Engine überspringt sie. Vergangene Runs werden
beibehalten.

## Audit-Spur

Jedes Erstellen, Bearbeiten, Aktivieren/Deaktivieren und
Löschen einer Regel schreibt einen Audit-Log-Eintrag. Jedes
Regel-Feuern schreibt auch eine `automationLog`-Zeile, die in
der Ausführungshistorie der Regel sichtbar ist.

## Limits

- Max 50 aktivierte Regeln pro Organisation (weiches Cap;
  in Config erhöhbar bei Bedarf).
- Jede Regel ist auf 100 Runs pro Stunde pro Organisation
  rate-limited. Darüber hinaus werden Runs verworfen, um
  Runaway-Schleifen zu verhindern (z.B. eine Automatisierung,
  die sich selbst triggert).
- Aktionsketten sind auf 10 Aktionen pro Regel begrenzt.

## Wo es weitergeht

- **[Deals](features/deals)** — die häufigste
  Automatisierungs-Triggerquelle.
- **[Webhooks](features/settings-webhooks)** — Outbound-
  Webhook-Konfiguration für die `post_webhook`-Aktion.
- **[Integrationen](features/integrations)** — verbinde
  E-Mail-Konten, sodass `send_email`-Aktionen einen
  Absender haben.
