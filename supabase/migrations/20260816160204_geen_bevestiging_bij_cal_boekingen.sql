-- marketing.leads heeft twee ingangen, niet één. Naast het contactformulier
-- schrijft ook `app/api/cal/route.ts` een rij weg bij een boeking via cal.com
-- (source 'cal_15min').
--
-- Die mensen krijgen hun bevestiging al van cal.com, en de tekst van
-- lead-acknowledge klopt voor hen niet: die belooft "het antwoord komt van
-- mij, binnen 24 uur" aan iemand die al een gesprek in de agenda heeft staan.
--
-- De uitsluiting zit in de WHEN-clausule en niet in de edge function, zodat er
-- voor deze rijen geen HTTP-aanroep wordt gedaan die toch niets mag doen.
-- lead-notify blijft ongemoeid: een boeking mag Juan wél melden.

drop trigger if exists leads_acknowledge_new on marketing.leads;

create trigger leads_acknowledge_new
  after insert on marketing.leads
  for each row
  when (coalesce(new.source, '') not like 'cal\_%')
  execute function marketing.acknowledge_new_lead();
