---
target_path: docs/operator/support-email-templates.md (na sign-off)
locale: NL + EN per template
status: DRAFT — Juan adjusts per customer + situation. Use as start-not-finish.
purpose: 10 ready-to-tweak reply templates for the top-10 support questions
         from `_drafts/operator/support-runbook-first-30d.md`. Copy-paste +
         personalize. Max 60 words per template. Voice: Juan-personal, direct.
---

# Support Email Templates — Top 10

## How to use

- Pick the template that matches the question
- Copy into your email client (Gmail / Apple Mail)
- Tweak: customer name, specific facts from their case
- Send within 4-hour SLA (business hours)
- Note: NEVER send templates verbatim — always personalize at
  least one sentence so the customer feels seen

---

## 1. "Ik krijg geen invite-mail" / "I'm not receiving the invite email"

**When:** Customer's mail (Gmail / Outlook / corporate domain) hasn't
arrived within 5 minutes of invite-send.

**Subject:** Re: DEUS invite

**EN:**
> Hi <name>, sorry it's not arriving. Three checks: (1) spam/junk
> folder, search for "lucen.ai", (2) corporate domain blocking
> outside mail — ask IT to whitelist hello@lucen.ai, (3) reply here
> with your alternate email and I'll resend manually within 5 min.
> Juan

**NL:**
> Hi <naam>, vervelend dat 'ie niet aankomt. Drie checks: (1) spam-
> map, zoek op "lucen.ai", (2) bedrijfsdomein blokkeert externe mail
> — vraag IT om hello@lucen.ai op de whitelist, (3) reply met een
> alternatief e-mailadres dan stuur ik 'm handmatig binnen 5 min.
> Juan

---

## 2. "Mijn kalender komt niet door" / "My calendar isn't syncing"

**When:** OAuth completed but no events showing, or push-sync badge missing.

**Subject:** Re: kalender-sync

**EN:**
> Hi <name>, can you check Settings → Integrations? If the badge says
> "Read-only", the push-sync failed and I'll fix it on my side now.
> If it says "Real-time sync · renews in Xd", events should appear
> on contact pages within 30 seconds of you opening the contact.
> Which one do you see?
> Juan

**NL:**
> Hi <naam>, kun je Settings → Integraties checken? Als de badge
> "Read-only" zegt, ging push-sync mis en fix ik 'm nu aan mijn kant.
> Als 't "Realtime sync · vernieuwt over Xd" zegt, zouden events
> binnen 30 seconden zichtbaar moeten worden zodra je een contact
> opent. Welke zie jij?
> Juan

---

## 3. "Ik kan mijn collega niet uitnodigen" / "Can't invite my colleague"

**When:** Invite button greyed out, or error on submit.

**Subject:** Re: collega uitnodigen

**EN:**
> Hi <name>, two quick things: (1) only admins can invite — check
> Settings → Team that your role shows "Admin" not "Manager", (2) your
> seat-cap might be hit (default 25 for beta-cohort). Reply with your
> colleague's email and I'll do the invite from my side as backup.
> Juan

**NL:**
> Hi <naam>, twee dingen: (1) alleen admins kunnen uitnodigen —
> check Settings → Team of jouw rol "Admin" staat, niet "Manager",
> (2) misschien is je seat-limiet bereikt (standaard 25 voor beta).
> Stuur me het e-mailadres van je collega, dan nodig ik 'm uit aan
> mijn kant als backup.
> Juan

---

## 4. "Hoe haal ik data uit Pipedrive in DEUS?" / "How to import from Pipedrive"

**When:** Customer asks about migration from existing CRM.

**Subject:** Re: data-migratie

**EN:**
> Hi <name>, two paths: (1) self-serve: export contacts as CSV from
> Pipedrive (Settings → Data → Export), upload via DEUS Settings →
> Contacts → Import. Works up to 10k rows. (2) Done for you for €1.500
> — five business days, includes deals + custom fields + 2 training
> sessions. Which fits?
> Juan

**NL:**
> Hi <naam>, twee paden: (1) zelf doen: exporteer contacten als CSV
> uit Pipedrive (Settings → Data → Export), upload via DEUS Settings
> → Contacten → Importeren. Werkt tot 10k rijen. (2) Voor jou
> gedaan voor €1.500 — vijf werkdagen, inclusief deals + maatwerk-
> velden + 2 training-sessies. Welke past?
> Juan

---

## 5. "Stripe-checkout werkt niet" / "Stripe checkout broken"

**When:** Customer fails to complete payment.

**Subject:** Re: betaling

**EN:**
> Hi <name>, three usual suspects: (1) Safari on iOS — try desktop
> browser or private tab, (2) adblocker blocking js.stripe.com —
> whitelist it, (3) card refused by your bank — try a different card.
> Reply with which one applies and I'll send a payment-link as
> alternative if needed.
> Juan

**NL:**
> Hi <naam>, drie gebruikelijke oorzaken: (1) Safari op iOS — probeer
> desktop of privé-tab, (2) adblocker blokkeert js.stripe.com — zet
> 'm in de whitelist, (3) kaart geweigerd door je bank — probeer een
> andere kaart. Laat weten welke, dan stuur ik een payment-link als
> alternatief.
> Juan

