# Spec — DSAR streaming export (v1.0.x patch)

`/audit-full` chaos-test bevinding #1: `lib/philly/dsar.ts` bouwt het
volledige export-payload in memory voordat hij `Response.json()` retourneert.
Op grote orgs (10k+ contacts × 50+ activities × notes + audit log) loopt
het Node-process tegen een geheugenlimiet aan en crasht of timeoutet.

Customer #1 raakt dit niet (start klein), maar GDPR Art 15 deadline is
30 dagen — een klant met 12+ maanden activiteit kan dit makkelijk halen.
Fix moet ship'pen vóór customer-#1 + 12 maanden, dus **uiterlijk Q3 2026**.
Recommend: shippen als v1.0.1 patch binnen 4 weken na customer #1 launch.

## 1. Probleem statement

Huidige flow (`GET /api/me/export?scope=org`):

1. Route handler roept `buildExport(scope)` in `lib/philly/dsar.ts`
2. `buildExport()` doet ~30 sequentiële Prisma queries (`findMany` op
   alle PII-tabellen)
3. Resultaten gemerged in één groot JS-object
4. `Response.json(payload)` serialiseert naar string in memory
5. Response verzonden

### Geheugen-budget per record-type

Empirisch gemeten op een test-dataset (100 contacts, 500 activities):

| Record type | Avg JSON size per row | Org cap |
|---|---|---|
| Contact | 800 B | 50,000 (40 MB) |
| Activity | 600 B | 200,000 (120 MB) |
| AuditLog | 400 B | 365 dagen × ~50/dag = ~18,000 (7 MB) |
| Deal | 1,200 B | 10,000 (12 MB) |
| Note | 2,000 B (truncated) | 50,000 (100 MB) |
| EmailMessage | 4,000 B (kan groot zijn) | 100,000 (400 MB) |

**Worst-case scenario**: org met 12 maanden actief gebruik → ~700 MB JSON
in memory. Vercel function memory limit is 1024 MB → margin te dun.
Hetzner box met PM2 cluster mode geeft per worker ~200 MB → onmiddelijke OOM.

## 2. Drie design opties

### Optie A — In-memory chunked

Bouw payload nog steeds in memory, maar stream naar response in chunks
van ~10 MB. Vermindert peak-memory NIET (alle data nog steeds geladen)
maar voorkomt JSON.stringify spikes.

