/* GET /api/realtime — Server-Sent Events stream (org-scoped) */

import { NextRequest, NextResponse } from 'next/server'
import { requireScope } from '@/lib/auth-helpers'
import { eventBus, presence, type RealtimeEvent } from '@/lib/realtime/event-bus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const scope = await requireScope()
  if (scope instanceof NextResponse) return scope

  const url = new URL(req.url)
  const path = url.searchParams.get('path') ?? undefined

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false

      const send = (event: RealtimeEvent | { type: 'ping' } | { type: 'ready' }) => {
        if (closed) return
        try {
          const payload = `data: ${JSON.stringify(event)}\n\n`
          controller.enqueue(encoder.encode(payload))
        } catch {
          closed = true
        }
      }

      // initial handshake + presence join
      send({ type: 'ready' })
      presence.heartbeat(scope.organizationId, scope.userId, scope.email ?? undefined, path)

      const unsubscribe = eventBus.subscribe(scope.organizationId, (event) => {
        // skip echoing this user's own presence heartbeats back to them
        if (event.type === 'presence.heartbeat' && event.userId === scope.userId) return
        send(event)
      })

      // keep-alive ping every 20s (most proxies kill idle connections at 30–60s)
      const ping = setInterval(() => send({ type: 'ping' }), 20_000)

      // presence heartbeat refresh every 30s
      const heartbeat = setInterval(() => {
        presence.heartbeat(scope.organizationId, scope.userId, scope.email ?? undefined, path)
      }, 30_000)

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(ping)
        clearInterval(heartbeat)
        unsubscribe()
        presence.leave(scope.organizationId, scope.userId)
        try { controller.close() } catch { /* ignore */ }
      }

      req.signal.addEventListener('abort', cleanup)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
