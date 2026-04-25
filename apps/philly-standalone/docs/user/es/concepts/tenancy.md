---
slug: concepts/tenancy
lang: es
title: Tenancy y aislamiento de datos
summary: Cómo Philly delimita cada registro a una organización y prueba en compile-time que ninguna ruta API puede filtrarse entre tenants.
tags: [concepts, tenancy, security, multi-tenant, organization]
related: [onboarding/create-organization, concepts/roles, concepts/gdpr, features/audit]
updated: 2026-04-25
---

# Tenancy y aislamiento de datos

Philly es multi-tenant por diseño. Cada organización es un
tenant; cada registro lleva el id de la organización; cada ruta
API filtra por él. Dos empresas no relacionadas que se registran
en Philly nunca ven los datos del otro.

Esta página explica la mecánica — útil si eres admin, DPO o
revisor de seguridad.

## La capa de datos

La mayoría de las tablas en la base de datos tienen una columna
`organizationId`. Algunas que no la tienen (`Reservation`,
`OpenHouseVisit`, `Message`, `ESignature`) están delimitadas vía
una tabla padre que sí la tiene — por ejemplo, una `Reservation`
está adjunta a un `Room`, y el `Room` lleva el `organizationId`.

De cualquier manera, cada query que la aplicación hace para
datos org-scoped incluye un filtro `organizationId`. No hay
queries de "encuentra este contacto solo por id" — siempre son
"encuentra este contacto por id Y en esta organización".

## La capa de auth

Cada ruta API empieza con uno de tres guards:

```ts
const scope = await requireScope()       // cualquier usuario autenticado
const scope = await requireRole(['admin']) // solo admin
const scope = await requireSection('deals', ['admin', 'manager'])
```

Cada uno devuelve un objeto `AuthScope` que contiene — entre
otras cosas — el `organizationId` del llamador. Las rutas luego
usan ese valor en sus queries Prisma:

```ts
const contacts = await prisma.contact.findMany({
  where: { organizationId: scope.organizationId, ... }
})
```

Si una ruta olvida el scoping, expondría datos de otro tenant.
Esa clase de bug es la razón por la que...

## La capa de auditoría

`scripts/audit-tenant-isolation.ts` recorre cada archivo
`app/api/**/route.ts` y marca cualquier ruta que:

- No llama a `requireScope` / `requireRole` / `requireSection`
- O hace query a Prisma pero nunca referencia `organizationId`

El script se ejecuta vía `npm run audit:tenant`. Sale con 0 si
cada ruta está delimitada, y no-cero con una lista de infractores
si no. El estado actual es **limpio** — cada ruta o está
delimitada, o está en la lista explícita `EXEMPT_PATHS` con una
justificación de una línea (por ejemplo, `/api/log-error` es un
sumidero de errores público, `/api/cron/*` usa auth de
Bearer-token).

La auditoría se ejecuta en cada build de CI vía
`.github/workflows/security.yml`. Una nueva ruta que olvida
delimitar hace fallar el build.

## ¿Y si un usuario pertenece a múltiples organizaciones?

Hoy, no. `User.organizationId` es 1:1 — un usuario pertenece a
exactamente una organización. El modelo de datos espera esto; el
flujo de auth lo aplica.

Si necesitas legítimamente acceso cross-org (por ejemplo, un
consultor trabajando con varios clientes), el workaround por
ahora es crear cuentas de usuario separadas con emails diferentes
— una por organización.

Una futura tabla "Membership" que permita a un usuario pertenecer
a múltiples orgs está en la roadmap; pregunta si la necesitas
antes.

## ¿Y las solicitudes de interesados dirigidas por admin?

RGPD Art. 15 (acceso) y Art. 17 (borrado) permiten a un admin
procesar una solicitud para un tercero (un contacto, un
voluntario, un huésped) en nombre de su organización. Los
endpoints `/api/admin/gdpr/data-subject-export` y
`/api/admin/gdpr/data-subject-erasure` encuentran filas por email
**delimitadas al `organizationId` del admin solicitante**. No
pueden alcanzar los datos de otro tenant, ni siquiera con rol
admin.

Ver [autoservicio RGPD](concepts/gdpr) para el flujo completo.

## Tests que fijan la garantía

`lib/onboarding/create-org.test.ts` incluye un test llamado
"two unrelated signups land in two separate organizations".
Crea dos nuevos usuarios con emails diferentes, ejecuta cada uno
a través del flujo de create-org y afirma que las dos
organizaciones son distintas y las dos filas de usuario
pertenecen a las correctas.

Eliminar o debilitar ese test debería requerir revisión del
equipo de seguridad. Es la afirmación que sostiene nuestra
declaración de multi-tenancy.

## A dónde ir después

- **[Roles y permisos](concepts/roles)** — qué puede hacer cada
  rol *dentro* de su organización.
- **[Autoservicio RGPD](concepts/gdpr)** — flujos del Artículo
  15/17 para operadores y contactos.
- **[Audit log](features/audit)** — el registro a prueba de
  manipulaciones de cada mutación en tu tenant.
