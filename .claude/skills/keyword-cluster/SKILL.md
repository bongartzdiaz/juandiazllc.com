---
name: keyword-cluster
description: Bouw topic cluster (1 pillar + 5-8 cluster artikelen) met interne linkstructuur rondom een keyword uit de NEXUS BOS keyword tabel. Gebruik wanneer Juan content plant, een nieuwe pillar wil, of een keyword strategisch wil uitbouwen.
trigger: /keyword-cluster
---

# /keyword-cluster

Bouw een topic cluster volgens CLAUDE.md §3 prioriteit en §12 keyword tabel.

## Usage

```
/keyword-cluster <primair keyword>
/keyword-cluster <primair keyword> --site helpmijbesparen
/keyword-cluster <primair keyword> --depth 8   # 5-10 cluster artikelen
```

## Output structuur

### 1. Pillar page brief
- Primair keyword (uit §12)
- Cluster (Thuisbatterij / Saldering / Teruglever / Zelfverbruik / Voltafy)
- Lengte: 2.500-3.000 woorden
- Title tag concept (≤60)
- Meta description concept (≤155)
- H1 + H2 outline (8-12 secties)
- Search intent
- Verplichte semantische begrippen uit §12

### 2. Cluster artikelen (5-8)
Per artikel:
- Sub-keyword (long-tail, ondersteunt pillar)
- Search intent (informatief / commercieel)
- Lengte: 1.200-1.800 woorden
- Title tag + H1
- Hoe het de pillar ondersteunt
- 3 interne link anchor texts naar pillar

### 3. Interne linkmatrix
Tabel: cluster → pillar (verplicht), cluster → cluster (waar relevant), pillar → alle clusters.

### 4. Externe authority bronnen (2-3 per artikel)
Lijst met .gov, .nl overheid, kennisplatforms. Geen concurrent-domeinen.

### 5. Publicatieschema
Suggestie volgorde:
1. Pillar eerst publiceren
2. Cluster artikelen 2-3 per week
3. Bij elke cluster: pillar updaten met nieuwe interne link

## Memory check
Lees: project_hmb_content_machine voor bestaande clusters.
