---
name: realtime-feature
description: Bouw een realtime feature met Supabase Realtime (Postgres changes, broadcast, presence) — channel-setup, subscribe, optimistic UI, reconnect-handling, RLS-aware. Werkt voor PT (live ticket-updates), HMB Dashboard (live KPI), funnel-app (live activity feed). Gebruik wanneer Juan vraagt "live updates voor X" of "wie is online".
trigger: /realtime-feature
---

# /realtime-feature

Realtime via Supabase. Drie modes: **postgres_changes** (DB inserts/updates), **broadcast** (custom events), **presence** (wie is online).

## Usage
```
/realtime-feature <doel> --mode <changes|broadcast|presence>
/realtime-feature <doel> --table <table-naam>      # voor changes mode
/realtime-feature <doel> --filter "<csv>"          # bv "user_id=eq.<id>"
/realtime-feature <doel> --stack <pt|hmb|philly>
```

## Setup eenmalig per project

```sql
-- 1. Enable realtime op de tabel
ALTER PUBLICATION supabase_realtime ADD TABLE public.tickets;

-- 2. RLS moet correct zijn — realtime respect RLS (alleen rows die user mag SELECTen)
-- (zie /db-migration voor RLS-patterns)
```

## Mode 1: Postgres Changes (DB-trigger UI updates)

**Use-case:** ticket-systeem PT — als nieuwe message binnenkomt, alle online viewers zien 'm direct.

```tsx
"use client";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { type RealtimeChannel } from "@supabase/supabase-js";

export function useTicketMessages(ticketId: string) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    let channel: RealtimeChannel;

    async function setup() {
      // Initial fetch
      const { data } = await supabase
        .from("messages")
        .select("*")
        .eq("ticket_id", ticketId)
        .order("created_at");
      if (data) setMessages(data);

      // Subscribe to changes
      channel = supabase
        .channel(`ticket:${ticketId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          (payload) => {
            setMessages((prev) => [...prev, payload.new as Message]);
          }
        )
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "messages",
            filter: `ticket_id=eq.${ticketId}`,
          },
          (payload) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === payload.new.id ? (payload.new as Message) : m))
            );
          }
        )
        .subscribe((status) => {
          setConnected(status === "SUBSCRIBED");
        });
    }
    setup();

    return () => {
      void supabase.removeChannel(channel!);
    };
  }, [ticketId]);

  return { messages, connected };
}
```

## Mode 2: Broadcast (custom events tussen clients)

**Use-case:** typing-indicator, "user X is editing", notification-toasts.

```tsx
const channel = supabase.channel(`room:${roomId}`);

channel
  .on("broadcast", { event: "typing" }, (payload) => {
    setTypingUsers((u) => [...u, payload.payload.user_id]);
  })
  .subscribe();

// Send
channel.send({ type: "broadcast", event: "typing", payload: { user_id: me.id } });
```

## Mode 3: Presence (wie is online)

```tsx
const channel = supabase.channel(`presence:${roomId}`, {
  config: { presence: { key: me.id } },
});

channel
  .on("presence", { event: "sync" }, () => {
    const state = channel.presenceState();
    setOnlineUsers(Object.keys(state));
  })
  .on("presence", { event: "join" }, ({ key }) => {
    console.log(`User ${key} joined`);
  })
  .on("presence", { event: "leave" }, ({ key }) => {
    console.log(`User ${key} left`);
  })
  .subscribe(async (status) => {
    if (status === "SUBSCRIBED") {
      await channel.track({ user_id: me.id, online_at: new Date().toISOString() });
    }
  });
```

## Hard rules

### RLS first
- Realtime respect RLS — als user geen SELECT heeft op een row, geen update gepushed
- Test: log in als role-met-geen-toegang → moet geen events krijgen

### Reconnect-handling
- Supabase client herstelt automatisch bij netwerk-loss
- **Maar:** bij langer offline kunnen events MISSEN — re-fetch initial state na reconnect

```tsx
.subscribe(async (status) => {
  if (status === "SUBSCRIBED") {
    // re-fetch initial state om missed events te dekken
    const { data } = await supabase.from("messages").select("*").eq("ticket_id", ticketId);
    if (data) setMessages(data);
  }
});
```

### Cleanup
- ALTIJD `supabase.removeChannel(channel)` in cleanup — anders memory leak
- 1 channel per "room" — niet 1 per component-instance

### Optimistic UI
Bij user-action (post message): toon direct, server push later confirmeert (of rolt terug).

```tsx
async function postMessage(text: string) {
  const tempId = crypto.randomUUID();
  setMessages((prev) => [...prev, { id: tempId, text, pending: true } as Message]);

  const { data, error } = await supabase.from("messages").insert({ text, ticket_id: ticketId }).select().single();
  if (error) {
    setMessages((prev) => prev.filter((m) => m.id !== tempId));
    showError();
    return;
  }
  // Realtime-event komt vanzelf, dedup op id
}
```

### Performance
- Filter zo specifiek mogelijk (`filter: "user_id=eq..."`) — anders krijgt iedereen alle events
- Max 100 channels per client — gebruik 1 channel met meerdere subs als veel rooms
- Pas op met grote payloads — realtime is niet voor 10MB-rows

## Stack-specifiek

### PT (Vite)
- Channel-setup in custom hook (`useTicketRealtime.ts`)
- Combineer met TanStack Query: invalidateQueries op event
```tsx
.on("postgres_changes", { ... }, (payload) => {
  queryClient.invalidateQueries({ queryKey: ["tickets", ticketId] });
});
```

### Next.js (HMB Dashboard, Philly)
- Realtime is ALTIJD client-side — server components werken niet
- Wrap in `"use client"` component, mount in server-rendered layout

## Combineer met
- `/db-migration` — voor `ALTER PUBLICATION` setup
- `/auth-flow` — RLS-context werkt alleen als auth correct
- `/ui-component` — typing-indicator, presence-avatars
- `/test-write` — realtime-tests met mocked channel
