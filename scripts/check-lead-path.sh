#!/usr/bin/env bash
# Controleert of het lead-pad nog bestaat aan de kant die niemand ziet.
#
# ── Waarom dit bestaat ──────────────────────────────────────────────────────
# Op 2026-08-12 lag de leadopvang uren plat zonder dat iets alarm sloeg. Het
# contactformulier schrijft via PostgREST naar `marketing.leads` (project
# wbgiouuifqhasedncysw). Een gedropt schema stond nog in `pgrst.db_schemas`,
# dus PostgREST kon zijn schema-cache niet bouwen en gaf project-breed
# 503 PGRST002. Elke insert faalde; de gebruiker las "Something went wrong".
#
# Niets mat dat. De sitemap-crawl (scripts/seo-audit.ts) haalt HTML op en die
# pagina's zijn statisch — ze blijven vrolijk 200 geven terwijl de conversie
# eronder dood is. Directe SQL werkt ook door, want die gaat niet via
# PostgREST. "De database leeft" en "de REST-API leeft" zijn twee metingen.
#
# ── Wat gezond is ───────────────────────────────────────────────────────────
# Een anonieme GET op `marketing.leads` hoort `401` te geven met foutcode
# `42501` (permission denied). Dat is precies goed: het schema wordt
# geserveerd, de tabel bestaat, en anon mag wél INSERT'en maar niet SELECT'en.
#
# Let op de vorm van deze assertie. Een gewone "geeft de server antwoord?"-
# check was tijdens het incident geslaagd — 503 is ook een antwoord. Daarom
# eist dit script één exacte verwachte fout, en beschouwt het álles daarbuiten
# als defect. Ook een 200: dat zou betekenen dat anon de leads kan uitlezen.
#
# ── Draaien ─────────────────────────────────────────────────────────────────
#   bash scripts/check-lead-path.sh              # leest .env.local
#   SUPABASE_URL=… SUPABASE_ANON_KEY=… bash scripts/check-lead-path.sh
#
# Doet alleen GET. Nooit een insert — die vuurt de lead-notify-trigger en
# daarmee een Telegram-melding.

set -uo pipefail

# Overschrijfbaar zodat de faaltakken hieronder te bewíjzen zijn zonder dit
# bestand te wijzigen: richt de probe op een niet-bestaand schema en je hoort
# 404 PGRST106 te krijgen. Een gate die je nooit rood hebt gezien is geen gate.
TABEL="${LEAD_PATH_TABEL:-leads}"
SCHEMA="${LEAD_PATH_SCHEMA:-marketing}"

# Lokaal gemak: zonder expliciete env pakken we .env.local, hetzelfde bestand
# waar `next dev` uit leest. In CI staan de waarden in de omgeving en bestaat
# dit bestand niet.
if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  if [[ -f .env.local ]]; then
    set -a
    # shellcheck disable=SC1091
    . ./.env.local
    set +a
    SUPABASE_URL="${SUPABASE_URL:-${NEXT_PUBLIC_SUPABASE_URL:-}}"
    SUPABASE_ANON_KEY="${SUPABASE_ANON_KEY:-${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}}}"
  fi
fi

if [[ -z "${SUPABASE_URL:-}" || -z "${SUPABASE_ANON_KEY:-}" ]]; then
  echo "check-lead-path: SUPABASE_URL en SUPABASE_ANON_KEY ontbreken." >&2
  echo "  Zet ze in de omgeving of laat .env.local ze aanleveren." >&2
  exit 2
fi

URL="${SUPABASE_URL%/}/rest/v1/${TABEL}?select=id&limit=1"

