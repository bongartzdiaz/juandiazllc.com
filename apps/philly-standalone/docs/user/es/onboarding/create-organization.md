---
slug: onboarding/create-organization
lang: es
title: Crea tu organización
summary: Cómo un inicio de sesión nuevo arranca un tenant fresco en /onboarding y aterriza como su primer admin.
tags: [onboarding, organization, admin, tenancy]
related: [onboarding/welcome, onboarding/invite-team, concepts/tenancy, concepts/roles]
updated: 2026-04-25
---

# Crea tu organización

La primera vez que inicias sesión en Philly con un email nuevo, el
CRM te envía a `/onboarding`. Desde ahí creas tu propia
organización — y te conviertes en su admin.

## Por qué existe esto

Cada organización en Philly es un tenant. Cada registro —
contactos, deals, proyectos, audit logs — está delimitado a una
org y nunca se filtra a otra. El paso de bootstrap previene la
situación en la que dos empresas no relacionadas se registran y
accidentalmente comparten datos.

Antes de que existiera este flujo, el CRM auto-asignaba a cada
nuevo usuario en una única organización por defecto compartida.
Eso era un bug de multi-tenancy; el paso de onboarding es la
corrección.

## El flujo

1. Inicia sesión en el sitio de marca con una cuenta de email
   gestionada por Supabase.
2. El layout del dashboard llama a `GET /api/onboarding/status`. Si
   no tienes una fila de usuario Philly aún, eres redirigido a
   `/onboarding`.
3. En `/onboarding`, completa:
   - **Nombre de la organización** — obligatorio; 2–120 caracteres.
     Este es el nombre semi-público mostrado en la topbar.
   - **Nombre para mostrar** — opcional; cómo los compañeros e
     informes se refieren a ti. Por defecto es la parte de tu
     email antes de la `@`.
4. Envía. El servidor crea una fila `Organization` + una fila
   `User` (tú, con `role: admin`) en una transacción de base de
   datos. Si una falla, ninguna se commitea — nunca terminarás
   medio creado.
5. Eres redirigido al dashboard. Tu tenant está activo.

## Lo que pasa automáticamente

- Un slug único se deriva del nombre de la organización. Si
  escribes `Acme Inc.`, el slug se convierte en `acme-inc`. Si
  ese slug está tomado, el sistema añade `-2`, `-3`, etc. hasta
  encontrar uno libre.
- Tu primera fila de usuario se crea con `role: admin` y acceso
  completo al dashboard (`dashboardSections: null`, lo que
  significa cada sección).
- Se escribe una entrada de audit log — `entity: organization`,
  `action: create` — contigo como actor. Esta es la fila
  génesis en el audit log encadenado por hash de tu tenant.

## ¿Qué pasa si refresco / envío dos veces?

Idempotente. Si el servidor ve que tu email ya tiene una fila de
usuario Philly, devuelve `409 ALREADY_ONBOARDED` y se niega a
crear un segundo tenant. No puedes duplicarte accidentalmente.

## ¿Qué si mi organización ya está en Philly?

Si un admin en una organización existente te invita (vía
`/settings/users` → New user), pre-crea tu fila de usuario Philly.
Cuando luego inicias sesión, el sistema encuentra tu fila y te
aterriza en su organización — saltas `/onboarding` por completo.

Así que si esperabas una invitación pero terminaste en
`/onboarding`, el admin probablemente no te ha invitado todavía.
Cierra sesión y pídele que te invite, luego vuelve a iniciar
sesión.

## Permisos como admin de bootstrap

- Todas las secciones del dashboard
- Invitar / editar / eliminar usuarios en tu org
- Procesar solicitudes de interesados (export, borrado) para contactos
- Configurar integraciones, automatizaciones, webhooks, claves API
- Ver y verificar el audit log

Puedes traspasar el rol admin más tarde — ver
[Roles y permisos](concepts/roles) — pero el sistema bloquea la
eliminación del *último* admin en la org. Promueve un sucesor
primero.

## A dónde ir después

- **[Invita a tu equipo](onboarding/invite-team)** — trae a los
  compañeros a tu org con los roles correctos.
- **[Roles y permisos](concepts/roles)** — qué pueden hacer admin
  / manager / viewer cada uno.
- **[Elige tu sector](onboarding/pick-industry)** — elige
  filantropía / inmobiliaria / hospitality para que el dashboard
  se adapte.
