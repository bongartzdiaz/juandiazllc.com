---
slug: features/automations
lang: es
title: Automatizaciones
summary: Reglas basadas en triggers que se disparan en eventos de entidad — crear tareas, enviar emails, postear webhooks, actualizar campos. Configuración solo-admin.
tags: [features, automations, rules, admin]
related: [features/deals, features/settings-webhooks, features/integrations]
updated: 2026-04-25
---

# Automatizaciones

Reglas basadas en triggers. Cuando algo pasa en el CRM (un deal
cambia de stage, se crea un contacto, un proyecto alcanza un
milestone), el motor de automatizaciones evalúa cada regla
habilitada y ejecuta las acciones que coincidan.

`/automations` — solo admin. Managers + viewers no ven nada.

## La forma de la regla

Cada regla es `trigger → condiciones → acciones`:

- **Trigger** — qué pone en marcha la regla. Ejemplos:
  - `deal.stage_changed` — se dispara cuando cambia la stage de un deal
  - `deal.value_threshold` — se dispara cuando el valor cruza un umbral
  - `contact.created` — se dispara con nuevo contacto
  - `contact.tagged` — se dispara cuando se añade/quita un tag
  - `project.milestone_completed`
  - `task.overdue`
  - `email.received` — cuando Gmail-sync ingresa un mensaje coincidente
- **Condiciones** — filtros opcionales. Combinados con AND. Ejemplos:
  - `deal.pipeline = "Major Gifts"`
  - `deal.value >= 10000`
  - `contact.type = "donor"`
- **Acciones** — qué hacer. Una o más, ejecutadas en orden:
  - `create_task` — añade una Activity de tipo "task" a un registro
  - `send_email` — envía desde una cuenta de email conectada
  - `post_webhook` — hace POST a un webhook registrado
  - `update_field` — patcha un campo en el registro disparador
  - `notify_user` — crea una notificación in-app
  - `tag_contact` — añade/quita un tag

## Construyendo una regla

`/automations` → **+ New rule**. Se abre modal con:

1. **Nombre** — texto libre; aparece en el audit log.
2. **Trigger** — elige del dropdown.
3. **Condiciones** — vacío por defecto. Haz clic "+ Condition"
   para añadir pares field-value. Las opciones de field están
   limitadas a la entidad del trigger.
4. **Acciones** — al menos una requerida. Cada acción tiene su
   propio formulario (ej. send_email pide from-account,
   to-template, subject template, body template).
5. **Habilitada** — toggle. Las nuevas reglas se habilitan por
   defecto.

Save. La regla aparece en la lista; el motor la recoge en el
próximo evento coincidente.

## Historial de ejecuciones

Cada fila de regla muestra:

- **Total runs** — vida útil
- **Last run** — timestamp
- **Status** — resultado de la última ejecución (ok / partial / failed)

Haz clic en una regla para expandir su log de ejecuciones: lista
cronológica de cada disparo, con el id del registro disparador,
resultados de condiciones y resultados de acciones.

El motor reintenta acciones fallidas hasta 3 veces con backoff
exponencial. Tras 3 fallos, la acción se marca como
permanentemente fallida y la regla continúa con las acciones
subsiguientes.

## Plantillas

Los campos de acción como subject + body de email soportan
plantillas estilo handlebars con los campos del registro
disparador:

```
Subject: Deal {{deal.title}} movido a {{deal.stage}}
Body:    Hola {{deal.owner.name}}, el deal "{{deal.title}}" se
         acaba de mover a la stage {{deal.stage}}. Contacto
         vinculado: {{deal.contact.name}}.
```

Las variables disponibles dependen del trigger. El selector de
variables del formulario (icono pequeño `{}` junto al campo)
lista lo que está disponible.

## Reglas iniciales comunes

Tres reglas que casi cada org quiere:

1. **Stale-deal nudge** — trigger `deal.no_update_in`, días = 14,
   acción `notify_user` al deal owner.
2. **High-value Slack ping** — trigger `deal.value_threshold`,
   umbral = €10.000, acción `post_webhook` a un Slack incoming
   webhook.
3. **New-donor welcome** — trigger `contact.created`, condición
   `contact.type = "donor"`, acción `send_email` con una
   plantilla de bienvenida.

## Deshabilitar una regla

Toggle el switch "Enabled". La regla queda en la lista pero el
motor la salta. Las ejecuciones pasadas se preservan.

## Pista de auditoría

Cada create, edit, enable/disable y delete en una regla
escribe una entrada en audit log. Cada disparo de regla
también escribe una fila `automationLog` que es visible en el
historial de ejecuciones de la regla.

## Límites

- Máx 50 reglas habilitadas por organización (cap blando;
  aumentable en config si es necesario).
- Cada regla está rate-limited a 100 ejecuciones por hora por
  organización. Más allá de eso, las ejecuciones se descartan
  para prevenir bucles desbocados (ej. una automatización que
  se dispara a sí misma).
- Las cadenas de acciones están capadas a 10 acciones por
  regla.

## A dónde ir después

- **[Deals](features/deals)** — la fuente de trigger de
  automatización más común.
- **[Webhooks](features/settings-webhooks)** — configuración
  de webhook saliente para la acción `post_webhook`.
- **[Integraciones](features/integrations)** — conecta cuentas
  de email para que las acciones `send_email` tengan desde
  dónde enviar.