# Lichaam naar een bestand en alleen de status via -w: `-o /dev/stdout` samen
# met `-w` levert in de praktijk een leeg lichaam op, en dan zou de
# code-vergelijking hieronder altijd falen — een gate die om de verkeerde
# reden rood staat is net zo onbruikbaar als een die altijd groen staat.
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# --max-time dekt het geval dat de gateway de verbinding openhoudt zonder ooit
# te antwoorden; dan is 000 de uitkomst en dat is óók een storing.
STATUS=$(curl -s --max-time 20 \
  -o "$TMP" -w '%{http_code}' \
  -H "apikey: ${SUPABASE_ANON_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_ANON_KEY}" \
  -H "Accept-Profile: ${SCHEMA}" \
  "$URL" 2>/dev/null) || true

LICHAAM="$(cat "$TMP")"
[[ -z "$STATUS" ]] && STATUS="000"

# PostgREST zet zijn eigen foutcode in het JSON-veld `code`. Die is preciezer
# dan de HTTP-status: 503 kan van de gateway komen, PGRST002 komt gegarandeerd
# van een kapotte schema-cache.
CODE=$(printf '%s' "$LICHAAM" | grep -o '"code":"[^"]*"' | head -1 | cut -d'"' -f4)

echo "endpoint : ${SUPABASE_URL%/}/rest/v1/${TABEL}  (Accept-Profile: ${SCHEMA})"
echo "status   : ${STATUS}"
echo "code     : ${CODE:-<geen>}"
echo "lichaam  : $(printf '%s' "$LICHAAM" | head -c 300)"
echo

case "$STATUS" in
  401)
    if [[ "$CODE" == "42501" ]]; then
      echo "OK — schema geserveerd, tabel bestaat, anon mag niet lezen."
      exit 0
    fi
    echo "FOUT — 401 maar met code '${CODE:-<geen>}' in plaats van 42501."
    echo "  Verwacht 'permission denied for table ${TABEL}'. Een andere 401 wijst"
    echo "  op een ongeldige of ingetrokken sleutel: dan faalt de insert ook."
    exit 1
    ;;
  200)
    echo "FOUT — anon kan ${SCHEMA}.${TABEL} UITLEZEN. Dat is een datalek."
    echo "  Er is een SELECT-grant of een te ruime RLS-policy toegevoegd."
    echo "  Herstel: revoke select on ${SCHEMA}.${TABEL} from anon;"
    exit 1
    ;;
  406)
    # Gemeten 2026-08-15: een niet-geëxposeerd schema geeft 406 PGRST106, geen
    # 404. Het lichaam somt op wát er wél geserveerd wordt — daarmee is dit
    # tegelijk de controle op de Exposed Schemas-instelling.
    echo "FOUT — schema '${SCHEMA}' wordt niet geserveerd (code ${CODE:-?})."
    echo "  Settings → API → Exposed schemas van het Supabase-project mist '${SCHEMA}'."
    echo "  Zonder dat schema kan het contactformulier niets wegschrijven."
    exit 1
    ;;
  404)
    echo "FOUT — PostgREST kent ${SCHEMA}.${TABEL} niet (code ${CODE:-?})."
    echo "  PGRST205 = tabel niet in de schema-cache; hernoemd, verhuisd of gedropt?"
    exit 1
    ;;
  503)
    echo "FOUT — PostgREST serveert niet (code ${CODE:-?})."
    echo "  PGRST002 = de schema-cache kan niet gebouwd worden. Bijna altijd"
    echo "  omdat pgrst.db_schemas een schema noemt dat niet meer bestaat."
    echo "  Dit is exact het incident van 2026-08-12. LEADS GAAN NU VERLOREN."
    exit 1
    ;;
  402)
    echo "FOUT — 402: het Supabase-project zit tegen een quotum aan."
    echo "  Kijk op Billing/Usage van de ORGANISATIE, niet in de database."
    exit 1
    ;;
  000)
    echo "FOUT — geen antwoord binnen 20s (DNS, netwerk, of gateway hangt)."
    exit 1
    ;;
  *)
    echo "FOUT — onverwachte status ${STATUS} (code ${CODE:-<geen>})."
    exit 1
    ;;
esac
