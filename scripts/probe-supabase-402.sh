#!/usr/bin/env bash
# Peilt of de Supabase-restrictie eraf is, en meet zodra dat zo is de dingen die
# sinds 2026-08-27 niet meetbaar zijn.
#
# WAAROM DIT BESTAAT. Op 2026-08-27 gingen beide Supabase-projecten op 402
# ("exceed_storage_size_quota"). Sindsdien weigert het hele datavlak: het
# contactformulier schrijft niets weg, en de tien 410-stubs die die dag over de
# dode diaz-*-functies zijn gezet, zijn nooit van buitenaf waargenomen. Het
# logboek beloofde hiervoor `scratchpad/probe-410.sh`, maar dat pad wees naar een
# sessie-scratchpad die allang weg is - een document dat een ding beschrijft dat
# er niet is. Dit bestand is dat ding, op een plek die blijft.
#
# WAT DE PROBE NIET DOET. Hij schrijft nergens naartoe. De negatieve controle is
# een slug die niet bestaat, en de twee lead-functies worden geprobed met
# ONGELDIGE JSON zonder auth-header: de auth-controle staat vóór de JSON-parse en
# het versturen staat erna, dus dat scheidt open van dicht zonder dat er één
# bericht de deur uit gaat. Zie [[feedback_poort_testen_zonder_bijwerking]].
#
# SCOPE. Alleen de eigen Supabase-projecten uit SCOPE.md, gerichte losse
# verzoeken, geen fuzzing.
#
# Gebruik:  bash scripts/probe-supabase-402.sh
# Exit 0 = restrictie eraf (en de volle meting is gedraaid)
# Exit 1 = nog steeds 402
# Exit 2 = onverwacht antwoord; lees de uitvoer, concludeer niets

set -u

WBGIO=wbgiouuifqhasedncysw
VBOZEL=vbozelswveaxsyccvaac

# De tien stubs op wbgio. Vastgelegd 2026-08-28 uit list_edge_functions: alle
# tien dragen een updated_at binnen 51 seconden van elkaar (de uitrol van de
# 410-stub op 2026-08-27), de vier hieronder dragen nog hun oude stempel.
STUBS=(
  diaz-license-issue
  diaz-license-validate
  diaz-stripe-webhook
  diaz-lemon-webhook
  diaz-appsumo-redeem
  diaz-affiliate-apply
  diaz-affiliate-activate
  diaz-beta-checkout
  diaz-trial-init
  diaz-release-blast
)

# Deze vier moesten blijven werken. Staan er als positieve controle: als de tien
# 410 geven en deze vier ook, dan meet de probe de gateway en niet de stub.
BLIJVERS=(pai-vapi-webhook pai-weekly-digest lead-notify lead-acknowledge)

NEP=negatieve-controle-bestaat-niet-xyz

peil() { # project slug body -> "http|body"
  local body
  body=$(mktemp)
  local code
  code=$(curl -s -o "$body" -w '%{http_code}' -m 20 \
    -X POST "https://$1.supabase.co/functions/v1/$2" \
    -H 'content-type: application/json' --data-binary "$3" 2>/dev/null)
  printf '%s|%s' "$code" "$(head -c 120 "$body" | tr -d '\r\n')"
  rm -f "$body"
}

echo "== poort: is de restrictie eraf? =="
for p in "$WBGIO" "$VBOZEL"; do
  r=$(peil "$p" "$NEP" '{}')
  echo "  $p  $NEP  -> ${r%%|*}"
  case "${r%%|*}" in
    402) STAND=402 ;;
    404) STAND=open ;;
    *)   echo "  onverwacht: ${r#*|}"; exit 2 ;;
  esac
done

if [ "${STAND:-}" = "402" ]; then
  echo
  echo "NOG STEEDS GERESTRICTEERD. Dit is een facturatietoestand, geen"
  echo "gebruikstoestand: samen ~49 MB over de hele organisatie. De knop staat op"
  echo "Billing/Usage van organisatie swlekxkypqmqbmtrfvld en is van de operator."
  exit 1
fi

echo
echo "== de tien stubs op wbgio: verwacht 410, elk met zijn EIGEN slug erin =="
fout=0
for s in "${STUBS[@]}"; do
  r=$(peil "$WBGIO" "$s" '{}')
  code=${r%%|*}; body=${r#*|}
  # Elke stub draagt zijn eigen slug in het antwoord, zodat een treffer bewijst
  # dat DIE slug de stub kreeg - niet dat de gateway iets generieks teruggaf.
  case "$body" in *"$s"*) eigen="slug-ok" ;; *) eigen="SLUG ONTBREEKT"; fout=1 ;; esac
  [ "$code" = "410" ] || fout=1
  printf '  %-26s %s  %s\n' "$s" "$code" "$eigen"
done

echo
echo "== negatieve controle: een slug die niet bestaat, verwacht 404 =="
r=$(peil "$WBGIO" "$NEP" '{}'); echo "  $NEP  -> ${r%%|*}"
[ "${r%%|*}" = "404" ] || fout=1

echo
echo "== de vier blijvers: mogen GEEN 410 geven =="
for s in "${BLIJVERS[@]}"; do
  r=$(peil "$WBGIO" "$s" 'dit-is-geen-json')
  code=${r%%|*}
  [ "$code" = "410" ] && { echo "  $s  $code  <-- STUB EROVERHEEN, fout"; fout=1; continue; }
  printf '  %-20s %s  %s\n' "$s" "$code" "${r#*|}"
done

echo
echo "== leadketen: staat de poort open of dicht? =="
echo "  400 invalid-json = fail-open (LEAD_NOTIFY_SECRET staat niet)"
echo "  503 not-configured of 401 = dicht"
for s in lead-notify lead-acknowledge; do
  r=$(peil "$WBGIO" "$s" 'dit-is-geen-json')
  printf '  %-20s %s  %s\n' "$s" "${r%%|*}" "${r#*|}"
done

echo
if [ "$fout" = "0" ]; then
  echo "ALLES ZOALS VERWACHT. Het datavlak leeft; werk de operator-lijst in"
  echo "CLAUDE.md bij en meet daarna het contactformulier end-to-end."
  exit 0
fi
echo "AFWIJKINGEN GEVONDEN - lees de regels hierboven, concludeer niets zonder ze."
exit 2
