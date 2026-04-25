---
slug: onboarding/invite-team
lang: es
title: Invita a tu equipo
summary: Cómo un admin pre-crea cuentas de compañeros en /settings/users para que los invitados aterricen en la org correcta en su primer inicio de sesión.
tags: [onboarding, team, users, invitations, admin]
related: [onboarding/welcome, onboarding/create-organization, concepts/roles, features/settings-users]
updated: 2026-04-25
---

# Invita a tu equipo

Una vez que tu organización existe, el siguiente paso es traer a
tus compañeros. El CRM utiliza un modelo de **invitación dirigida
por admin**: los admins pre-crean cuentas de compañeros, luego el
invitado inicia sesión con sus propias credenciales y aterriza
directamente en tu org.

## Dónde hacerlo

`/settings/users` — la página de gestión de equipo, solo para
admins. Los no-admins pueden ver la lista del equipo pero no
pueden cambiar nada.

## El flujo

1. Haz clic en **+ New user** en la parte superior de
   `/settings/users`.
2. Completa:
   - **Email** — la dirección que el invitado usa para iniciar
     sesión. Debe ser único en todo Philly; una persona solo
     puede pertenecer a una organización.
   - **Nombre para mostrar** — opcional; por defecto la parte
     local del email.
   - **Rol** — `admin`, `manager` o `viewer`. Ver
     [Roles y permisos](concepts/roles).
   - **Secciones del dashboard** — deja por defecto (acceso
     completo) para la mayoría de los compañeros, o elige
     secciones específicas a las que restringir.
3. Envía. Suceden dos cosas:
   - Se crea una fila en `User` con el email, rol, secciones y
     tu `organizationId` — así que el invitado pertenece a tu
     org desde el momento de la creación.
   - Sale un email de invitación de Supabase desde el sistema de
     auth.
4. El invitado hace clic en el enlace del email, establece una
   contraseña (y 2FA si lo requieres), e inicia sesión. El
   sistema encuentra su fila Philly pre-creada por email y los
   aterriza en el dashboard dentro de tu org.

La fila pre-creada es el truco: sin ella, un nuevo inicio de
sesión va a `/onboarding` y crea un nuevo tenant.

## ¿Qué si el invitado ya tiene una cuenta?

Si tienen una fila de usuario en *cualquier* organización (la
tuya u otra), el formulario de creación de usuario devuelve
`409 — A user with that email already exists` y se niega a
moverlos silenciosamente. Esto protege contra transferencias
cross-org accidentales.

Para mover a alguien, el admin receptor debe invitar el nuevo
email y el admin original debe eliminar la fila antigua. No hay
auto-merge; la claridad de datos gana sobre la conveniencia.

## ¿Qué si me equivoco con el rol?

Puedes cambiar el rol de un compañero en cualquier momento desde
la misma página. Las ediciones se auditan. La única protección:
el sistema se niega a degradar al **último** admin en tu org —
promueve un sucesor primero, o te quedarías bloqueado fuera de
las funciones de admin.

## ¿Qué si el email de invitación no llega?

La invitación de Supabase es best-effort. Si falla o queda
atrapada en spam, la fila de usuario se creó de todos modos — el
invitado puede:

1. Visitar la página de inicio de sesión de marca y solicitar un
   enlace mágico al mismo email.
2. Una vez que inicien sesión, el sistema todavía encuentra su
   fila y los aterriza en tu org.

Reenvía la invitación de Supabase desde el mismo formulario
`/settings/users` intentando invitar el mismo email — la fila
existente devuelve el error de conflicto, pero también puedes
restablecer su contraseña de Supabase desde el panel de auth.

## Acceso por sección (avanzado)

El valor por defecto `dashboardSections: null` significa acceso
completo. Para un control más fino, establece el campo a una
lista específica de section slugs — por ejemplo
`["dashboard", "contacts", "deals"]` — y la sidebar solo mostrará
esas, *y* cada ruta API bajo las secciones no listadas devolverá
`403`.

Los slugs coinciden con `lib/philly/sections.ts`. Los admins
siempre obtienen cada sección sin importar esta lista (no pueden
bloquearse a sí mismos por accidente).

## Eliminando el acceso

Actualmente, "remove user" elimina la fila del usuario. Eso
cascadea: las entradas del audit log que el usuario escribió
permanecen (referencian el ID del usuario; el FK es
restrict-on-delete en la tabla AuditLog para preservar la
historia forense), pero el usuario ya no puede iniciar sesión.

Usa esto para offboarding duro. Para "están de baja pero
volverán", cambia su rol a `viewer` y limpia `dashboardSections`
a ninguna — mantienen el asiento pero no pueden hacer nada.

## A dónde ir después

- **[Roles y permisos](concepts/roles)** — el desglose completo
  de lo que cada rol puede hacer.
- **[Página Settings → Users](features/settings-users)** —
  referencia de UI para la página en sí.
