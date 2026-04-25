---
slug: onboarding/first-contact
lang: es
title: Añade tu primer contacto
summary: Cómo crear un contacto, qué se enriquece automáticamente en segundo plano, y cómo difieren los tipos por sector.
tags: [onboarding, contacts, getting-started]
related: [features/contacts, onboarding/welcome, features/ai-attributes]
updated: 2026-04-25
---

# Añade tu primer contacto

Un "contacto" en Philly es cualquier persona u organización con
la que haces negocios. El formulario es el mismo en todos los
sectores; el selector de **type** cambia según qué sector ejecuta
tu org.

## Dónde hacerlo

`/contacts` → haz clic en **+ New contact** en la topbar.

## Campos

El formulario pide:

- **Nombre** (obligatorio)
- **Email** (opcional pero recomendado — la mayoría de las automatizaciones se basan en él)
- **Teléfono** (opcional)
- **Empresa** (opcional)
- **Type** — depende de tu sector:
  - Filantropía: `partner` / `donor` / `stakeholder` / `beneficiary`
  - Inmobiliaria: `buyer` / `seller` / `tenant` / `landlord` / `investor`
  - Hospitality: `guest` / `vendor` / `partner` / `staff`
- **Notas** — texto libre. Cualquier cosa que quieras recordar sobre ellos.

Envía y el contacto aparece en el grid.

## Lo que pasa en segundo plano

Cuando creas un contacto, varias cosas se inician automáticamente:

1. **Auto-enriquecimiento por IA** — si `ANTHROPIC_API_KEY` está
   configurado, el servidor llama a Claude en segundo plano (vía
   Vercel `after()`) para rellenar:
   - **Industry** — mejor estimación basada en el nombre de la
     empresa + dominio del email
   - **ICP fit score** — estimación de 0–100 de qué tan bien
     coinciden con tu cliente típico
   - **Summary** — descripción de una línea
   El `aiAttributesStatus` del contacto cambia de `pending` a
   `complete` cuando la llamada al LLM regresa. La UI muestra un
   pequeño spinner en la tarjeta del contacto mientras está
   trabajando.
2. **Broadcast en tiempo real** — cada otra pestaña abierta del
   dashboard en tu org recibe un evento `contact:created` y
   actualiza la lista de contactos.
3. **Entrada de audit log** — `entity: contact, action: create`
   contigo como actor.

## Importando muchos contactos a la vez

Usa el formulario de **bulk import** en la página de contactos
(carga CSV). El CSV debe tener columnas que coincidan con los
campos del formulario. La importación masiva ejecuta el mismo
auto-enriquecimiento en cada fila, throttled a ~10/seg para
mantenerse bajo el rate limit de IA.

## Editando un contacto

Haz clic en cualquier tarjeta del grid para abrir la página de
detalle. Haz clic en **Edit** en la topbar para cambiar al modo
de edición inline. La página obtiene actividad, notas, proyectos
y deals relacionados con este contacto.

El botón guardar muestra un spinner durante el PATCH y está
deshabilitado para prevenir doble envío.

## Lo que se puede buscar y filtrar

La toolbar sobre el grid tiene:

- **Búsqueda de texto libre** en nombre, email y empresa
- **Filtro de tipo** — píldoras en la parte superior derecha de la toolbar
- Estado de URL — las selecciones de filtro se reflejan en la URL
  para que puedas compartir una vista filtrada

## Postura de privacidad

Los datos de contacto son PII. Son:

- Delimitados a tu organización (otras orgs nunca pueden verlos)
- Auto-purga 3 años después de la creación si la fila no ha sido
  tocada desde entonces (configurable en
  `lib/gdpr/pii-registry.ts`)
- Sujetos a borrado de interesados liderado por admin si el
  contacto lo pide — ver [autoservicio RGPD](concepts/gdpr).

## A dónde ir después

- **[Contacts page reference](features/contacts)** — el desglose
  completo de la feature.
- **[AI contact attributes](features/ai-attributes)** — qué hace
  el auto-enriquecimiento y cómo deshabilitarlo por org.
- **[Añade tu primer deal](onboarding/first-deal)** — lo
  siguiente que la mayoría de las nuevas orgs hace.
