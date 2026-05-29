/* Report i18n strings — per-locale label maps for the report generator.
   ──────────────────────────────────────────────────────────────────
   The generator (lib/philly/reports/generator.ts) is locale-agnostic:
   it takes `strings` + `shellStrings` as inputs and the templates fall
   back to English placeholders for any missing key. This module is the
   server-side source of those maps so the /api/reports route can render
   a downloadable report in the operator's UI language.

   ## Why a hand-maintained map (not next-intl messages)?

   The report generator is a pure function with a hermetic-testable
   contract — strings are PASSED IN, never imported into templates. We
   keep the report copy here (rather than messages/<locale>.json) so the
   generator stays decoupled from the next-intl runtime and the key set
   is co-located with the generator that consumes it. English is the
   canonical source + the default/fallback for unknown locales.

   Supported locales: en, nl, de, es, fr. SDG goal names use the UN's
   official localized short titles.
   --------------------------------------------------------------- */

export type ReportLocale = 'en' | 'nl' | 'de' | 'es' | 'fr'

const SUPPORTED: readonly ReportLocale[] = ['en', 'nl', 'de', 'es', 'fr']

function normalizeLocale(locale: string): ReportLocale {
  // Accept full BCP-47 tags (e.g. "nl-NL") + bare 2-letter codes.
  const short = (locale || '').slice(0, 2).toLowerCase()
  return (SUPPORTED as readonly string[]).includes(short) ? (short as ReportLocale) : 'en'
}

/* ── Report label strings ─────────────────────────────────────────── */

