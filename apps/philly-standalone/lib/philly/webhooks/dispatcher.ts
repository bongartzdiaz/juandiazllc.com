/* ---------------------------------------------------------------
   Outbound webhook dispatcher
   - Iterates all enabled webhooks for an org
   - Checks event filter (events array containing '*' or the event name)
   - POSTs JSON with HMAC-SHA256 signature header
   - Records delivery in WebhookDelivery with response status
   - Retries up to 2 times on 5xx / network errors (total 3 attempts)
   --------------------------------------------------------------- */

import crypto from 'crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { unwrapWebhookSecret } from '@/lib/philly/webhooks/secrets'

interface DispatchOptions {
  /** Direct URL to POST to (skips lookup). Used by automation callWebhook action. */
  url?: string
  payload?: unknown
}

function sign(body: string, secret: string): string {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function postOnce(url: string, body: string, signature: string | null): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'Philly-Webhook/1.0',
  }
  if (signature) headers['X-Philly-Signature'] = `sha256=${signature}`
  return fetch(url, { method: 'POST', headers, body })
}

async function deliverWithRetry(url: string, body: string, secret: string | null): Promise<{ status: number; response: string }> {
  let attempt = 0
  const signature = secret ? sign(body, secret) : null
  let lastStatus = 0
  let lastText = ''
  while (attempt < 3) {
    try {
      const res = await postOnce(url, body, signature)
      lastStatus = res.status
      lastText = (await res.text().catch(() => '')).slice(0, 2000)
      if (res.status < 500) break
    } catch (err) {
      lastStatus = 0
      lastText = err instanceof Error ? err.message : 'network error'
    }
    attempt++
    if (attempt < 3) await new Promise(r => setTimeout(r, 300 * attempt))
  }
  return { status: lastStatus, response: lastText }
}

export async function dispatchWebhookEvent(
  organizationId: string,
  event: string,
  payload: unknown,
  opts: DispatchOptions = {},
): Promise<void> {
  try {
    const prisma = getAuthPrisma()

    // Direct-call mode (from automation action)
    if (opts.url) {
      const body = JSON.stringify({ event, payload: opts.payload ?? payload, timestamp: new Date().toISOString() })
      const result = await deliverWithRetry(opts.url, body, null)
      // Log under a synthetic webhook if possible (skipped — just console)
      console.log(`[webhook:direct] ${opts.url} → ${result.status}`)
      return
    }

    const webhooks = await prisma.webhook.findMany({
      where: { organizationId, enabled: true },
    })
    if (webhooks.length === 0) return

    const body = JSON.stringify({
      event,
      organizationId,
      payload,
      timestamp: new Date().toISOString(),
    })

    await Promise.all(webhooks.map(async (wh: any) => {
      let events: string[] = []
      try { events = JSON.parse(wh.events || '[]') } catch {}
      if (!events.includes('*') && !events.includes(event)) return

      // Decrypt the stored secret (encrypted at rest via lib/philly/crypto.ts).
      // unwrapWebhookSecret falls back to plaintext for legacy rows; null
      // means decryption failed and the secret is unusable — skip delivery
      // rather than send unsigned.
      const plaintextSecret = unwrapWebhookSecret(wh.secret)
      if (!plaintextSecret) return
      const delivery = await deliverWithRetry(wh.url, body, plaintextSecret)
      await prisma.webhookDelivery.create({
        data: {
          webhookId: wh.id,
          event,
          payload: body.slice(0, 65000),
          statusCode: delivery.status || null,
          response: delivery.response,
        },
      }).catch(() => {})
    }))
  } catch (err) {
    console.error('[webhooks] dispatch failed:', err)
  }
}
