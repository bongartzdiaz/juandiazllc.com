// FAQ content keyed by page or sector. Answer-box-optimized: every answer
// starts with a definitive sentence so AI overviews can extract a clean
// 1-line citation. Keep answers under 300 chars each — longer and the
// citation gets truncated mid-thought.

import type { FaqItem } from "./schema";

export const HOME_FAQ: FaqItem[] = [
  {
    q: "What does Juan Diaz, LLC actually do?",
    a: "Juan Diaz, LLC builds revenue engines for operators — the CRM, automations and growth infrastructure that turn a team of humans plus software into a compounding system. We operate as a holding company with internal ventures (Philly CRM, Voltafy, Help Mij Besparen) and a small number of operator engagements per year.",
  },
  {
    q: "Which industries do you work with?",
    a: "Energy (installers, solar, batteries), real estate (brokerages, property management), hospitality (multi-location), and operator-heavy adjacent industries like logistics, trades and home services. The common thread is a field team that generates revenue and an office that tries to make sense of it.",
  },
  {
    q: "Do you build from scratch or configure existing tools?",
    a: "Both — we match the tool to the job. Core workflows that differentiate your business get built (or heavily customised). Commodity workflows (email, accounting, payroll) get the cheapest reliable tool that does not break your data contracts. The moat lives in the integration layer plus two or three core flows — not in owning every seat of every SaaS.",
  },
  {
    q: "What is a blueprint call?",
    a: "A free 30-minute call where we map your current revenue flow end-to-end and identify the two or three leverage points. Blunt, structured, no slides. You leave with a one-page diagnosis regardless of whether we work together afterwards.",
  },
  {
    q: "Where are you based?",
    a: "Operating out of the Netherlands with clients across the EU and occasional US engagements. Remote-first, with on-site time for discovery and rollouts when it moves the needle.",
  },
];

export const BRAND_FAQ: FaqItem[] = [
  {
    q: "What does Juan Diaz, LLC do?",
    a: "Juan Diaz, LLC builds revenue engines for operators — CRM, automation, and growth infrastructure for companies in energy, real estate, hospitality and adjacent industries. Engagement is advisory-plus-build: blueprint, then ship.",
  },
  {
    q: "Who is the right client for a blueprint call?",
    a: "Operator-founders of 10-to-50-person companies whose growth is bottlenecked by missing systems rather than missing demand. Typical profile: profitable, manual, and ready to stop running the business out of WhatsApp and memory.",
  },
  {
    q: "How is Juan Diaz, LLC different from a typical consultancy?",
    a: "We ship the systems we recommend. Every engagement ends with working software — usually a tailored build on top of Philly (our operator CRM) — not a slide deck. Consulting-to-code ratio is roughly 30/70.",
  },
  {
    q: "Which regions do you serve?",
    a: "Primary markets are the Netherlands, Germany, Spain and the United States. Delivery is remote-first with on-site kickoff when the engagement justifies travel. Content and dashboards ship in English, Dutch, German and Spanish.",
  },
  {
    q: "How does pricing work?",
    a: "Blueprint calls are free. Paid engagements are priced per outcome, not per hour — typically a fixed fee for the first 90 days (strategy + build) followed by a monthly retainer for operations. Expect five figures; we are not the cheapest option.",
  },
];

export const CONTACT_FAQ: FaqItem[] = [
  {
    q: "How fast do you reply?",
    a: "Within 24 hours on weekdays, often sooner. Blueprint calls are typically scheduled within one business week.",
  },
  {
    q: "What happens on a blueprint call?",
    a: "A 30-minute structured conversation: current bottleneck, what you've already tried, what a working system would look like. You leave with a two-page written plan within 48 hours, whether or not we work together.",
  },
  {
    q: "Do you sign NDAs?",
    a: "Yes — a mutual NDA is available on request and we often initiate it ourselves for sensitive commercial conversations. Standard 2-year term.",
  },
  {
    q: "Can we start small?",
    a: "Yes. Many engagements begin with a 30-day diagnostic sprint so both sides can de-risk before committing to a build. The diagnostic is charged as a flat fee and the full scope is quoted afterward.",
  },
];

export const SECTOR_FAQ: Record<string, FaqItem[]> = {
  energy: [
    {
      q: "Do you work with solar and battery installers?",
      a: "Yes. Energy is our largest sector — solar installers, battery resellers, heat-pump operators and hybrid installers. Typical build: WhatsApp-first lead qualification, energy-consumption reporting, installer dispatch and commissioning.",
    },
    {
      q: "How does the salderingsregeling change things?",
      a: "The Dutch net-metering phase-out in 2027 shifts the sale from price to payback — which means your funnel needs a rendementsgesprek layer, not just a price quote. We build that layer: per-lead consumption reports and battery upsell integration.",
    },
    {
      q: "Can you integrate with existing ERP or field-service tools?",
      a: "Yes. Common integrations include Exact, Afas, Twinfield, Moneybird and bespoke field-service apps. When integrations don't exist we build them — typically a thin sync layer that keeps each tool as the system of record for its own domain.",
    },
  ],
  "real-estate": [
    {
      q: "Is this aimed at brokerages or at individual agents?",
      a: "Both, but the sweet spot is teams of 3-to-25 agents at a single brokerage. Solo agents get better value from off-the-shelf tools; national franchises need enterprise systems we do not build.",
    },
    {
      q: "Do you integrate with MLS feeds?",
      a: "Yes. Philly ingests MLS feeds for the Netherlands (Funda/NVM) and US (IDX/RESO). Each listing becomes a first-class object inside the CRM with offers, showings, open houses and commissions attached.",
    },
    {
      q: "What about sphere-of-influence (SOI) and referrals?",
      a: "SOI is a core Philly module. It scores every past client and dormant lead on recency, referral velocity and deal propensity, then surfaces a daily shortlist of accounts to reach out to. Built for agents who want referrals without a CRM fight.",
    },
  ],
  hospitality: [
    {
      q: "Do you build PMS systems?",
      a: "Not from scratch — we integrate with Mews, Cloudbeds and Apaleo. We build the revenue and guest-intelligence layer on top: AI-driven pricing, upsell orchestration, direct-booking funnels and the reporting that actually reaches the GM.",
    },
    {
      q: "What about short-term rentals?",
      a: "We work with STR operators managing 10-plus units. Typical build: channel-manager sync, automated guest messaging, dynamic pricing, cleaning roster and an ops dashboard the on-the-ground team actually opens.",
    },
    {
      q: "Can you do F&B and events alongside rooms?",
      a: "Yes. Mixed-use operators (boutique hotel with restaurant and private events) are one of our highest-value profiles. We wire rooms, covers and events into one revenue view so the GM sees the full picture in one screen.",
    },
  ],
  adjacent: [
    {
      q: "What counts as 'adjacent'?",
      a: "Sectors that share operator DNA with our primary three — construction, professional services, specialty retail, philanthropy and family offices. If your business is revenue-driven, team-operated and data-fragmented, it probably fits.",
    },
    {
      q: "Is this a fit for non-profits?",
      a: "Yes — specifically operator-run foundations and mid-size grant-makers. Philly has a philanthropy module covering donor scoring, grant lifecycles, impact metrics and volunteer rostering.",
    },
    {
      q: "Can you help with family-office operations?",
      a: "Yes. Typical builds: deal-flow intake, LP relationship management, cross-entity reporting, secure document vault. Not tax or audit — we partner with accountants on those.",
    },
  ],
};
