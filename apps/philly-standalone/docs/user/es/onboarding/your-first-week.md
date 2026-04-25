---
slug: onboarding/your-first-week
lang: es
title: Tu primera semana
summary: Una checklist día a día que lleva a un nuevo admin desde cero hasta un CRM completamente cableado en cinco días laborables.
tags: [onboarding, getting-started, admin, checklist]
related: [onboarding/welcome, onboarding/create-organization, onboarding/invite-team, onboarding/first-contact]
updated: 2026-04-25
---

# Tu primera semana

Esta es una checklist de cinco días. Asume que eres el primer
admin en una organización nueva. Nada de esto es obligatorio —
pero si lo sigues, terminas en una posición donde el CRM hace
trabajo real para ti en lugar de quedarse vacío.

## Día 1 — arrancar el tenant

- [ ] Inicia sesión en el sitio de marca con tu email de admin.
- [ ] Completa `/onboarding` — nombra tu organización, elige un
      nombre para mostrar. Te conviertes en admin.
- [ ] Visita `/settings` → establece tu sector
      ([filantropía / inmobiliaria / hospitality](onboarding/pick-industry)).
- [ ] Abre `/api/health` en el navegador. Espera 200 + un check
      de base de datos por debajo de 100ms. Si obtienes 503, las
      env vars de DB no están configuradas — arréglalo antes de
      continuar.

**Fin del día 1**: el tenant existe, eres admin, env está
saludable.

## Día 2 — invita a tu equipo

- [ ] `/settings/users` → invita a cada compañero por email.
      Elige el rol correcto:
      - Admin para quien necesita invitar / editar usuarios
      - Manager para el equipo operativo (sales, ops, comms)
      - Viewer para miembros del consejo, auditores, ejecutivos
        de solo-lectura
- [ ] Decide sobre restricciones por sección donde sean útiles —
      por ejemplo, los miembros del consejo típicamente solo
      necesitan `dashboard`, `reports`, `impact`. Configura sus
      `dashboardSections` en consecuencia.
- [ ] Haz que al menos un compañero inicie sesión exitosamente
      para que hayas probado el flujo de invitación end-to-end.

**Fin del día 2**: el equipo puede iniciar sesión. Cada persona
ve la sidebar correcta.

## Día 3 — establece tu forma de datos

- [ ] `/settings/pipelines` → revisa la pipeline por defecto
      para tu sector. Edita los nombres de stages para que
      coincidan con tu proceso real de sales / donor / booking.
      Añade una segunda pipeline si tienes flujos distintos (por
      ejemplo, "Major gifts" vs "Recurring donors").
- [ ] Si eres inmobiliaria o hospitality:
      - `/settings/property-taxonomy` → personaliza distritos,
        property types y flags para tu mercado.
- [ ] Decide cómo rastrearás las tareas. La mayoría de los
      equipos usan:
      - `/calendar` para eventos programados + reuniones
      - Entradas de actividad en contactos para follow-ups
        ad-hoc
      - `/automations` para reglas recurrentes "if X then create
        task"

**Fin del día 3**: pipelines + taxonomía coinciden con cómo
trabaja realmente tu equipo.

## Día 4 — conecta herramientas externas

- [ ] `/integrations` → conecta al menos una de:
      - Google (Gmail + Calendar) — alimenta `/email` y
        `/calendar`
      - Twilio (SMS + WhatsApp) — alimenta `/sms`
      - DocuSign / HelloSign — alimenta `/e-signatures` y
        `/transactions`
- [ ] Genera una clave API en `/settings/api-keys` si tienes
      herramientas externas que necesitan leer / escribir datos
      del CRM programáticamente (Zapier, n8n, scripts
      personalizados).
- [ ] Configura un webhook en `/settings/webhooks` si quieres
      empujar eventos del CRM a Slack, Discord o tu propio
      endpoint.

**Fin del día 4**: las herramientas externas están cableadas.
Los emails entrantes y eventos de calendario fluyen al CRM
automáticamente.

## Día 5 — carga datos reales + primera automatización

- [ ] Bulk-importa tus contactos vía `/contacts` → carga CSV.
      Coincide las columnas con los campos del formulario; el
      auto-enriquecimiento de IA rellena industry / ICP fit /
      summary en segundo plano.
- [ ] Crea unos cuantos deals reales en `/deals` para que los
      veas fluir en el [tablero kanban](features/kanban).
- [ ] Construye tu primera automatización en `/automations`.
      Reglas iniciales comunes:
      - "Stage = stale (sin actualización en 14 días) → email
        al deal owner"
      - "Nuevo contacto etiquetado 'donor' → añadir a mailing
        list"
      - "Valor del deal > €10.000 → notifica a Slack"

**Fin del día 5**: los datos reales están dentro. El CRM hace
trabajo automatizado para ti.

## Más allá de la semana 1

Una vez pasados los básicos:

- **Configura el asistente de IA** si aún no lo has hecho — el
  chat in-app en `/assistant` sabe cómo funciona cada feature y
  responde preguntas en lenguaje sencillo. La configuración del
  operador está en `docker/ollama/README.md`.
- **Revisa tu audit log semanalmente** — `/audit` muestra cada
  mutación en tu tenant. Verifica mensualmente que el
  [hash chain](features/audit) está intacto en
  `/api/admin/audit/verify`.
- **Haz un simulacro RGPD** — toma el email de un contacto real,
  recorre los flujos de `/gdpr` admin export + erasure en una
  copia de prueba. Quieres tener confianza en el procedimiento
  antes de que llegue una solicitud real.

## A dónde ir después

- **[Roles y permisos](concepts/roles)** — análisis profundo
  sobre lo que cada rol puede hacer.
- **[Tenancy y aislamiento de datos](concepts/tenancy)** — cómo
  Philly mantiene tus datos separados de otras organizaciones.
- **[Autoservicio RGPD](concepts/gdpr)** — flujos de derechos
  de datos del operador y dirigidos por admin.
