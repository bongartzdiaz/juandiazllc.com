---
slug: concepts/gdpr
lang: es
title: Privacidad y tus derechos sobre los datos
summary: Exportación de autoservicio y eliminación de cuenta para operadores, más el flujo dirigido por admin para contactos.
tags: [concepts, gdpr, privacy, data-rights, security]
related: [onboarding/create-organization, concepts/tenancy, features/gdpr]
updated: 2026-04-25
---

# Privacidad y tus derechos sobre los datos

Philly trae herramientas conformes con el RGPD listas para usar.
Existen dos flujos:

1. **Autoservicio** — para ti, el operador. Exporta tus datos de
   cuenta o programa la eliminación de tu cuenta. No se necesita
   admin.
2. **Dirigido por admin** — para contactos / voluntarios /
   huéspedes almacenados *por* una organización. Un admin
   procesa la solicitud en nombre de la org como controlador de
   datos.

## Autoservicio: exporta tus datos

Artículo 15 RGPD (derecho de acceso).

- Endpoint: `GET /api/me/data-export`
- Devuelve: descarga JSON de cada registro que el CRM mantiene
  sobre ti — tu fila `User`, tus notas escritas, tu historial de
  actividad, tus entradas de audit log, etc. Los campos secretos
  (`passwordHash`, `twoFactorSecret`, tokens OAuth) están
  redactados por seguridad; el resto son tus datos textualmente.
- Rate-limited a 5 exports por mes por usuario.
- Audit-logged: una fila `GdprExportLog` registra que ocurrió un
  export, con un hash SHA-256 de tu email (para que la prueba
  sobreviva a la eventual eliminación de tu cuenta, sin retener
  el email en sí).

Disparalo desde el dashboard vía tu menú de perfil, o `curl`
directamente con tu cookie de sesión.

## Autoservicio: elimina tu cuenta

Artículo 17 RGPD (derecho al borrado).

- `POST /api/me/account-deletion {confirm: "DELETE"}` programa
  tu cuenta para eliminación en **30 días**. Durante el período
  de gracia:
  - Aún puedes iniciar sesión y usar el CRM normalmente.
  - Puedes cancelar la eliminación programada en cualquier
    momento vía `DELETE /api/me/account-deletion`.
- Después de 30 días, el cron nocturno de retención
  (`/api/cron/gdpr-retention`) elimina duramente tu fila
  `User`. El cascade delete maneja `ContactNote`, `Activity`,
  `TwoFactorRecoveryCode` y similares automáticamente.
- Una fila `GdprErasureLog` registra el borrado con un hash de
  tu email — prueba para un regulador de que procesamos la
  solicitud, mantenida indefinidamente.
- **Protección del último admin**: si eres el único admin en tu
  organización, el sistema se niega a programar tu eliminación
  con un `409 Conflict`. Promueve a otro compañero a admin
  primero, de lo contrario la org quedaría huérfana.

## Dirigido por admin: solicitud de acceso del interesado (DSAR)

Cuando un contacto, voluntario, huésped u otra parte tercera en
tu organización pregunta "¿qué datos tienen sobre mí?", el admin
lo procesa vía:

- `POST /api/admin/gdpr/data-subject-export` con `{email, reason?}`
- Devuelve: descarga JSON de cada fila en cada tabla con PII que
  hace referencia a ese email — dentro de tu organización. Los
  datos cross-tenant nunca se devuelven.

La solicitud está rate-limited (10 por hora por admin) y
registrada con el actor y el SHA-256 del email del interesado.

## Dirigido por admin: borrado del interesado

Cuando un contacto pide "eliminen todo lo que tengan sobre mí":

- `POST /api/admin/gdpr/data-subject-erasure` con
  `{email, reason, confirm: "ERASE"}`
- El campo reason es **obligatorio** — el registro del Artículo
  30 requiere que el controlador documente por qué se procesó un
  borrado.
- Hard-delete cada fila PII que hace referencia a ese email
  (Contact, Reservation, Volunteer, OpenHouseVisit, Message,
  ESignature, CallLog, SmsMessage). Los cascade deletes manejan
  los children (ContactNote, Activity).
- Una fila `GdprErasureLog` registra el borrado con un hash
  SHA-256 del email y los conteos de filas por modelo.
  **Mantenida indefinidamente** — la prueba debe sobrevivir a
  los datos en sí.

Si el log de prueba de borrado falla al escribirse (error de
DB, etc.), el endpoint devuelve un 500 en lugar de 200. Sin la
entrada del log, no podríamos probar el borrado a un regulador
— lo que sería una violación en sí mismo.

## Registro de Actividades de Tratamiento (Artículo 30)

El registro completo de cada actividad de tratamiento que Philly
realiza vive en `lib/gdpr/ropa.ts` y se renderiza para admins en
`/gdpr`. Documenta:

- Qué actividades ejecutamos (autenticación de operador,
  gestión de contactos, reservas de hospitality, etc.)
- La base legal para cada una (Art. 6(1)(b) contrato, (1)(f)
  interés legítimo, (1)(c) obligación legal, etc.)
- Categorías de interesados
- Categoría de datos y período de retención
- Destinatarios y cualquier transferencia a terceros países
- Medidas de seguridad técnicas y organizativas

Este es el documento que un regulador pediría bajo el Artículo
30.

## Aviso de privacidad y política de cookies

Ambos viven en `docs/legal/`:

- `PRIVACY-NOTICE.md` — la plantilla de aviso del Artículo 13/14,
  lista para adaptar al nombre de tu entidad legal.
- `COOKIE-POLICY.md` — la auditoría de cada cookie que el CRM
  establece. Spoiler: solo estrictamente necesarias, no se
  necesita banner.

## Respuesta a violaciones

`docs/legal/BREACH-RESPONSE.md` es el runbook on-call para una
violación de datos personales sospechada: triage, investigación,
notificación a la autoridad de control dentro de 72 horas
(Art. 33), notificación a los interesados afectados cuando el
riesgo es alto (Art. 34), y escritura de una revisión
post-incidente.

## A dónde ir después

- **[Página GDPR admin](features/gdpr)** — la UI que los admins
  usan para procesar DSARs.
- **[Tenancy y aislamiento de datos](concepts/tenancy)** — por
  qué los DSARs cross-tenant son imposibles.
- **[Audit log](features/audit)** — el registro forense que
  fundamenta todo lo anterior.
