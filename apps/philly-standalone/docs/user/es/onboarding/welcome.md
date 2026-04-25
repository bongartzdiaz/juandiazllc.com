---
slug: onboarding/welcome
lang: es
title: Bienvenido a Philly CRM
summary: Lo que hace el CRM, para quién está pensado, y el camino de cinco minutos desde el primer inicio de sesión hasta un tenant funcional.
tags: [onboarding, getting-started, overview]
related: [onboarding/create-organization, onboarding/invite-team, concepts/tenancy]
updated: 2026-04-25
---

# Bienvenido a Philly CRM

Philly es un CRM operator-first. Centraliza el trabajo de una
organización pequeña o mediana — tus contactos, tus deals, tus
proyectos, tu bandeja de entrada, tu calendario — y añade las
integraciones y herramientas de IA que convierten datos brutos en
acción.

## Para quién es

Philly atiende a tres verticales sectoriales desde una única base
de código:

- **Filantropía** — socios, donantes, beneficiarios, stakeholders, subvenciones, métricas de impacto.
- **Inmobiliaria** — compradores, vendedores, propiedades, listings, transacciones, comisiones.
- **Hospitality** — huéspedes, reservas, habitaciones, proveedores, personal.

El dashboard se adapta automáticamente según el sector que
selecciona tu organización. La mayoría de las páginas existen en
los tres modos; un puñado son específicas de una vertical.

## Lo que obtienes el primer día

- Una base de datos multi-tenant donde cada registro está
  delimitado a tu organización. Otras organizaciones nunca pueden
  ver tus datos.
- Acceso basado en roles (admin / manager / viewer) con una
  lista permitida por sección — puedes dar a un viewer acceso a
  "deals" pero ocultar "audit log".
- Una pista de auditoría completa de quién-hizo-qué, con
  evidencia criptográfica de manipulación (Artículo 30 RGPD
  registro).
- Herramientas RGPD de autoservicio — los operadores pueden
  exportar o eliminar su propia cuenta; los admins pueden
  procesar solicitudes de interesados para contactos.
- Una postura de privacidad completa: sin cookies analíticas, sin
  fingerprinting, sin trackers de terceros. El CRM funciona sin
  ningún banner de consentimiento.

## Configuración en cinco minutos

Un inicio de sesión nuevo pasa por `/onboarding`:

1. **Inicia sesión** con tu email en el sitio de marca (Supabase auth).
2. **Crea tu organización** — elige un nombre; te conviertes en su admin.
3. **Invita a tu equipo** — admin → `/settings/users` → email + rol.
4. **Elige tu sector** — settings → `industry` (filantropía / inmobiliaria / hospitality).
5. **Añade tu primer registro** — un contacto, un deal, un proyecto, una propiedad — lo que abordarías primero.

Eso es todo. El resto de esta guía recorre cada uno en detalle y
enlaza a los docs de feature en el camino.

## A dónde ir después

- **[Crea tu organización](onboarding/create-organization)** — el primer paso en el primer inicio de sesión.
- **[Invita a tu equipo](onboarding/invite-team)** — pre-crea cuentas de compañeros para que aterricen en tu org en su primer inicio de sesión.
- **[Roles y permisos](concepts/roles)** — admin vs manager vs viewer, y la lista permitida por sección.
- **[Tenancy y aislamiento de datos](concepts/tenancy)** — cómo el CRM mantiene tus datos separados de otras organizaciones.
- **[Tu privacidad y derechos sobre los datos](concepts/gdpr)** — los flujos de autoservicio "Exportar mis datos" y "Eliminar mi cuenta".

Si te atascas, el asistente en la esquina inferior derecha puede
responder preguntas sobre cualquier feature en lenguaje sencillo.
