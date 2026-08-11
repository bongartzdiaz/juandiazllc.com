/* Postgres, rechtstreeks.
   ───────────────────────────────────────────────────────────────────────────
   Deze site schreef tot 2026-08-11 via Supabase' REST-laag (PostgREST). Dat
   werkte, maar bracht een hoop mee dat we niet gebruikten: RLS-policies om
   `anon` te laten inserten, een schema dat in `pgrst.db_schemas` moest staan,
   een publieke apikey in de bundel, en een API die stil op 402 kan gaan als
   een ánder project in dezelfde organisatie zijn opslagquotum overschrijdt —
   wat op 2026-08-06 vijf dagen lang precies is gebeurd.

   Wat deze site werkelijk doet is rijen wegschrijven in twee tabellen, vanaf
   de server. Daar is een connection string genoeg voor.

   POOLING. Gebruik de connection string mét `-pooler` erin. Serverless
   functies openen veel korte verbindingen; zonder de pooler van Neon loop je
   tegen het verbindingsplafond aan zodra er iets van verkeer is. De pool
   hieronder staat daarom bewust klein: het echte poolen gebeurt aan de
   andere kant.

   De module-scope pool wordt hergebruikt zolang de lambda warm is. Dat is
   het patroon dat Neon zelf aanraadt — een pool per invocatie zou elke keer
   opnieuw verbinding maken. */

import { Pool, type QueryResultRow } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (pool) return pool;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    // Expliciet falen. Een stille undefined zou hier een verbinding met
    // localhost opleveren en een foutmelding die nergens naar wijst.
    throw new Error("DATABASE_URL is niet gezet");
  }

  pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
  });

  return pool;
}

/** Voert een query uit en geeft de rijen terug. Altijd met parameters —
 *  `$1`, `$2` — nooit met stringconcatenatie. */
export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/** Eerste rij of `null`. Voor lookups waar hooguit één rij verwacht wordt. */
export async function queryOne<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/** Postgres-foutcode voor een schending van een unique-constraint.
 *  `subscribers.email` is uniek: een tweede aanmelding met hetzelfde adres is
 *  geen fout maar een bevestiging, en hoort de bezoeker niet te verontrusten. */
export const UNIQUE_VIOLATION = "23505";

export function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && "code" in err &&
    (err as { code?: string }).code === UNIQUE_VIOLATION;
}
