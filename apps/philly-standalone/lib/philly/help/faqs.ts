/* FAQ catalog — the questions a BE/FR real-estate prospect asks
   BEFORE they sign up.
   ──────────────────────────────────────────────────────────────────
   The questions live HERE (TypeScript structure) but the actual Q + A
   strings live in messages/{locale}.json under `help.faqs.{category}.
   {questionId}.{q|a}`. This split lets us:
     - Add a new question: 1 TS edit + 5 i18n edits (one per locale)
     - Reorder/recategorize: TS edit only, no string churn
     - A11y / SEO: server-rendered, every Q is a real <h3> tag

   When customer asks something not on this list:
     1. Document the answer somewhere reusable (Notion, etc.)
     2. If asked twice → promote to FAQ here
     3. If asked 5+ times → reorder it to top of category

   Linked from /help (UI in app/help/page.tsx). Listed in the sidebar
   nav once the FAQ page has ~5+ questions per category. */

export interface FAQCategory {
  id: 'pricing' | 'migration' | 'features' | 'compliance' | 'support'
  /** i18n key suffix under `help.categories.*`. */
  i18nKey: 'pricing' | 'migration' | 'features' | 'compliance' | 'support'
  questionIds: string[]
}

export const FAQ_CATEGORIES: FAQCategory[] = [
  {
    id: 'pricing',
    i18nKey: 'pricing',
    questionIds: ['tiers', 'change-tier', 'annual-discount', 'payment-methods'],
  },
  {
    id: 'migration',
    i18nKey: 'migration',
    questionIds: ['from-whise', 'data-import', 'onboarding-time', 'training'],
  },
  {
    id: 'features',
    i18nKey: 'features',
    questionIds: ['funda-integration', 'ai-features', 'whatsapp', 'template-customization'],
  },
  {
    id: 'compliance',
    i18nKey: 'compliance',
    questionIds: ['gdpr', 'data-residency', 'export-data', 'retention'],
  },
  {
    id: 'support',
    i18nKey: 'support',
    questionIds: ['contract-length', 'support-included', 'cancel-anytime', 'design-partner'],
  },
]

/** Total question count — useful for sanity checks across locale files. */
export const FAQ_QUESTION_COUNT = FAQ_CATEGORIES.reduce(
  (sum, cat) => sum + cat.questionIds.length,
  0,
)

/**
 * Build the flat list of i18n key paths a locale file MUST contain
 * for the FAQ to render. Used by the i18n-parity test.
 */
export function allFAQKeys(): string[] {
  const keys: string[] = []
  for (const cat of FAQ_CATEGORIES) {
    keys.push(`help.categories.${cat.i18nKey}`)
    for (const qid of cat.questionIds) {
      keys.push(`help.faqs.${cat.id}.${qid}.q`)
      keys.push(`help.faqs.${cat.id}.${qid}.a`)
    }
  }
  return keys
}