---

## 6. "Ik zie de verkeerde taal" / "Wrong language displayed"

**When:** Customer sees English on /nl page or vice versa.

**Subject:** Re: taal-instelling

**EN:**
> Hi <name>, in DEUS go to Settings → Language and pick the one you
> want — it'll stick for next time. If you see English in a Dutch
> account that doesn't change, screenshot it and reply. That's a bug
> I want to fix the same day, not a config issue.
> Juan

**NL:**
> Hi <naam>, in DEUS ga naar Settings → Taal en kies de gewenste —
> die blijft de volgende keer staan. Als je Engels ziet in een
> Nederlands account dat niet verandert, screenshot en reply. Dat
> is een bug die ik dezelfde dag wil fixen, geen configuratie-issue.
> Juan

---

## 7. "Hoe begin ik? Dashboard is leeg" / "How do I start, dashboard is empty"

**When:** Customer feels lost after onboarding.

**Subject:** Re: starten

**EN:**
> Hi <name>, the empty dashboard is by design — no fake demo data.
> See the three quick-start cards at the top? Start with "Add first
> contact" — it'll set up everything else automatically. Want a
> 10-min screenshare? Reply with a time and I'll send a calendar
> invite.
> Juan

**NL:**
> Hi <naam>, het lege dashboard is bewust zo — geen nep-demo-data.
> Zie je de drie quick-start-kaartjes bovenaan? Begin met "Voeg
> eerste contact toe" — dat regelt de rest automatisch. Wil je een
> 10-min screenshare? Reply met een tijd, dan stuur ik een agenda-
> uitnodiging.
> Juan

---

## 8. "Waar zit mijn data / privacy" / "Where's my data / privacy"

**When:** Customer asks GDPR/privacy questions.

**Subject:** Re: privacy

**EN:**
> Hi <name>, your data sits on Hetzner servers in Falkenstein,
> Germany. Backups in Amsterdam (Backblaze B2 EU). Nothing leaves
> the EEA. Read the [DPA](https://juandiazllc.com/en/legal/dpa) —
> sign on request, no negotiation needed. Anything specific you
> want me to flag?
> Juan

**NL:**
> Hi <naam>, je data staat op Hetzner-servers in Falkenstein,
> Duitsland. Back-ups in Amsterdam (Backblaze B2 EU). Niets verlaat
> de EER. Lees de [verwerkersovereenkomst](https://juandiazllc.com/nl/legal/dpa)
> — onderteken op verzoek, geen onderhandeling nodig. Iets specifieks
> waar ik op moet letten?
> Juan

---

## 9. "Hoe export ik mijn data?" / "How do I export my data?"

**When:** Customer asks about data portability.

**Subject:** Re: data-export

**EN:**
> Hi <name>, Settings → Privacy → "Export my data". Returns a JSON
> bundle with everything: contacts, deals, notes, audit log. One
> click, no ticket. Sensitive credentials (passwords, tokens) are
> explicitly excluded for security. Anything else you'd like
> included that's missing?
> Juan

**NL:**
> Hi <naam>, Settings → Privacy → "Exporteer mijn data". Levert een
> JSON-bundel met alles: contacten, deals, notities, audit-log.
> Eén klik, geen ticket. Gevoelige credentials (wachtwoorden, tokens)
> worden expliciet uitgesloten voor veiligheid. Mis je iets dat erin
> zou moeten?
> Juan

---

## 10. "Werkt op desktop maar mobile is gek" / "Mobile is broken"

**When:** Customer reports mobile-specific issue.

**Subject:** Re: mobiel-issue

**EN:**
> Hi <name>, mobile-web works but for data-entry I recommend desktop
> week-1. For checking contacts and calendar on the go, mobile is
> fine. Which screen specifically is broken? Screenshot helps me
> reproduce + fix the same day. We don't have a native app — won't
> be one until Q3+.
> Juan

**NL:**
> Hi <naam>, mobile-web werkt maar voor data-invoer raad ik desktop
> aan in week 1. Voor contacten en agenda onderweg checken is mobiel
> prima. Welk scherm specifiek is stuk? Screenshot helpt me 'm na
> te bouwen + dezelfde dag te fixen. Native app komt er niet vóór
> Q3+.
> Juan

---

## When NOT to use these templates

- **First reply of a customer relationship**: always handwritten.
  Templates start working from interaction #2.
- **Customer is upset / threatening to cancel**: hand-craft, no
  templates. Use phone instead.
- **Edge cases not on this list**: don't force a fit — write fresh.
- **Customer specifically references a previous personal exchange**:
  templates feel cold then. Match their tone.

## Voice rules (apply to every reply)

1. **Sign with "Juan"** — never "DEUS team" or "Support" or no signature
2. **One concrete action** at the end (try X, reply with Y, click Z)
3. **No "Thanks for reaching out"** — customer doesn't care, save the words
4. **No "Please don't hesitate to..."** — they will hesitate; remove friction
5. **Acknowledge the inconvenience if it's real**: "sorry it's not
   working" is enough — don't pile on apologies
6. **Use customer's own words** where possible: if they say "broken",
   say "broken" not "issue" or "concern"
