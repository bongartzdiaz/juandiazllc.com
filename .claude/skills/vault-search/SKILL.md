---
name: vault-search
description: Doorzoek de Obsidian vault op C:\business\Mr Diaz voor topic, tag, wikilink target, of full-text. Gebruik wanneer Juan informatie zoekt die mogelijk in zijn vault staat — research, decisions, meetings, references.
trigger: /vault-search
---

# /vault-search

Search interface voor de Obsidian vault.

## Usage

```
/vault-search <query>                    # full-text + title search
/vault-search <query> --tag <tag>        # filter op tag
/vault-search <query> --type <type>      # filter op note type (log/reference/idea/etc.)
/vault-search <query> --folder Projects  # filter op PARA folder
/vault-search <query> --since 30d        # alleen recent
/vault-search <query> --linked-to <note> # vind notes die naar X linken (backlinks)
```

## Vault locatie
`C:\business\Mr Diaz\`

## Search strategie

### 1. Pre-search (parallel)
Voer simultaan uit (Glob/Grep tools, niet shell `find`/`grep`):
- Title match: filename bevat query
- Wikilink match: `[[<query>]]` voorkomens
- Tag match: `#<query>` voorkomens
- Frontmatter match: tags array bevat query
- Full-text body match

### 2. Score & rank
Per hit:
- Title exact match: weight 10
- Title partial: 7
- Wikilink target: 8
- Tag match: 6
- H1/H2 match: 5
- Frontmatter aliases: 5
- Body match (frequency): 1-3

### 3. Cluster results
Group by:
- PARA folder
- Type (log/reference/idea/decision/meeting)
- Recent vs oud

### 4. Show snippets
Per top hit: 2-3 regels context rond match.

## Output

```
VAULT SEARCH — "<query>"

═══ TOP HITS (N relevant) ═══

[Projects]
1. [thuisbatterij-tco.md] — score 18
   "...berekening TCO laat zien dat <query> ongeveer 8 jaar terugverdient..."
   Tags: #thuisbatterij #tco
   Modified: 2026-04-22

2. [hmb-content-strategie.md] — score 14
   "...prioriteit ligt bij <query> cluster..."
   ...

[Resources]
3. ...

[Archive]
4. ...

═══ TAG MATCHES ═══
Notes met tag #<query>: N
Lijst: ...

═══ BACKLINKS ═══
Notes die [[<query>]] gebruiken: N
Lijst: ...

═══ RELATED ═══
Notes vaak ge-co-cited met top hits:
- ...

═══ MISSING? ═══
Geen exacte match? Suggested aanmaken:
- /vault-note <query> --para Resources
```

## Fallback bij geen hits
1. Suggest spelling alternatives
2. Suggest related tags
3. Show recent notes uit relevante folder
4. Vraag of `/vault-note` moet worden aangeroepen om nieuwe note te starten

## Performance tips
- Limit deep body-search tot 100 notes — anders wordt het traag
- Cache tag index in memory (sessie)
- Voor "alle notes met tag X": rechtstreeks tag query, geen full-text

## Hard rules
- Read-only — NOOIT vault aanpassen vanuit deze skill
- Toon ALTIJD path en modified date per hit
- Bij >50 hits: paginate, niet dumpen
- Respecteer .obsidian config (bv. ignored folders)