const STRINGS: Record<ReportLocale, Record<string, string>> = {
  en: {
    // common
    totalProjects: 'Total projects', totalBudget: 'Total budget',
    totalSpent: 'Total spent', remaining: 'Remaining', utilization: 'Utilization',
    active: 'active', completed: 'completed',
    projectBreakdown: 'Project breakdown', noProjects: 'No projects in this period.',
    impactTotals: 'Impact totals',
    colProject: 'Project', colStatus: 'Status', colBudget: 'Budget',
    colSpent: 'Spent', colUtil: 'Util.', colRemaining: 'Remaining',
    colMetric: 'Metric', colTotal: 'Total',
    // financial extras
    healthBreakdown: 'Portfolio health', onTrack: 'On track',
    underutilised: 'Under-utilised', overBudget: 'Over budget',
    // sdg
    sdgsCovered: 'SDGs covered', outOfSeventeen: 'of the 17 UN goals',
    coverageByGoal: 'Coverage by goal', noSdgData: 'No SDG data on file. Tag projects with SDGs to populate this report.',
    colGoal: 'Goal', colLabel: 'Label', colProjects: 'Projects', colShare: 'Share',
    // stakeholder
    highlights: 'Highlights this period', noHighlights: 'No curated highlights — set them in Settings → Reports.',
    topProjects: 'Top projects', colImpact: 'Impact summary',
    kpiActiveProjects: 'Active projects', kpiCompletedProjects: 'Completed projects', kpiDealsWon: 'Deals won',
    // performance
    dealsClosed: 'Deals closed', totalValue: 'Total value', avgDeal: 'Avg deal size',
    monthlyTrend: 'Monthly trend', noClosedDeals: 'No closed deals in this period.',
    colMonth: 'Month', colDeals: 'Deals', colValue: 'Value', colTrend: 'Trend',
    pipelineByStage: 'Pipeline by stage', colStage: 'Stage', colCount: 'Count',
    // regional
    countries: 'Countries', cities: 'Cities', byCountry: 'By country',
    byCity: 'By city', colCountry: 'Country', colCity: 'City', colContacts: 'Contacts',
    noRegionalData: 'No regional data on file. Tag projects with country/city to populate.',
    cityRowsCappedAt: '+ {n} more cities',
  },

  nl: {
    // common
    totalProjects: 'Totaal projecten', totalBudget: 'Totaal budget',
    totalSpent: 'Totaal besteed', remaining: 'Resterend', utilization: 'Benutting',
    active: 'actief', completed: 'afgerond',
    projectBreakdown: 'Projectoverzicht', noProjects: 'Geen projecten in deze periode.',
    impactTotals: 'Impacttotalen',
    colProject: 'Project', colStatus: 'Status', colBudget: 'Budget',
    colSpent: 'Besteed', colUtil: 'Benut.', colRemaining: 'Resterend',
    colMetric: 'Maatstaf', colTotal: 'Totaal',
    // financial extras
    healthBreakdown: 'Portefeuillegezondheid', onTrack: 'Op koers',
    underutilised: 'Onderbenut', overBudget: 'Boven budget',
    // sdg
    sdgsCovered: 'SDG’s gedekt', outOfSeventeen: 'van de 17 VN-doelen',
    coverageByGoal: 'Dekking per doel', noSdgData: 'Geen SDG-gegevens beschikbaar. Koppel SDG’s aan projecten om dit rapport te vullen.',
    colGoal: 'Doel', colLabel: 'Label', colProjects: 'Projecten', colShare: 'Aandeel',
    // stakeholder
    highlights: 'Hoogtepunten deze periode', noHighlights: 'Geen geselecteerde hoogtepunten — stel ze in via Instellingen → Rapporten.',
    topProjects: 'Topprojecten', colImpact: 'Impactsamenvatting',
    kpiActiveProjects: 'Actieve projecten', kpiCompletedProjects: 'Afgeronde projecten', kpiDealsWon: 'Gewonnen deals',
    // performance
    dealsClosed: 'Gesloten deals', totalValue: 'Totale waarde', avgDeal: 'Gem. dealgrootte',
    monthlyTrend: 'Maandelijkse trend', noClosedDeals: 'Geen gesloten deals in deze periode.',
    colMonth: 'Maand', colDeals: 'Deals', colValue: 'Waarde', colTrend: 'Trend',
    pipelineByStage: 'Pijplijn per fase', colStage: 'Fase', colCount: 'Aantal',
    // regional
    countries: 'Landen', cities: 'Steden', byCountry: 'Per land',
    byCity: 'Per stad', colCountry: 'Land', colCity: 'Stad', colContacts: 'Contacten',
    noRegionalData: 'Geen regionale gegevens beschikbaar. Koppel land/stad aan projecten om dit te vullen.',
    cityRowsCappedAt: '+ {n} meer steden',
  },

  de: {
    // common
    totalProjects: 'Projekte gesamt', totalBudget: 'Budget gesamt',
    totalSpent: 'Ausgegeben gesamt', remaining: 'Verbleibend', utilization: 'Auslastung',
    active: 'aktiv', completed: 'abgeschlossen',
    projectBreakdown: 'Projektaufschlüsselung', noProjects: 'Keine Projekte in diesem Zeitraum.',
    impactTotals: 'Wirkungssummen',
    colProject: 'Projekt', colStatus: 'Status', colBudget: 'Budget',
    colSpent: 'Ausgegeben', colUtil: 'Ausl.', colRemaining: 'Verbleibend',
    colMetric: 'Kennzahl', colTotal: 'Gesamt',
    // financial extras
    healthBreakdown: 'Portfolio-Gesundheit', onTrack: 'Im Plan',
    underutilised: 'Unterausgelastet', overBudget: 'Über Budget',
    // sdg
    sdgsCovered: 'Abgedeckte SDGs', outOfSeventeen: 'von den 17 UN-Zielen',
    coverageByGoal: 'Abdeckung nach Ziel', noSdgData: 'Keine SDG-Daten vorhanden. Verknüpfen Sie Projekte mit SDGs, um diesen Bericht zu füllen.',
    colGoal: 'Ziel', colLabel: 'Bezeichnung', colProjects: 'Projekte', colShare: 'Anteil',
    // stakeholder
    highlights: 'Höhepunkte in diesem Zeitraum', noHighlights: 'Keine kuratierten Höhepunkte — legen Sie sie unter Einstellungen → Berichte fest.',
    topProjects: 'Top-Projekte', colImpact: 'Wirkungsübersicht',
    kpiActiveProjects: 'Aktive Projekte', kpiCompletedProjects: 'Abgeschlossene Projekte', kpiDealsWon: 'Gewonnene Abschlüsse',
    // performance
    dealsClosed: 'Abgeschlossene Geschäfte', totalValue: 'Gesamtwert', avgDeal: 'Durchschn. Abschlussgröße',
    monthlyTrend: 'Monatlicher Trend', noClosedDeals: 'Keine abgeschlossenen Geschäfte in diesem Zeitraum.',
    colMonth: 'Monat', colDeals: 'Abschlüsse', colValue: 'Wert', colTrend: 'Trend',
    pipelineByStage: 'Pipeline nach Phase', colStage: 'Phase', colCount: 'Anzahl',
    // regional
    countries: 'Länder', cities: 'Städte', byCountry: 'Nach Land',
    byCity: 'Nach Stadt', colCountry: 'Land', colCity: 'Stadt', colContacts: 'Kontakte',
    noRegionalData: 'Keine regionalen Daten vorhanden. Verknüpfen Sie Projekte mit Land/Stadt, um dies zu füllen.',
    cityRowsCappedAt: '+ {n} weitere Städte',
  },

  es: {
    // common
    totalProjects: 'Proyectos totales', totalBudget: 'Presupuesto total',
    totalSpent: 'Gasto total', remaining: 'Restante', utilization: 'Utilización',
    active: 'activo', completed: 'completado',
    projectBreakdown: 'Desglose de proyectos', noProjects: 'No hay proyectos en este periodo.',
    impactTotals: 'Totales de impacto',
    colProject: 'Proyecto', colStatus: 'Estado', colBudget: 'Presupuesto',
    colSpent: 'Gastado', colUtil: 'Util.', colRemaining: 'Restante',
    colMetric: 'Métrica', colTotal: 'Total',
    // financial extras
    healthBreakdown: 'Salud de la cartera', onTrack: 'En curso',
    underutilised: 'Infrautilizado', overBudget: 'Sobre presupuesto',
    // sdg
    sdgsCovered: 'ODS cubiertos', outOfSeventeen: 'de los 17 objetivos de la ONU',
    coverageByGoal: 'Cobertura por objetivo', noSdgData: 'No hay datos de ODS registrados. Etiqueta los proyectos con ODS para completar este informe.',
    colGoal: 'Objetivo', colLabel: 'Etiqueta', colProjects: 'Proyectos', colShare: 'Porcentaje',
    // stakeholder
    highlights: 'Aspectos destacados de este periodo', noHighlights: 'Sin aspectos destacados seleccionados: configúralos en Ajustes → Informes.',
    topProjects: 'Proyectos destacados', colImpact: 'Resumen de impacto',
    kpiActiveProjects: 'Proyectos activos', kpiCompletedProjects: 'Proyectos completados', kpiDealsWon: 'Negocios ganados',
    // performance
    dealsClosed: 'Negocios cerrados', totalValue: 'Valor total', avgDeal: 'Tamaño medio de negocio',
    monthlyTrend: 'Tendencia mensual', noClosedDeals: 'No hay negocios cerrados en este periodo.',
    colMonth: 'Mes', colDeals: 'Negocios', colValue: 'Valor', colTrend: 'Tendencia',
    pipelineByStage: 'Embudo por etapa', colStage: 'Etapa', colCount: 'Cantidad',
    // regional
    countries: 'Países', cities: 'Ciudades', byCountry: 'Por país',
    byCity: 'Por ciudad', colCountry: 'País', colCity: 'Ciudad', colContacts: 'Contactos',
    noRegionalData: 'No hay datos regionales registrados. Etiqueta los proyectos con país/ciudad para completarlo.',
    cityRowsCappedAt: '+ {n} ciudades más',
  },

  fr: {
    // common
    totalProjects: 'Total des projets', totalBudget: 'Budget total',
    totalSpent: 'Total dépensé', remaining: 'Restant', utilization: 'Utilisation',
    active: 'actif', completed: 'terminé',
    projectBreakdown: 'Détail des projets', noProjects: 'Aucun projet sur cette période.',
    impactTotals: 'Totaux d’impact',
    colProject: 'Projet', colStatus: 'Statut', colBudget: 'Budget',
    colSpent: 'Dépensé', colUtil: 'Util.', colRemaining: 'Restant',
    colMetric: 'Indicateur', colTotal: 'Total',
    // financial extras
    healthBreakdown: 'Santé du portefeuille', onTrack: 'Sur la bonne voie',
    underutilised: 'Sous-utilisé', overBudget: 'Dépassement de budget',
    // sdg
    sdgsCovered: 'ODD couverts', outOfSeventeen: 'sur les 17 objectifs de l’ONU',
    coverageByGoal: 'Couverture par objectif', noSdgData: 'Aucune donnée ODD enregistrée. Associez des ODD aux projets pour alimenter ce rapport.',
    colGoal: 'Objectif', colLabel: 'Libellé', colProjects: 'Projets', colShare: 'Part',
    // stakeholder
    highlights: 'Points forts de la période', noHighlights: 'Aucun point fort sélectionné — définissez-les dans Paramètres → Rapports.',
    topProjects: 'Projets principaux', colImpact: 'Résumé d’impact',
    kpiActiveProjects: 'Projets actifs', kpiCompletedProjects: 'Projets terminés', kpiDealsWon: 'Affaires gagnées',
    // performance
    dealsClosed: 'Affaires conclues', totalValue: 'Valeur totale', avgDeal: 'Taille moyenne des affaires',
    monthlyTrend: 'Tendance mensuelle', noClosedDeals: 'Aucune affaire conclue sur cette période.',
    colMonth: 'Mois', colDeals: 'Affaires', colValue: 'Valeur', colTrend: 'Tendance',
    pipelineByStage: 'Pipeline par étape', colStage: 'Étape', colCount: 'Nombre',
    // regional
    countries: 'Pays', cities: 'Villes', byCountry: 'Par pays',
    byCity: 'Par ville', colCountry: 'Pays', colCity: 'Ville', colContacts: 'Contacts',
    noRegionalData: 'Aucune donnée régionale enregistrée. Associez un pays/une ville aux projets pour l’alimenter.',
    cityRowsCappedAt: '+ {n} autres villes',
  },
}

