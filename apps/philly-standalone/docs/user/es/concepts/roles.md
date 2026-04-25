---
slug: concepts/roles
lang: es
title: Roles y permisos
summary: Qué pueden hacer admin, manager y viewer cada uno, y cómo la lista permitida por sección reduce el acceso aún más.
tags: [concepts, roles, permissions, security, admin]
related: [onboarding/invite-team, concepts/tenancy, features/settings-users]
updated: 2026-04-25
---

# Roles y permisos

Philly tiene tres roles. Dentro de cada rol, una **lista permitida
por sección** opcional restringe el acceso aún más. Las dos capas
se componen: un usuario puede hacer algo solo si su rol lo permite
Y la sección está en su lista permitida.

## Los tres roles

### Admin

Puede hacer todo en su organización:

- Invitar, editar y eliminar usuarios
- Cambiar el rol de cualquier otro (excepto que no pueden
  degradar al último admin)
- Configurar integraciones, automatizaciones, webhooks y claves API
- Procesar solicitudes de interesados (export, borrado) en
  contactos
- Ver y verificar el audit log
- Establecer el modo de sector para la org
- Acceder a cada sección del dashboard sin importar la lista
  permitida

Los admins existen para administrar. La mayoría de los operadores
no necesitan ser uno.

### Manager

Puede mutar los datos del día a día de su organización pero no la
organización en sí:

- Crear, editar y eliminar contactos, deals, proyectos,
  propiedades, reservas, eventos de calendario
- Enviar emails y SMS
- Ejecutar herramientas de IA (command-bar, scoring, contact
  attributes)
- No puede invitar usuarios, no puede cambiar roles, no puede
  acceder a páginas de settings, no puede configurar integraciones
  o automatizaciones

La mayoría de los usuarios del CRM son managers.

### Viewer

Solo-lectura en las secciones que su lista permitida incluye:

- Navegar contactos, deals, proyectos, etc.
- Ver dashboards e informes
- No puede crear, editar o eliminar nada
- No puede enviar nada (sin email, sin SMS, sin mutaciones de IA)

Usa esto para miembros del consejo, auditores o dashboards
ejecutivos de solo-lectura.

## La lista permitida por sección

Cada usuario tiene un campo `dashboardSections`. Puede ser:

- **`null`** — acceso completo. El usuario ve cada sección que
  su rol permite. Los nuevos usuarios están aquí por defecto.
- **Una lista de section slugs** — lista permitida estricta. El
  usuario solo ve las secciones en la lista. Los items de
  sidebar fuera de la lista están ocultos, y cualquier ruta API
  bajo ellas devuelve 403.

Ejemplo: un viewer con
`dashboardSections: ["dashboard", "contacts", "reports"]` ve solo
esas tres secciones — sin deals, sin kanban, sin settings.

**Los admins están exentos.** Un admin con una lista permitida
restringida todavía obtiene cada sección. Esto previene que un
admin se bloquee accidentalmente fuera de las funciones de admin.

Los slugs están definidos en `lib/philly/sections.ts`. Comunes:
`dashboard`, `contacts`, `deals`, `projects`, `kanban`, `calendar`,
`timeline`, `email`, `sms`, `ai`, `settings`, `audit`, `notifications`.

## Dónde suceden los chequeos de rol

Cada ruta API bajo `/api/` llama a uno de tres guards en la parte
superior:

- `requireScope()` — debe estar autenticado y tener un usuario
  Philly. Devuelve el auth scope (userId, organizationId, role,
  lista permitida).
- `requireRole(['admin', 'manager'])` — además requiere que el
  rol esté en la lista permitida. Devuelve 403 de lo contrario.
- `requireSection('contacts', ['admin', 'manager'])` — protege
  por section slug y (opcionalmente) rol. El predeterminado para
  la mayoría de las rutas de mutación del CRM.

Si construyes nuevas rutas API, usa una de estas. El
[script de auditoría de aislamiento de tenant](features/audit-tenancy)
verifica en cada commit que ninguna ruta se cuele sin un guard.

## Cambios de rol comunes

### Promover un manager a admin

`/settings/users` → haz clic en el usuario → cambia rol → guarda.
Audit-logged.

### Restringir un manager a secciones específicas

`/settings/users` → haz clic en el usuario → expande "Dashboard
sections" → desmarca las secciones que no deberían ver →
guarda. Sus sesiones existentes no se ven afectadas; en su
próxima petición la API recoge la nueva lista.

### Degradar un admin

Permitido a menos que sean el último admin. El sistema bloquea el
cambio con un error 400 si lo intentas; promueve a otro usuario
primero.

## Pista de auditoría

Cada cambio de rol y de lista de secciones escribe una entrada
en el [audit log](features/audit) con los valores antes/después.
Puedes filtrar la página de audit a `entity: user` para ver
todos los cambios de rol en tu org.

## A dónde ir después

- **[Tenancy y aislamiento de datos](concepts/tenancy)** — cómo
  funciona el scope de org en la capa de base de datos.
- **[Página Settings → Users](features/settings-users)** —
  referencia de UI para gestionar el equipo.
- **[Audit log](features/audit)** — revisa cada mutación en tu
  org, incluyendo cambios de rol.
