/* ---------------------------------------------------------------
   Integration configuration — central reader for third-party env
   vars. Every optional integration lights up when its key is set
   and degrades gracefully when it isn't, so the same codebase can
   ship to a client who uses only CRM features and to a client who
   wires up the full stack.

   Usage:
     import { integrations } from '@/lib/philly/integrations'
     if (integrations.twilio.enabled) { ... }
     else return jsonError('SMS not configured', 501)
   --------------------------------------------------------------- */

function read(name: string): string | null {
  const v = process.env[name]
  return v && v.trim().length > 0 ? v : null
}

function enabledIf(...names: string[]): boolean {
  return names.every(n => read(n) !== null)
}

export const integrations = {
  // SMS / voice / calls
  twilio: {
    enabled: enabledIf('TWILIO_ACCOUNT_SID', 'TWILIO_AUTH_TOKEN'),
    accountSid: read('TWILIO_ACCOUNT_SID'),
    authToken: read('TWILIO_AUTH_TOKEN'),
    fromNumber: read('TWILIO_FROM_NUMBER'),
    messagingServiceSid: read('TWILIO_MESSAGING_SERVICE_SID'),
  },

  // Transactional email
  sendgrid: {
    enabled: enabledIf('SENDGRID_API_KEY'),
    apiKey: read('SENDGRID_API_KEY'),
    fromEmail: read('SENDGRID_FROM_EMAIL'),
  },
  resend: {
    enabled: enabledIf('RESEND_API_KEY'),
    apiKey: read('RESEND_API_KEY'),
    fromEmail: read('RESEND_FROM_EMAIL'),
  },
  smtp: {
    enabled: enabledIf('SMTP_HOST', 'SMTP_USER', 'SMTP_PASS'),
    host: read('SMTP_HOST'),
    port: Number(read('SMTP_PORT') ?? '587'),
    user: read('SMTP_USER'),
    pass: read('SMTP_PASS'),
    fromEmail: read('SMTP_FROM_EMAIL'),
  },

  // Payments
  stripe: {
    enabled: enabledIf('STRIPE_SECRET_KEY'),
    secretKey: read('STRIPE_SECRET_KEY'),
    webhookSecret: read('STRIPE_WEBHOOK_SECRET'),
    publishableKey: read('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY'),
  },

  // AI
  anthropic: {
    enabled: enabledIf('ANTHROPIC_API_KEY'),
    apiKey: read('ANTHROPIC_API_KEY'),
    model: read('ANTHROPIC_MODEL') ?? 'claude-haiku-4-5',
  },
  openai: {
    enabled: enabledIf('OPENAI_API_KEY'),
    apiKey: read('OPENAI_API_KEY'),
    model: read('OPENAI_MODEL') ?? 'gpt-4o-mini',
  },

  // CRM / marketing platforms
  gohighlevel: {
    enabled: enabledIf('GHL_API_KEY'),
    apiKey: read('GHL_API_KEY'),
    locationId: read('GHL_LOCATION_ID'),
    webhookSecret: read('GHL_WEBHOOK_SECRET'),
  },
  dmChamp: {
    enabled: enabledIf('DMCHAMP_API_KEY'),
    apiKey: read('DMCHAMP_API_KEY'),
    webhookSecret: read('DMCHAMP_WEBHOOK_SECRET'),
  },

  // Error tracking
  sentry: {
    enabled: enabledIf('SENTRY_DSN'),
    dsn: read('SENTRY_DSN'),
    environment: read('SENTRY_ENVIRONMENT') ?? (process.env.NODE_ENV ?? 'development'),
  },

  // File storage — Supabase Storage by default (reuses existing project)
  storage: {
    // Always enabled; Supabase project is required for the brand anyway.
    provider: 'supabase' as const,
    bucket: read('SUPABASE_STORAGE_BUCKET') ?? 'philly',
  },
} as const

export type Integrations = typeof integrations