/* ── UN SDG goal names (official localized short titles) ──────────── */

export const SDG_LABELS_BY_LOCALE: Record<ReportLocale, Record<number, string>> = {
  en: {
    1: 'No poverty', 2: 'Zero hunger', 3: 'Good health & well-being',
    4: 'Quality education', 5: 'Gender equality', 6: 'Clean water & sanitation',
    7: 'Affordable & clean energy', 8: 'Decent work & economic growth',
    9: 'Industry, innovation & infrastructure', 10: 'Reduced inequalities',
    11: 'Sustainable cities & communities', 12: 'Responsible consumption & production',
    13: 'Climate action', 14: 'Life below water', 15: 'Life on land',
    16: 'Peace, justice & strong institutions', 17: 'Partnerships for the goals',
  },
  nl: {
    1: 'Geen armoede', 2: 'Geen honger', 3: 'Goede gezondheid en welzijn',
    4: 'Kwaliteitsonderwijs', 5: 'Gendergelijkheid', 6: 'Schoon water en sanitair',
    7: 'Betaalbare en duurzame energie', 8: 'Eerlijk werk en economische groei',
    9: 'Industrie, innovatie en infrastructuur', 10: 'Ongelijkheid verminderen',
    11: 'Duurzame steden en gemeenschappen', 12: 'Verantwoorde consumptie en productie',
    13: 'Klimaatactie', 14: 'Leven in het water', 15: 'Leven op het land',
    16: 'Vrede, justitie en sterke publieke diensten', 17: 'Partnerschap om doelstellingen te bereiken',
  },
  de: {
    1: 'Keine Armut', 2: 'Kein Hunger', 3: 'Gesundheit und Wohlergehen',
    4: 'Hochwertige Bildung', 5: 'Geschlechtergleichheit', 6: 'Sauberes Wasser und Sanitärversorgung',
    7: 'Bezahlbare und saubere Energie', 8: 'Menschenwürdige Arbeit und Wirtschaftswachstum',
    9: 'Industrie, Innovation und Infrastruktur', 10: 'Weniger Ungleichheiten',
    11: 'Nachhaltige Städte und Gemeinden', 12: 'Nachhaltiger Konsum und Produktion',
    13: 'Maßnahmen zum Klimaschutz', 14: 'Leben unter Wasser', 15: 'Leben an Land',
    16: 'Frieden, Gerechtigkeit und starke Institutionen', 17: 'Partnerschaften zur Erreichung der Ziele',
  },
  es: {
    1: 'Fin de la pobreza', 2: 'Hambre cero', 3: 'Salud y bienestar',
    4: 'Educación de calidad', 5: 'Igualdad de género', 6: 'Agua limpia y saneamiento',
    7: 'Energía asequible y no contaminante', 8: 'Trabajo decente y crecimiento económico',
    9: 'Industria, innovación e infraestructura', 10: 'Reducción de las desigualdades',
    11: 'Ciudades y comunidades sostenibles', 12: 'Producción y consumo responsables',
    13: 'Acción por el clima', 14: 'Vida submarina', 15: 'Vida de ecosistemas terrestres',
    16: 'Paz, justicia e instituciones sólidas', 17: 'Alianzas para lograr los objetivos',
  },
  fr: {
    1: 'Pas de pauvreté', 2: 'Faim zéro', 3: 'Bonne santé et bien-être',
    4: 'Éducation de qualité', 5: 'Égalité entre les sexes', 6: 'Eau propre et assainissement',
    7: 'Énergie propre et d’un coût abordable', 8: 'Travail décent et croissance économique',
    9: 'Industrie, innovation et infrastructure', 10: 'Inégalités réduites',
    11: 'Villes et communautés durables', 12: 'Consommation et production responsables',
    13: 'Mesures relatives à la lutte contre les changements climatiques', 14: 'Vie aquatique', 15: 'Vie terrestre',
    16: 'Paix, justice et institutions efficaces', 17: 'Partenariats pour la réalisation des objectifs',
  },
}

