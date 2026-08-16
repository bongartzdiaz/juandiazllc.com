-- Toegepast op Supabase-project wbgiouuifqhasedncysw op 2026-08-16 als
-- migratie 20260816122755_beperk_anon_op_pai_suggestions_en_current_org_id.
--
-- Twee bevindingen uit de rechteninventarisatie van diezelfde dag dichtgezet.
--
-- 1. public.pai_ai_suggestions week af van zijn vijf broers en zussen.
--
--    pai_alerts, pai_appointments, pai_call_events, pai_calls en pai_leads
--    hebben nul policies en géén grants voor anon/authenticated: alleen
--    service_role komt erbij, en dat is ook de enige die ze gebruikt
--    (edge functions pai-vapi-webhook en pai-weekly-digest).
--
--    pai_ai_suggestions had wél grants én een policy
--    `SELECT TO authenticated USING (true)`. Elk ingelogd account las
--    daarmee alle rijen, ongeacht organisatie. Vandaag beperkt van omvang
--    (1 rij, 7 accounts, allemaal eigen domeinen), maar het breekt open
--    zodra signup opengaat of een klant een account krijgt. De tabel heeft
--    geen organization_id, dus er valt niets te scopen — hem gelijktrekken
--    met de rest is de juiste vorm.
--
--    Geen enkele repo verwijst naar deze tabel; service_role en postgres
--    houden hun grants, dus de wekelijkse digest blijft schrijven en jij
--    blijft meelezen via het dashboard.

drop policy if exists pai_auth_read_suggestions on public.pai_ai_suggestions;

revoke all on table public.pai_ai_suggestions from anon, authenticated;

-- 2. current_org_id() was aanroepbaar als RPC via /rest/v1/rpc/current_org_id.
--
--    Van de vier SECURITY DEFINER-functies in public is dit de enige die
--    PostgREST daadwerkelijk aanbiedt; de andere drie retourneren
--    `trigger` of `event_trigger` en worden daarom niet geëxporteerd.
--    Voor anon gaf hij altijd NULL terug (auth.uid() is null zonder sessie),
--    dus er lekte niets — maar een SECURITY DEFINER-functie open zetten
--    voor een rol die hem niet nodig heeft is gratis risico.
--
--    LET OP — authenticated houdt zijn EXECUTE, met opzet. Alle veertien
--    `phily *`-policies evalueren `organization_id = current_org_id()`, en
--    een policy-expressie draait met de rechten van de bevragende rol.
--    Trek je dit bij authenticated in, dan faalt élke DEUS-query met
--    permission denied. Postgres, service_role en de eigenaar houden hem
--    eveneens (die staan expliciet in de ACL, niet via PUBLIC).

revoke execute on function public.current_org_id() from public;
revoke execute on function public.current_org_id() from anon;

-- BEWUST NIET AANGERAAKT: handle_new_user(), notify_new_lead() en
-- rls_auto_enable().
--
-- De Supabase-linter meldt ze als "executable by anon", maar PostgREST
-- exporteert geen functies die `trigger`/`event_trigger` retourneren, dus
-- er is geen RPC om te sluiten. Wat er wél is: notify_new_lead() hangt als
-- trigger onder marketing.leads en marketing.subscribers, en die inserts
-- doet anon — dat is precies de bedoeling van een publiek formulier.
-- Aan de grants van die functie zitten om acht cosmetische linter-WARN's
-- weg te halen, met de leadopvang als inzet, is een slechte ruil.
