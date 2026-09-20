-- Edge functions lezen hun secrets uit Vault in plaats van uit env-vars
-- (2026-09-20; zelfde ontwerp als diaz-editor migratie 20260920e). Reden:
-- dit project wordt via de Supabase-MCP beheerd, en die kan wel SQL maar geen
-- Edge-Function-secrets zetten. `lead_notify_secret` staat al sinds
-- 2026-08-16 in Vault (de trigger leest hem daar); wat ontbrak was de
-- functiekant, en die leest nu dezelfde rij — meetketen stap 3 sluit
-- daarmee zonder dashboard.
--
-- Het schema `vault` staat niet in de exposed schemas, dus een edge function
-- kan er niet rechtstreeks in lezen. Deze SECURITY DEFINER-wrapper staat in
-- `public` en is ALLEEN voor service_role — de sleutel die Supabase in elke
-- edge function injecteert. anon en authenticated krijgen niets, en dat is
-- hier extra belangrijk: `public` ís de exposed schema van PostgREST, dus een
-- vergeten revoke zou elk Vault-secret via /rest/v1/rpc/ lekken.
create or replace function public.geheim_uit_vault(naam text)
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select decrypted_secret from vault.decrypted_secrets where name = naam limit 1;
$$;

revoke execute on function public.geheim_uit_vault(text) from public, anon, authenticated;
grant execute on function public.geheim_uit_vault(text) to service_role;
