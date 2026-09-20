// Eén secret voor een edge function: uit de env-var als die staat, anders uit
// Vault via public.geheim_uit_vault() (SECURITY DEFINER, alleen service_role;
// migratie 20260920150000). Beslist 2026-09-20: beheer via de MCP, en die kan
// geen Edge-Function-secrets zetten — Vault wel, via SQL.
//
// Aanroepvorm op moduleniveau, met de env-lezing letterlijk in de aanroep
// zodat lib/env-voorbeeld.test.ts hem blijft zien:
//
//   const BREVO_API_KEY = await geheim(Deno.env.get('BREVO_API_KEY'), 'brevo_api_key')
//
// Top-level await draait één keer per instantie. Mislukt de Vault-lezing bij
// de koude start, dan is de waarde null voor die instantie — dezelfde uitkomst
// als een ontbrekende env-var, met een logregel, en de volgende koude start
// probeert opnieuw.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export type VaultLezer = (naam: string) => Promise<{ data: unknown; error: unknown }>

function standaardLezer(): VaultLezer {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return () => Promise.resolve({ data: null, error: 'SUPABASE_URL/SERVICE_ROLE_KEY ontbreekt' })
  const supabase = createClient(url, key)
  return async (naam) => {
    const { data, error } = await supabase.rpc('geheim_uit_vault', { naam })
    return { data, error }
  }
}

export async function geheim(
  uitEnv: string | null | undefined,
  vaultNaam: string,
  lees: VaultLezer = standaardLezer(),
): Promise<string | null> {
  if (uitEnv?.trim()) return uitEnv.trim()
  const { data, error } = await lees(vaultNaam)
  if (error) {
    console.error(`[geheim] vault-lezing van ${vaultNaam} mislukt —`, error)
    return null
  }
  const s = typeof data === 'string' ? data.trim() : ''
  if (!s) {
    console.warn(`[geheim] ${vaultNaam} staat niet in Vault en de env-var ontbreekt`)
    return null
  }
  return s
}
