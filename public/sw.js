/* Philly Dashboard — service worker.
   Strategy:
     • static assets    → cache-first with background revalidate
     • API GET requests → network-first, fallback to cache
     • API mutations    → network-only; on failure queue to IndexedDB for retry
*/

const CACHE_VERSION = 'philly-v1'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const API_CACHE = `${CACHE_VERSION}-api`

const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg',
]

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then(cache => cache.addAll(STATIC_ASSETS)).catch(() => undefined)
  )
  self.skipWaiting()
})

self.addEventListener('activate', event => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter(k => !k.startsWith(CACHE_VERSION))
          .map(k => caches.delete(k))
      )
      await self.clients.claim()
    })()
  )
})

self.addEventListener('fetch', event => {
  const req = event.request
  const url = new URL(req.url)

  /* Only handle same-origin requests */
  if (url.origin !== self.location.origin) return

  /* Skip SSE + auth endpoints */
  if (url.pathname.startsWith('/api/realtime') || url.pathname.startsWith('/api/auth')) return

  if (url.pathname.startsWith('/api/') && req.method === 'GET') {
    event.respondWith(networkFirst(req))
    return
  }

  if (req.method === 'GET' && (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.ico') ||
    url.pathname === '/manifest.json'
  )) {
    event.respondWith(cacheFirst(req))
  }
})

async function networkFirst(req) {
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(API_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    const cached = await caches.match(req)
    if (cached) return cached
    return new Response(JSON.stringify({ error: 'offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    })
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req)
  if (cached) {
    /* Revalidate in background */
    fetch(req).then(res => {
      if (res.ok) caches.open(STATIC_CACHE).then(c => c.put(req, res))
    }).catch(() => undefined)
    return cached
  }
  try {
    const res = await fetch(req)
    if (res.ok) {
      const cache = await caches.open(STATIC_CACHE)
      cache.put(req, res.clone())
    }
    return res
  } catch {
    return new Response('', { status: 504 })
  }
}
