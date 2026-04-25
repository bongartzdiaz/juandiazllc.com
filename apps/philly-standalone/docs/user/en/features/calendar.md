---
slug: features/calendar
lang: en
title: Calendar
summary: Event scheduling, attendees, recurrence, Google/Microsoft Calendar two-way sync, automations, day/week/month views.
tags: [features, calendar, scheduling]
related: [features/integrations, features/automations, features/contacts]
updated: 2026-04-25
---

# Calendar

`/calendar` is the org-wide calendar. Day / week / month views;
events can be linked to contacts, deals, projects. If you've
connected a Google or Microsoft account in `/integrations`, your
external calendar two-way syncs.

## Creating an event

Click any time slot, or **+ New event** in the topbar. Fields:

- **Title** (required)
- **Start / end** — defaults to a 30-minute slot from where you
  clicked
- **Attendees** — pick from your team + linked contacts
- **Linked entity** (optional) — a deal, contact, or project
- **Location** (free-text or a link)
- **Recurrence** — none / daily / weekly / monthly with end date

Save. The event appears on the calendar; if Google sync is on,
it propagates to the connected calendar within a few seconds.

## Two-way sync

The Google / Microsoft connectors push changes both ways:

- Local edit → upstream within ~1 second
- Upstream edit → local on next pull (every 5 minutes by default)
- Conflict resolution: last-write-wins; the audit log captures
  both versions when a conflict is detected

Disconnect the integration in `/integrations` to stop the sync;
existing events remain.

## Linking events to records

Pick a contact / deal / project in the form. The link surfaces
in two places:

- The record's "Activity" feed gets a calendar-event entry
- The event has a sidebar widget on the detail page showing
  the linked record

Useful for "what meetings happened on this deal?" — open the
deal, scroll the activity feed.

## Automations

Two common rules driven by calendar events:

- **schedule_followup** action — automation creates a calendar
  event N days after a stage change
- **calendar.event_starting_soon** trigger — fire a
  notification or task 15 minutes before an event begins

Configure in `/automations`.

## Permissions

- View: any user can see events in their org's calendar
- Create / edit / delete: admin + manager
- Attendees can RSVP to events without edit rights

## Where to go next

- **[Integrations](features/integrations)** — connect Google /
  Microsoft for two-way sync
- **[Automations](features/automations)** — calendar-driven
  rules
- **[Timeline](features/timeline)** — Gantt view across projects