/* ── Shell strings (footer) ───────────────────────────────────────── */

const SHELL_STRINGS: Record<ReportLocale, { footer: string }> = {
  en: { footer: 'Generated by DEUS · Confidential' },
  nl: { footer: 'Gegenereerd door DEUS · Vertrouwelijk' },
  de: { footer: 'Erstellt von DEUS · Vertraulich' },
  es: { footer: 'Generado por DEUS · Confidencial' },
  fr: { footer: 'Généré par DEUS · Confidentiel' },
}

/* ── Public API ───────────────────────────────────────────────────── */

/** Localized report label strings for the given locale (2-letter code or
 *  BCP-47 tag). Falls back to English for unknown locales. The returned
 *  map also carries the 17 SDG goal names under `sdg1`..`sdg17` so the
 *  generator can localize SDG_LABELS without a second lookup. */
export function getReportStrings(locale: string): Record<string, string> {
  const loc = normalizeLocale(locale)
  const base = STRINGS[loc]
  const sdg = SDG_LABELS_BY_LOCALE[loc]
  const withSdg: Record<string, string> = { ...base }
  for (let n = 1; n <= 17; n++) withSdg[`sdg${n}`] = sdg[n]
  return withSdg
}

/** Localized shell strings (footer copy) for the given locale.
 *  Falls back to English for unknown locales. */
export function getReportShellStrings(locale: string): { footer: string } {
  return SHELL_STRINGS[normalizeLocale(locale)]
}
