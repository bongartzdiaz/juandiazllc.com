---
slug: features/deals
lang: es
title: Deals
summary: La página de deals — tablero kanban + vista lista, movimientos de stage drag-and-drop, filtros, totales de valor, y cómo los deals se vinculan a contactos y proyectos.
tags: [features, deals, pipeline, kanban]
related: [onboarding/first-deal, features/kanban, features/automations, features/settings-pipelines]
updated: 2026-04-25
---

# Deals

Un **deal** es una oportunidad en movimiento. Transacciones
inmobiliarias, donaciones filantrópicas en negociación, reservas
de hospitality en proceso de contratación — todos comparten el
mismo modelo. Cada deal vive en exactamente una **pipeline** en
una **stage** a la vez.

## Dos vistas

`/deals` alterna entre dos layouts vía un botón en la toolbar
(persiste en URL):

- **Kanban** — tablero drag-and-drop; una columna por stage de
  pipeline. Altura de pila de tarjetas = recuento de stages.
  Mejor para mover deals hacia adelante de un vistazo.
- **Lista** — vista de tabla con columnas ordenables (título,
  stage, valor, owner, contacto, actualizado). Mejor para
  operaciones masivas, exports y filtros.

## Toolbar

- **Selector de pipeline** — cambia entre pipelines si tu org
  tiene más de una. Cada pipeline tiene su propio set de
  stages.
- **Filtro de estado** — open / won / lost / all
- **Búsqueda** — coincide con títulos de deals
- **+ New deal** — abre el modal de creación (admins + managers)

La página de deals también muestra tres KPIs: valor total
abierto, forecast ponderado, días promedio en stage.

## Crear un deal

Obligatorio: título, pipeline, stage. Opcional: valor, owner,
contacto, proyecto. Submit crea el deal en la stage elegida; la
tarjeta kanban aparece inmediatamente.

Si la pipeline que eliges no tiene stages (raro, org fresca), el
formulario bloquea el submit con "no stages — añade stages en
`/settings/pipelines` primero".

## Mover un deal entre stages

**En vista kanban**: arrastra la tarjeta a una nueva columna.

- Actualización optimista: la tarjeta se mueve inmediatamente.
- El PATCH ocurre en segundo plano.
- En caso de error, la tarjeta vuelve a su sitio y un toast
  muestra el fallo.
- Un toast `Deal movido` confirma el éxito; una entrada de
  audit log registra los valores antes/después de la stage.

**En vista de lista o página de detalle**: cambia la stage en
el dropdown, save. No optimista; el botón muestra un spinner
hasta que regresa.

Cada cambio de stage escribe audit + puede disparar
automatizaciones (ver [automatizaciones](features/automations)).

## La página de detalle del deal

`/deals/[id]` muestra:

- **Tarjeta de cabecera** — título (editable inline), selector
  de stage, estado, valor, avatar del owner
- **Campos editables inline** — título, valor, fecha esperada
  de cierre, tipo de deal — haz clic para editar, Tab/Esc para
  guardar/cancelar
- **Sidebar** — contacto vinculado, proyecto vinculado, tags
- **Feed de actividad** — cada evento en este deal: cambios de
  stage, notas, emails, llamadas
- **Pestaña Files** — documentos adjuntos al deal
- **Pestaña E-signatures** — solicitudes de firma + sus estados

## Vincular un deal a un contacto

Dos maneras:

1. Al crear — elige un contacto en el modal.
2. Después de crear — abre el deal → Sidebar → "Link contact"
   → elige de tu lista de contactos.

Una vez vinculado:

- La pestaña "Deals" del contacto incluye este deal
- La actividad fluye en ambas direcciones — una nota en el
  contacto aparece en el feed del deal
- Los emails desde/hacia el email del contacto se adjuntan
  automáticamente al deal

## Estado: open / won / lost

El estado es **separado** de la stage. La stage es la posición
en la pipeline; el estado es la disposición.

- **Open** — deal está activo, en alguna stage. Por defecto
  para nuevos deals.
- **Won** — deal cerrado positivamente. A menudo emparejado
  con la stage final de la pipeline.
- **Lost** — deal cerrado negativamente. Opcionalmente incluye
  una "razón de pérdida" en las notas para analytics.

Filtrar por estado está en la toolbar; el kanban muestra deals
abiertos por defecto y atenúa los won/lost.

## Eliminar un deal

`/deals/[id]` → menú → Delete. Aviso de confirmación; solo
admin o manager.

Hard-delete; no hay columna soft-delete en `Deal`. El audit log
preserva la entrada (la restricción FK es `RESTRICT`, así que
la fila de audit conserva el id del deal pero el deal en sí ha
desaparecido). Usa esto con moderación — para pruebas o
corrección de datos forzada; para "no conseguimos el deal" usa
estado = lost.

## A dónde ir después

- **[Tablero Kanban](features/kanban)** — detalles de UX de
  drag-drop
- **[Pipelines](features/settings-pipelines)** — configuración
  admin de stages
- **[Automatizaciones](features/automations)** — automatiza
  basándote en cambios de stage
- **[Contactos](features/contacts)** — vincula deals a personas
