#!/usr/bin/env bash
# Backlink-inventaris over de eigen domeinen — alleen GET, raakt niets.
#
# WAT DIT MEET. Voor elk adres in de lijst hieronder: geeft de pagina 200,
# hoeveel keer staat `juandiazllc.com` in de HTML (een link of een kale
# vermelding), en hoeveel keer staat de naam van Juan erin zonder link. Dat is
# de hele "owned network"-laag uit docs/backlink-strategie.md, in één run.
#
# WAAROM EEN SCRIPT EN GEEN TABEL. Ahrefs geeft "Insufficient plan" op elk
# endpoint, ook het gratis DR-endpoint (gemeten 2026-09-22), en Search Console
# is niet geverifieerd. Dit is de enige meting die vandaag wél kan, en hij is
# herhaalbaar: draai hem vóór en ná een aanpassing op een van de sites.
#
# WAT HET NIET MEET. Links van domeinen die niet van Juan zijn. Daarvoor is
# Search Console (Links-rapport) de bron zodra de property geverifieerd is.
#
# Gebruik:  bash scripts/backlink-inventory.sh
# Exit 0 altijd; de uitkomst is de tabel, geen poort. Negatieve controle
# onderaan: een adres dat zeker níet naar ons linkt, zodat "0" leesbaar is
# als meting en niet als kapotte grep.
set -u

UA="juandiazllc-backlink-inventory/1 (read-only GET; https://juandiazllc.com)"
DOEL='juandiazllc\.com'
NAAM='juan diaz\|juan stefan\|bongartz'

# adres|eigenaar-label — één regel per pagina die redelijkerwijs kan linken.
ADRESSEN='
https://lucenai.eu/about|Lucen AI (Juan is co-founder/CTO)
https://diazatlas.com/about|Diaz Atlas (eigen product)
https://diazatlas.com|Diaz Atlas home
https://voltafy.nl|Voltafy (venture)
https://performancetracker.nl|Performance Tracker (venture)
https://salderingsregeling2027.nl|salderingsregeling2027.nl (eigen contentsite)
https://besparenbelgie.online|BesparenBelgie (eigen contentsite)
https://helpmijbesparen.nl|Help Mij Besparen (klant van Kompas Agency — vragen, niet zetten)
https://philanthropyai.eu|PhilanthropyAI (301 naar lucenai.eu, gemeten 2026-09-22)
https://example.com|NEGATIEVE CONTROLE — hoort 0 en 0 te geven
'

printf '%-58s %-6s %-14s %-12s %s\n' "adres" "status" "links→jdllc" "naam-zonder" "eigenaar"
printf '%-58s %-6s %-14s %-12s %s\n' "-----" "------" "-----------" "-----------" "--------"

printf '%s\n' "$ADRESSEN" | sed '/^\s*$/d' | while IFS='|' read -r url label; do
  html=$(curl -sL --max-time 25 -A "$UA" -w '\n__STATUS__%{http_code}' "$url" 2>/dev/null)
  status=${html##*__STATUS__}
  body=${html%__STATUS__*}
  links=$(printf '%s' "$body" | grep -o -i "$DOEL" | wc -l | tr -d ' ')
  namen=$(printf '%s' "$body" | grep -o -i "$NAAM" | wc -l | tr -d ' ')
  printf '%-58s %-6s %-14s %-12s %s\n' "$url" "$status" "$links" "$namen" "$label"
done

cat <<'EOF'

Lezen: "links→jdllc" telt elke tekst `juandiazllc.com` in de HTML, dus een
link én een kale vermelding. "naam-zonder" telt hoe vaak de naam van Juan op
de pagina staat; staat daar iets en bij links 0, dan is dat een vermelding
zonder link — de goedkoopste backlink die er is (één <a> om een naam die er
al staat). Zie docs/backlink-strategie.md §1.
EOF
