---
slug: features/contacts
lang: es
title: Contactos
summary: La página de contactos — grid, búsqueda, píldoras de filtro, auto-enriquecimiento por IA, la página de detalle con pestañas para activity / notas / proyectos / deals.
tags: [features, contacts, crm-core]
related: [onboarding/first-contact, features/ai-attributes, features/deals, concepts/gdpr]
updated: 2026-04-25
---

# Contactos

La página `/contacts` es el directorio principal para todos
aquellos con quienes tu organización trata. El modelo de datos
es el mismo en todos los sectores; solo cambian las etiquetas de
las píldoras de tipo (donor vs buyer vs guest, etc. — ver
[pick-industry](onboarding/pick-industry)).

## El layout de la página

- **Tira de KPIs** en la parte superior — total de contactos,
  más 3 conteos específicos del sector (por ejemplo, partners /
  donors / stakeholders para filantropía).
- **Toolbar** con búsqueda de texto libre + píldoras de filtro
  por tipo. La búsqueda hace match en nombre, email y empresa.
  Las selecciones de filtro se reflejan en la URL para que
  puedas compartir una vista filtrada.
- **Grid de tarjetas de contacto** — 3 por fila en escritorio, 1
  en móvil. Cada tarjeta muestra avatar (iniciales), nombre,
  empresa, email, teléfono y conteo de proyectos.

El grid se renderiza síncronamente en los modos
inmobiliaria / hospitality (datos de demo); en modo filantropía
obtiene datos en vivo y muestra un banner "Loading contacts…"
sobre el grid mientras la API está en vuelo.

## Crear un contacto

Haz clic en **+ New contact** en la topbar (solo admins +
managers). Completa: nombre (obligatorio), email, teléfono,
tipo, empresa, notas.

Al enviar:

1. El contacto se guarda + aparece en el grid.
2. **Auto-enriquecimiento por IA** se inicia en segundo plano
   (si `ANTHROPIC_API_KEY` está configurado) — Claude infiere
   industry, ICP fit score (0–100) y un summary de una línea a
   partir del nombre + empresa + dominio del email. La tarjeta
   muestra un pequeño spinner hasta que la llamada regresa; el
   estado cambia de `pending` a `complete`.
3. **Broadcast en tiempo real** — cada otra pestaña abierta
   del dashboard en tu org actualiza la lista de contactos.
4. **Entrada de audit log** — `entity: contact, action: create`.

## Importación masiva

`/contacts` también tiene una carga CSV (solo admins +
managers). Las columnas requeridas coinciden con el formulario
de creación. Cada fila importada ejecuta el mismo
auto-enriquecimiento, throttled a ~10/seg para mantenerse
bajo el rate limit de IA.

Validación: emails en blanco son aceptados (por defecto `""`);
nombres en blanco rechazan la fila; emails duplicados son
rechazados (la tabla contacts trata el email como soft-único
dentro de una org).

## La página de detalle del contacto

Haz clic en cualquier tarjeta → `/contacts/[id]`. Layout:

- **Tarjeta de cabecera** — avatar, nombre, empresa, badge de
  tipo, botones edit/save/cancel, fondo de color por tipo.
- **Pestañas** — Overview | Activity | Emails | Notes | Projects | Deals
- **Pestaña Overview** — campos básicos (email, teléfono,
  empresa, notas) + visualización de atributos de IA (industry,
  ICP score, summary).
- **Pestaña Activity** — cada interacción registrada contra
  este contacto: notas añadidas, deals vinculados, emails
  enviados, llamadas realizadas.
- **Pestaña Emails** — mensajes sincronizados con Gmail donde
  el email de este contacto es la dirección from o to.
- **Pestaña Notes** — notas con timestamp escritas por
  operador; formulario de adición rápida en la parte superior.
- **Pestaña Projects** — proyectos con los que este contacto
  está asociado.
- **Pestaña Deals** — deals donde este contacto es la
  contraparte vinculada.

## Edición inline

En la cabecera, haz clic en **Edit** para cambiar al modo de
edición inline. Los campos se vuelven editables; el botón Save
muestra un spinner durante el PATCH y está deshabilitado para
prevenir doble envío. Cancel revierte.

El modo de edición es solo para admin + manager; los viewers
ven los datos pero no la opción de editar.

## Semántica de búsqueda

La búsqueda de texto libre en la toolbar:

- Hace match contains (case-insensitive) en nombre, email y
  empresa
- Debounced (250ms) para que cada pulsación de tecla no impacte
  la API
- Estado de URL — `?q=jane&type=donor` refleja los filtros
  actuales

Los filtros combinados funcionan aditivamente: píldora tipo
`donor` + búsqueda `acme` devuelve donors en empresas que
coincidan con "acme".

## Privacidad y retención

Los datos de contacto son PII (ver [concepts/gdpr](concepts/gdpr)):

- Delimitados a tu organización; otras orgs nunca pueden verlos.
- Retención por defecto: 3 años desde la última actualización
  significativa — configurable por auto-purga de fila en
  `lib/gdpr/pii-registry.ts`.
- Sujetos a borrado de interesados dirigido por admin si el
  contacto lo pide. La página admin `/gdpr` procesa la
  solicitud — encuentra cada fila que referencia el email a
  través de Contact, Reservation, Volunteer, CallLog,
  SmsMessage, etc., las hard-deletea y escribe una entrada de
  log de prueba de borrado.

## A dónde ir después

- **[Añade tu primer contacto](onboarding/first-contact)** — el
  recorrido.
- **[Atributos de contacto IA](features/ai-attributes)** — el
  auto-enriquecimiento que se ejecuta tras crear.
- **[Deals](features/deals)** — vincula contactos a
  oportunidades en movimiento.
- **[GDPR admin](features/gdpr)** — procesa solicitudes de
  interesados para contactos.
