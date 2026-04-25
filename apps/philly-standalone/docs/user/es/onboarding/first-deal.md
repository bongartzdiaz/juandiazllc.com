---
slug: onboarding/first-deal
lang: es
title: Añade tu primer deal
summary: Cómo crear un deal, vincularlo a un contacto y moverlo a través de las stages de la pipeline en la vista kanban o lista.
tags: [onboarding, deals, pipeline, kanban, getting-started]
related: [features/deals, features/kanban, onboarding/first-contact, features/automations]
updated: 2026-04-25
---

# Añade tu primer deal

Un **deal** es una oportunidad en movimiento — una transacción
inmobiliaria, una donación en negociación, una reserva de
evento. Los deals pertenecen a una **pipeline** y avanzan a
través de **stages** de la pipeline.

## Dónde hacerlo

`/deals` → haz clic en **+ New deal** en la topbar.

## Campos

- **Título** (obligatorio) — cómo lo llamarías en una
  conversación. Por ejemplo "Acme partnership Q3" o "1234 Elm
  St — venta".
- **Pipeline** (obligatorio) — elige en qué pipeline vive este
  deal. Las nuevas orgs reciben una pipeline por defecto; los
  admins pueden crear más en `/settings/pipelines`.
- **Stage** (obligatorio) — la posición actual. Las stages son
  específicas de la pipeline. La stage por defecto para nuevos
  deals es la más a la izquierda ("Lead", "Inquiry", etc.).
- **Valor** (opcional) — valor monetario en céntimos. Usado
  para los KPIs de la pipeline.
- **Owner** (opcional) — qué usuario es el deal-owner. Por
  defecto eres tú.
- **Contacto** (opcional) — vincula el deal a un contacto
  existente. Recomendado; muchas automatizaciones necesitan
  este enlace.
- **Proyecto** (opcional) — vincula a un proyecto si es
  relevante.

Envía y el deal aterriza en el tablero kanban en la stage
elegida.

## Dos vistas: kanban y lista

La página de deals alterna entre:

- **Kanban** — tablero drag-and-drop; una columna por stage de
  pipeline. Mejor para mover deals hacia adelante.
- **Lista** — vista de tabla con columnas totalmente
  filtrables. Mejor para operaciones masivas, exports o
  ordenar por valor.

El toggle persiste en la URL.

## Mover un deal entre stages

**En vista kanban**: arrastra la tarjeta a una nueva columna.

- Actualización optimista: la tarjeta se mueve inmediatamente.
- El PATCH ocurre en segundo plano.
- En caso de error, la tarjeta vuelve a su sitio y un toast
  muestra el fallo.
- Un toast `Deal movido` confirma el éxito; una entrada de
  audit log registra los valores antes/después de la stage.

**En vista de lista o página de detalle**: cambia la stage en el
dropdown, guarda. No es optimista; el botón muestra un spinner
hasta que regresa.

Cada cambio de stage escribe audit + puede disparar
automatizaciones (ver [Automatizaciones](features/automations)).

## Vincular un deal a un contacto

Dos maneras:

1. Al crear — elige un contacto en el modal.
2. Después de crear — abre el deal → Sidebar → "Link contact"
   → elige de tu lista de contactos.

Una vez vinculado:

- La pestaña "Deals" del contacto incluye este deal
- La actividad fluye en ambas direcciones — una nota en el
  contacto aparece en el feed del deal
- Los emails hacia/desde el email del contacto se adjuntan
  automáticamente al deal

## Estado: open / won / lost

El estado es **separado** de la stage. La stage es la posición
en la pipeline; el estado es la disposición.

- **Open** — deal está activo, en alguna stage. Por defecto
  para nuevos deals.
- **Won** — deal cerrado positivamente. A menudo emparejado
  con la stage final de la pipeline.
- **Lost** — deal cerrado negativamente. Opcionalmente incluye
  una "razón perdida" en las notas para análisis.

Filtrar por estado está en la toolbar; el kanban muestra deals
abiertos por defecto y atenúa los won/lost.

## Eliminar un deal

`/deals/[id]` → menú → Eliminar. Aviso de confirmación; solo
admin o manager.

Eliminación definitiva; no hay columna soft-delete en `Deal`.
El audit log preserva la entrada (la restricción FK es
`RESTRICT`, así que la fila de audit conserva el id del deal
pero el deal en sí ha desaparecido). Usa esto con moderación —
para pruebas o corrección de datos forzada; para "no
conseguimos el deal" usa estado = lost.

## A dónde ir después

- **[Tablero Kanban](features/kanban)** — detalles de UX de
  drag-drop
- **[Pipelines](features/settings-pipelines)** — configuración
  admin de stages
- **[Automatizaciones](features/automations)** — automatiza
  basándote en cambios de stage
- **[Contactos](features/contacts)** — vincula deals a personas
