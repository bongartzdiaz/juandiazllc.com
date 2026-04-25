---
slug: onboarding/invite-team
lang: de
title: Lade dein Team ein
summary: Wie ein Admin Teamkollegen-Konten in /settings/users vorab erstellt, damit Eingeladene bei der ersten Anmeldung in der richtigen Org landen.
tags: [onboarding, team, users, invitations, admin]
related: [onboarding/welcome, onboarding/create-organization, concepts/roles, features/settings-users]
updated: 2026-04-25
---

# Lade dein Team ein

Sobald deine Organisation existiert, ist der nächste Schritt,
deine Teamkollegen reinzubringen. Das CRM verwendet ein
**Admin-led-Invite**-Modell: Admins erstellen Teamkollegen-Konten
vorab, dann meldet sich der Eingeladene mit eigenen
Anmeldedaten an und landet direkt in deiner Org.

## Wo du das machst

`/settings/users` — die Team-Management-Seite, nur für Admins.
Nicht-Admins sehen die Teamliste, können aber nichts ändern.

## Der Flow

1. Klicke **+ New user** oben auf `/settings/users`.
2. Fülle aus:
   - **E-Mail** — die Adresse, die der Eingeladene zum Anmelden
     verwendet. Muss in ganz Philly eindeutig sein; eine Person
     kann nur einer Organisation angehören.
   - **Anzeigename** — optional; standardmäßig der lokale Teil
     der E-Mail.
   - **Rolle** — `admin`, `manager` oder `viewer`. Siehe
     [Rollen & Rechte](concepts/roles).
   - **Dashboard-Sektionen** — lass den Standard (volle Zugriff)
     für die meisten Teamkollegen, oder wähle bestimmte Sektionen
     zum Einschränken aus.
3. Absenden. Zwei Dinge passieren:
   - Eine Zeile wird in `User` mit der E-Mail, Rolle, Sektionen und
     deiner `organizationId` erstellt — also gehört der Eingeladene
     ab dem Moment der Erstellung zu deiner Org.
   - Eine Supabase-Einladungsmail geht vom Auth-System raus.
4. Der Eingeladene klickt auf den E-Mail-Link, setzt ein Passwort
   (und 2FA, wenn du das verlangst), und meldet sich an. Das
   System findet ihre vorab erstellte Philly-Zeile per E-Mail und
   landet sie auf dem Dashboard innerhalb deiner Org.

Die vorab erstellte Zeile ist der Trick: ohne sie geht eine
brandneue Anmeldung zu `/onboarding` und erstellt einen neuen
Tenant.

## Was, wenn der Eingeladene schon ein Konto hat?

Wenn sie eine User-Zeile in *irgendeiner* Organisation haben
(deiner oder einer anderen), gibt das Erstelle-Benutzer-Formular
`409 — A user with that email already exists` zurück und weigert
sich, sie still zu verschieben. Das schützt vor versehentlichen
Cross-Org-Übertragungen.

Um jemanden zu verschieben, muss der empfangende Admin die neue
E-Mail einladen und der ursprüngliche Admin die alte Zeile
entfernen. Es gibt keine Auto-Merge; Datenklarheit gewinnt vor
Bequemlichkeit.

## Was, wenn ich die Rolle falsch wähle?

Du kannst die Rolle eines Teamkollegen jederzeit von derselben
Seite aus ändern. Änderungen werden audit-logged. Die einzige
Schranke: das System weigert sich, den **letzten** Admin in
deiner Org zu degradieren — befördere zuerst einen Nachfolger,
sonst sperrst du dich selbst aus den Admin-Funktionen aus.

## Was, wenn die Einladungsmail nicht ankommt?

Die Supabase-Einladung ist Best-Effort. Wenn sie fehlschlägt
oder im Spam landet, wurde die User-Zeile trotzdem erstellt —
der Eingeladene kann:

1. Die Brand-Login-Seite besuchen und einen Magic-Link an dieselbe
   E-Mail anfordern.
2. Sobald sie sich anmelden, findet das System ihre Zeile und
   landet sie in deiner Org.

Versende die Supabase-Einladung erneut über dasselbe
`/settings/users`-Formular, indem du dieselbe E-Mail einlädst —
die bestehende Zeile gibt den Konfliktfehler zurück, aber du
kannst auch ihr Supabase-Passwort vom Auth-Dashboard aus
zurücksetzen.

## Per-Sektion-Zugriff (fortgeschritten)

Der Standard `dashboardSections: null` bedeutet voller Zugriff.
Für feinere Kontrolle setze das Feld auf eine bestimmte Liste
von Section-Slugs — z.B. `["dashboard", "contacts", "deals"]` —
und die Sidebar zeigt nur diese, *und* jede API-Route unter den
nicht-aufgeführten Sektionen gibt `403` zurück.

Slugs entsprechen `lib/philly/sections.ts`. Admins erhalten immer
jede Sektion ungeachtet dieser Liste (sie können sich nicht
versehentlich aussperren).

## Zugriff entfernen

Aktuell löscht "Remove user" die User-Zeile. Das kaskadiert:
Audit-Log-Einträge, die der Benutzer geschrieben hat, bleiben
(sie verweisen auf die User-ID; der FK ist Restrict-on-Delete in
der AuditLog-Tabelle, um die forensische Geschichte zu
bewahren), aber der Benutzer kann sich nicht mehr anmelden.

Verwende dies für hartes Offboarding. Für "sie sind beurlaubt,
kommen aber zurück": ändere ihre Rolle auf `viewer` und leere
`dashboardSections` auf nichts — sie behalten den Sitz, können
aber nichts tun.

## Wo es weitergeht

- **[Rollen & Rechte](concepts/roles)** — die volle Aufschlüsselung
  dessen, was jede Rolle tun kann.
- **[Settings → Users-Seite](features/settings-users)** —
  UI-Referenz für die Seite selbst.
