/* POST /api/sms/webhook — Twilio inbound SMS/WhatsApp webhook.
   Twilio posts application/x-www-form-urlencoded with fields:
     From, To, Body, MessageSid, AccountSid, MessagingServiceSid, etc.

   We persist as an inbound SmsMessage. We don't require auth — but we
   do verify the request is from Twilio via X-Twilio-Signature if
   TWILIO_AUTH_TOKEN is configured. */

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { getAuthPrisma } from '@/lib/philly/auth'
import { enforceRateLimit, clientIp } from '@/lib/philly/rate-limit'
import { hashPhone } from '@/lib/philly/blind-index'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function verifyTwilioSignature(url: string, params: Record<string, string>, signature: string, authToken: string) {
  // Twilio signature: HMAC-SHA1(authToken, url + sorted params concatenated)
  const sorted = Object.keys(params).sort().map(k => k + params[k]).join('')
  const data = url + sorted
  const hmac = crypto.createHmac('sha1', authToken).update(data).digest('base64')
  try {
    return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature))
  } catch {
    return false
  }
}

export async function POST(req: NextRequest) {
  // Per-IP rate limit so a flood of unsigned/malformed posts can't DoS us
  // before we've even verified the signature. 60 req/min per source.
  const limited = enforceRateLimit(`sms:webhook:${clientIp(req)}`, { capacity: 60, refillPerSec: 1 })
  if (limited) return limited

  const ct = req.headers.get('content-type') ?? ''
  if (!ct.includes('application/x-www-form-urlencoded')) {
    return NextResponse.json({ error: 'Expected form-urlencoded' }, { status: 400 })
  }

  const rawText = await req.text()
  const params = Object.fromEntries(new URLSearchParams(rawText))

  // Signature verification — mandatory in production, best-effort in dev.
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const signature = req.headers.get('x-twilio-signature')
  const isProd = process.env.NODE_ENV === 'production'

  if (isProd) {
    if (!authToken) {
      // Misconfiguration — fail closed rather than accept unsigned Twilio traffic
      console.error('[sms/webhook] TWILIO_AUTH_TOKEN not set in production')
      return NextResponse.json({ error: 'Webhook misconfigured' }, { status: 500 })
    }
    if (!signature) {
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }
    if (!verifyTwilioSignature(req.url, params, signature, authToken)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else if (authToken && signature) {
    // Dev: verify when both are present, otherwise allow for local testing
    if (!verifyTwilioSignature(req.url, params, signature, authToken)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  }

  const From = params.From ?? ''
  const To = params.To ?? ''
  const Body = params.Body ?? ''
  const Sid = params.MessageSid ?? params.SmsSid

  const isWhatsApp = From.startsWith('whatsapp:') || To.startsWith('whatsapp:')

  // Find which org owns this number. Match by any existing outbound SMS
  // to/from this To number, else by an Integration metadata entry.
  const prisma = getAuthPrisma()
  const cleanTo = To.replace(/^whatsapp:/, '')

  const prior = await prisma.smsMessage.findFirst({
    where: {
      OR: [
        { fromNumber: cleanTo },
        { fromNumber: To },
      ],
    },
    orderBy: { createdAt: 'desc' },
    select: { organizationId: true },
  })

  if (!prior) {
    // Unknown destination — accept silently so Twilio doesn't retry
    return new NextResponse('<Response></Response>', {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    })
  }

  // Try to map incoming number to a known contact via the
  // blind-index hash (Bundle P). The plaintext `phone` column is
  // encrypted with a random IV so direct equality no longer works.
  const cleanFrom = From.replace(/^whatsapp:/, '')
  const phoneHash = hashPhone(cleanFrom) ?? hashPhone(From)
  const contact = phoneHash
    ? await prisma.contact.findFirst({
        where: { organizationId: prior.organizationId, phoneHash },
        select: { id: true },
      })
    : null

  await prisma.smsMessage.create({
    data: {
      organizationId: prior.organizationId,
      contactId: contact?.id ?? null,
      direction: 'inbound',
      channel: isWhatsApp ? 'whatsapp' : 'sms',
      fromNumber: From,
      toNumber: To,
      body: Body,
      status: 'received',
      providerSid: Sid ?? null,
    },
  })

  return new NextResponse('<Response></Response>', {
    status: 200,
    headers: { 'Content-Type': 'text/xml' },
  })
}
