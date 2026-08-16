-- Ontvangstbevestiging aan de aanvrager, plus een meetbare responstijd.
--
-- Tot nu toe hoorde alleen Juan iets van een lead (Telegram via lead-notify).
-- De aanvrager zelf kreeg niets. Deze migratie legt de administratie aan en
-- hangt er een tweede, losse dispatch aan naar de edge function
-- `lead-acknowledge`.
--
-- Bewust GESCHEIDEN van notify_new_lead: die keten werkt en is bewezen
-- (101 ms, gemeten 2026-08-16). Een tweede functie kan falen zonder de
-- interne melding mee te slepen, en andersom.

alter table marketing.leads
  add column if not exists acknowledged_at timestamptz,
  add column if not exists ack_channel     text;

alter table marketing.leads
  add column if not exists ack_seconds numeric generated always as (
    case when acknowledged_at is null then null
         else round(extract(epoch from (acknowledged_at - created_at))::numeric, 1)
    end
  ) stored;

comment on column marketing.leads.acknowledged_at is
  'Gezet zodra de aanvrager echt een bevestiging heeft gekregen. Blijft NULL als er niets verstuurd is, ook als het geprobeerd is — ack_channel draagt dan de reden. Niet gebruiken als "verwerkt"-vlag.';
comment on column marketing.leads.ack_channel is
  'Uitkomst laatste poging: "email" bij succes, anders "skipped:<reden>" of "failed:<reden>".';
comment on column marketing.leads.ack_seconds is
  'Responstijd in seconden, alleen gevuld bij een echte bevestiging.';

-- anon draagt INSERT op tabelniveau en dus op elke kolom. Zonder deze trigger
-- kan wie rechtstreeks naar PostgREST post een rij aanmaken die zich voordoet
-- als al beantwoord, en daarmee de responstijdcijfers vervuilen. Dit is een
-- harde weigering, geen conventie: de waarden worden overschreven.
create or replace function marketing.leads_ack_is_server_owned()
returns trigger
language plpgsql
as $$
begin
  new.acknowledged_at := null;
  new.ack_channel     := null;
  return new;
end;
$$;

revoke all on function marketing.leads_ack_is_server_owned() from public;

drop trigger if exists leads_ack_is_server_owned on marketing.leads;
create trigger leads_ack_is_server_owned
  before insert on marketing.leads
  for each row execute function marketing.leads_ack_is_server_owned();

-- Dispatcher. Spiegelt notify_new_lead, inclusief de eigenschap dat de
-- gedeelde vault-sleutel en de env-var van de functie in willekeurige volgorde
-- aangezet mogen worden zonder venster waarin aanroepen 401'en. Bewust
-- dezelfde sleutelnaam: één interne DB→functie-sleutel, niet twee.
--
-- Woont in `marketing` en niet in `public`, anders dan notify_new_lead. Die
-- staat in public omdat hij ouder is dan die afspraak en ook subscribers
-- bedient; deze bedient alleen marketing.leads.
create or replace function marketing.acknowledge_new_lead()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'net', 'vault'
as $$
declare
  fn_url text  := 'https://wbgiouuifqhasedncysw.supabase.co/functions/v1/lead-acknowledge';
  hdrs   jsonb := jsonb_build_object('Content-Type', 'application/json');
  secret text;
begin
  begin
    select decrypted_secret into secret
      from vault.decrypted_secrets
     where name = 'lead_notify_secret'
     limit 1;

    if secret is not null then
      hdrs := hdrs || jsonb_build_object('Authorization', 'Bearer ' || secret);
    end if;
  exception when others then
    secret := null; -- vault onleesbaar is geen reden om de bevestiging te laten vallen
  end;

  begin
    perform net.http_post(
      url                  := fn_url,
      headers              := hdrs,
      body                 := jsonb_build_object('record', to_jsonb(new)),
      timeout_milliseconds := 5000
    );
  exception when others then
    raise warning 'acknowledge_new_lead: dispatch mislukt voor lead % (%)', new.id, sqlerrm;
  end;

  return new;
end;
$$;

-- PostgreSQL geeft EXECUTE standaard aan PUBLIC. Bij een SECURITY DEFINER
-- functie is dat een open deur, ook al is dit type hier niet als RPC aan te
-- roepen. Dichtzetten is goedkoper dan erover nadenken.
revoke all on function marketing.acknowledge_new_lead() from public;

drop trigger if exists leads_acknowledge_new on marketing.leads;
create trigger leads_acknowledge_new
  after insert on marketing.leads
  for each row execute function marketing.acknowledge_new_lead();

-- De vraag die de dogfooding stelt: wat staat er nog open?
create index if not exists leads_open_ack_idx
  on marketing.leads (created_at desc)
  where acknowledged_at is null;

-- En de vraag die de verkoop stelt: hoe snel antwoorden we echt?
create or replace view marketing.lead_response
with (security_invoker = true) as
select
  count(*)                                           as leads,
  count(*) filter (where acknowledged_at is not null) as bevestigd,
  round(percentile_cont(0.5) within group (order by ack_seconds)::numeric, 1) as mediaan_seconden,
  round(percentile_cont(0.9) within group (order by ack_seconds)::numeric, 1) as p90_seconden,
  max(ack_seconds)                                   as traagste_seconden
from marketing.leads;

comment on view marketing.lead_response is
  'Responstijd over echte bevestigingen. security_invoker staat aan zodat de view geen leesrecht uitdeelt dat de onderliggende tabel niet geeft — marketing.leads is bewust schrijf-alleen voor anon.';

revoke all on marketing.lead_response from public, anon, authenticated;
grant select on marketing.lead_response to service_role;