```typescript
const stream = new ReadableStream({
  async start(controller) {
    controller.enqueue(`{"export_version":"1.2.0","records":[`)
    let first = true
    for await (const chunk of streamRecords(scope)) {
      if (!first) controller.enqueue(',')
      controller.enqueue(JSON.stringify(chunk))
      first = false
    }
    controller.enqueue(']}')
    controller.close()
  }
})
return new Response(stream, { headers: { 'Content-Type': 'application/json' } })
```

**Pro**: minimale changes, klant krijgt nog steeds 1 JSON file.
**Con**: peak-memory blijft hoog. Geen fix voor de werkelijke OOM.
**Verdict**: niet voldoende.

### Optie B — NDJSON streaming

Stream één JSON-object per regel. Cursor-based fetch uit Prisma met
`.findMany({ take: 500, cursor: ... })`. Schrijf elk batch direct naar
response stream.

```typescript
// Format: { type: "Contact", data: {...} }\n
//         { type: "Activity", data: {...} }\n
const stream = new ReadableStream({
  async start(controller) {
    const enc = new TextEncoder()
    for (const tableSpec of TABLES) {
      let cursor: string | undefined
      while (true) {
        const batch = await fetchBatch(tableSpec, cursor, 500)
        if (batch.length === 0) break
        for (const row of batch) {
          controller.enqueue(enc.encode(
            JSON.stringify({ type: tableSpec.name, data: row }) + '\n'
          ))
        }
        cursor = batch[batch.length - 1].id
      }
    }
    controller.close()
  }
})
return new Response(stream, {
  headers: {
    'Content-Type': 'application/x-ndjson',
    'Content-Disposition': 'attachment; filename="dsar-export.ndjson"',
  }
})
```

**Pro**: constant memory (~5 MB regardless of org size). Standard format
voor data-export pipelines. Klant kan met `jq` of `ndjson-cli` parsen.
**Con**: niet één klikbaar JSON object — klant moet NDJSON kunnen lezen.
Wijzigt de export-shape contract (versie 2.0.0).
**Verdict**: technisch sterkst, maar contract-break.

### Optie C — ZIP-archive met multi-file

Schrijf één file per tabel naar ZIP-stream. Elke file is normale JSON.
Klant download `.zip`, extract naar map, ziet `contacts.json`,
`activities.json`, etc.

```typescript
import archiver from 'archiver'

const archive = archiver('zip', { zlib: { level: 6 } })
const stream = new ReadableStream({
  start(controller) {
    archive.on('data', (chunk) => controller.enqueue(chunk))
    archive.on('end', () => controller.close())
  }
})

archive.append(
  JSON.stringify({ export_version: '2.0.0', generatedAt: now }),
  { name: 'manifest.json' }
)

for (const tableSpec of TABLES) {
  archive.append(
    streamTable(tableSpec, scope), // Readable stream per table
    { name: `${tableSpec.name}.json` }
  )
}
await archive.finalize()
return new Response(stream, {
  headers: {
    'Content-Type': 'application/zip',
    'Content-Disposition': 'attachment; filename="dsar-export.zip"',
  }
})
```

**Pro**: klant-vriendelijke output (multi-file structure). Compression
verlaagt download grootte ~70%. Per-tabel files kunnen incrementeel
gestreamed worden.
**Con**: vereist `archiver` dependency. Streaming-write naar ZIP is
trickier dan NDJSON. Manifest-file bevat metadata.
**Verdict**: beste klant-UX, mid-tier complexity.

## 3. Aanbeveling

**Optie C (ZIP-archive)** met `export_version: 2.0.0`.

Trade-off: kleine deps-toename (`archiver` ~150 KB) tegen significant
betere customer-UX (klant krijgt duidelijke folder-structuur, kan
inhoud individueel inspecteren). NDJSON is technisch eleganter maar
de meeste klanten weten niet wat het is.

Backwards-compat: behoud `?format=json` query-param. Default = ZIP.
`?format=json` retourneert oude single-JSON shape (met hard cap 50 MB
en een `Retry-After` 503 als groter — zie sectie 5).

## 4. API contract

### Response — default (`?format=zip` of geen param)

```http
GET /philly/api/me/export?scope=org
Accept: application/zip

200 OK
Content-Type: application/zip
Content-Disposition: attachment; filename="dsar-export-{orgId}-{date}.zip"
Transfer-Encoding: chunked
```

ZIP inhoud:
- `manifest.json` — `{ export_version, generatedAt, scope, recordCounts }`
- `contacts.json` — `[{...}, {...}]`
- `activities.json`
- `deals.json`
- `notes.json`
- `audit-log.json`
- ... per tabel uit huidige `dsar.ts`

### Response — legacy (`?format=json`)

```http
GET /philly/api/me/export?scope=org&format=json
Accept: application/json

# Org < 50 MB:
200 OK
Content-Type: application/json
{ "export_version": "1.2.0", ... }

# Org >= 50 MB:
503 Service Unavailable
Retry-After: 60
{ "error": "export_too_large", "use_format": "zip" }
```

### Async export (toekomstig — niet in v1.0.1)

Voor enterprise-klanten met >500 MB orgs: enqueue job, retourneer
job-ID, klant pollt `/api/me/export/jobs/{id}` voor download-URL.
Niet in eerste implementatie; documenteer als v1.2 als customer
behoefte aantoont.

## 5. Backwards compat

Klant-impact bij switch naar ZIP-default:

| Klant-scenario | Pre-fix | Post-fix |
|---|---|---|
| < 1 MB org, frontend `await res.json()` | werkt | breekt — Response is binary ZIP |
| Curl/wget download | werkt (krijgt JSON file) | werkt (krijgt ZIP file) |
| Periodieke export voor backup | werkt | hoger: kleinere files, leesbaar |

Mitigatie: frontend update gelijktijdig met backend.
`/philly/settings/privacy` UI doet nu `await res.blob()` en
`URL.createObjectURL()` — werkt voor zowel JSON als ZIP.

Email naar klant met live `/format=json` flow: stuur deprecation-notice
naar privacy@deus-customers met 30-dagen sunset deadline.

## 6. Test scenarios

### Klein (10 contacts, 50 activities)
- Verwacht: ZIP <100 KB, < 200 ms response start
- Verifieer: `manifest.json.recordCounts.contacts === 10`

### Medium (1k contacts, 5k activities, 365 dagen audit)
- Verwacht: ZIP 5-10 MB, < 2 s eerste byte, < 30 s totaal
- Verifieer: peak memory < 50 MB (via Sentry profiling)

### Groot (50k contacts, 200k activities, full audit)
- Verwacht: ZIP 50-200 MB, < 5 s eerste byte, < 5 min totaal
- Verifieer: memory blijft < 100 MB throughout (constant streaming)

### Edge — timeout
- Vercel function timeout: 60 s standaard, 300 s op Pro plan
- Hetzner: geen timeout, maar Caddy idle-timeout 30 s
- Test: org groter dan timeout-budget krijgt 504. Mitigatie: async
  export (toekomstig)

### Edge — abort midstream
- Klant sluit browser na 30 s
- Verwacht: stream sluit cleanly, geen zombie-Prisma-cursors
- Verifieer: `controller.close()` wordt aangeroepen op AbortSignal

## 7. Implementation outline

### Files to add

```
lib/philly/dsar/
├── stream-export.ts        # nieuwe ZIP-streaming versie
├── tables.ts               # TABLE_SPECS — wat exporteren we per tabel
└── stream-export.test.ts   # vitest met memory-profiling helpers

app/philly/api/me/export/route.ts  # update: format=zip default, legacy fallback
```

### Files to modify

```
lib/philly/dsar.ts          # rename naar legacy-build-export.ts; behoud
                            # voor format=json fallback
package.json                # + "archiver": "^7.0.0"
```

### Functies

```typescript
// lib/philly/dsar/stream-export.ts
export async function streamDsarZip(opts: {
  scope: AuthScope
  exportScope: 'user' | 'org'
  signal?: AbortSignal
}): Promise<ReadableStream>

// lib/philly/dsar/tables.ts
export const TABLE_SPECS: TableSpec[] = [
  { name: 'contacts', model: 'contact', orgScoped: true, redact: redactContact },
  { name: 'activities', model: 'activity', orgScoped: true },
  // ... per tabel
]
```

### Effort estimate

- Day 1: TABLE_SPECS + streamDsarZip skeleton (4u)
- Day 2: per-tabel streaming + redact functions (6u)
- Day 3: tests (klein/medium/groot via fixture-orgs) (4u)
- Day 4: backwards-compat fallback + UI update (3u)
- Day 5: Sentry profiling + optimization (2u)
- **Totaal: ~3 werkdagen**

### Risk / unknowns

- `archiver` ZIP streaming gedrag onder Vercel Edge Runtime niet getest
  (mogelijk Node-runtime forcing). Mitigatie: forceer `runtime: 'nodejs'`
  op de route.
- Prisma cursor-pagination kan instabiel zijn bij concurrent writes.
  Mitigatie: snapshot-isolatie via Postgres `SET TRANSACTION SNAPSHOT`
  of accepteer "best-effort" snapshot voor DSAR (klant verwacht punt-in-tijd).
- Per-tabel ordering belangrijk voor referential integrity bij re-import?
  Niet relevant voor DSAR (klant krijgt platte JSON, geen re-import gepland).

---

**Volgende stap**: bevestigen scope met operator (NL/DE/ES klanten? export
in welke timezone?), dan ticket aanmaken voor Day 1 implementation.
