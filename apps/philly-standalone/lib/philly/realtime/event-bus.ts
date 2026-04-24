/* In-process pub/sub event bus for Server-Sent Events.
   Single-instance (dev/small-prod) only. For multi-instance,
   swap this for Redis pub/sub or Postgres LISTEN/NOTIFY. */

export type RealtimeEvent =
  | { type: 'entity.created'; entity: string; entityId: string; orgId: string; userId?: string; data?: unknown }
  | { type: 'entity.updated'; entity: string; entityId: string; orgId: string; userId?: string; data?: unknown }
  | { type: 'entity.deleted'; entity: string; entityId: string; orgId: string; userId?: string }
  | { type: 'notification'; orgId: string; userId?: string; data: { title: string; body?: string; link?: string } }
  | { type: 'presence.join'; orgId: string; userId: string; name?: string }
  | { type: 'presence.leave'; orgId: string; userId: string }
  | { type: 'presence.heartbeat'; orgId: string; userId: string; name?: string; path?: string }
  | { type: 'custom'; orgId: string; channel: string; data?: unknown }

type Listener = (event: RealtimeEvent) => void

class EventBus {
  private listeners = new Map<string, Set<Listener>>()

  subscribe(orgId: string, listener: Listener): () => void {
    if (!this.listeners.has(orgId)) this.listeners.set(orgId, new Set())
    const set = this.listeners.get(orgId)!
    set.add(listener)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(orgId)
    }
  }

  publish(event: RealtimeEvent): void {
    const set = this.listeners.get(event.orgId)
    if (!set) return
    for (const listener of set) {
      try { listener(event) } catch { /* swallow — one subscriber shouldn't break others */ }
    }
  }

  subscriberCount(orgId: string): number {
    return this.listeners.get(orgId)?.size ?? 0
  }
}

// Ensure singleton across hot reloads in dev
const globalAny = globalThis as unknown as { __philly_bus?: EventBus }
export const eventBus: EventBus = globalAny.__philly_bus ?? (globalAny.__philly_bus = new EventBus())

// ── Presence tracker (org-scoped) ──

interface PresenceEntry {
  userId: string
  name?: string
  path?: string
  lastSeen: number
}

class PresenceTracker {
  private byOrg = new Map<string, Map<string, PresenceEntry>>()
  private readonly TTL_MS = 45_000

  heartbeat(orgId: string, userId: string, name?: string, path?: string): void {
    if (!this.byOrg.has(orgId)) this.byOrg.set(orgId, new Map())
    const inner = this.byOrg.get(orgId)!
    const existing = inner.get(userId)
    const isNew = !existing
    inner.set(userId, { userId, name, path, lastSeen: Date.now() })
    this.gc()
    eventBus.publish({
      type: isNew ? 'presence.join' : 'presence.heartbeat',
      orgId, userId, name, path,
    })
  }

  leave(orgId: string, userId: string): void {
    this.byOrg.get(orgId)?.delete(userId)
    eventBus.publish({ type: 'presence.leave', orgId, userId })
  }

  list(orgId: string): PresenceEntry[] {
    this.gc()
    return Array.from(this.byOrg.get(orgId)?.values() ?? [])
  }

  private gc(): void {
    const now = Date.now()
    for (const [orgId, inner] of this.byOrg) {
      for (const [userId, entry] of inner) {
        if (now - entry.lastSeen > this.TTL_MS) {
          inner.delete(userId)
          eventBus.publish({ type: 'presence.leave', orgId, userId })
        }
      }
      if (inner.size === 0) this.byOrg.delete(orgId)
    }
  }
}

const globalPresence = globalThis as unknown as { __philly_presence?: PresenceTracker }
export const presence: PresenceTracker = globalPresence.__philly_presence ?? (globalPresence.__philly_presence = new PresenceTracker())
