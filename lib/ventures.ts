export type Venture = {
  slug: string;
  name: string;
  tagline: string;
  sector: string;
  // Canonical sector-page slug (lib/sectors.ts) this build belongs to.
  // Drives the /work/[slug] → /sectors/[slug] cross-link.
  sectorSlug: string;
  status: "live" | "shipping" | "reserved";
  domain: string;
  external: string;
  summary: string;
  story: string;
  phases: { title: string; body: string }[];
  stack: string[];
  metrics: { label: string; value: string; hint?: string }[];
  relatedSectors: string[];
  gradient: string;
};

export const VENTURES: Venture[] = [
  {
    slug: "voltafy",
    name: "Voltafy",
    tagline: "The platform layer.",
    sector: "Energy",
    sectorSlug: "energy",
    status: "live",
    domain: "voltafy.nl",
    external: "https://voltafy.nl",
    summary:
      "Energy intelligence for Dutch households and installers. Live monitoring, yield analytics, and a tight operator interface for the people keeping solar and battery systems honest.",
    story:
      "Voltafy is the flagship of the holding — the platform that the other three energy products all connect back to. It's what I'd want if I were an installer managing hundreds of systems or a household that refuses to accept vendor-friendly numbers. The interface is deliberately operator-first: keyboard-first where it matters, readable at 3am, and built so that the uncomfortable truth about a system's performance is the first thing you see, not the last.",
    phases: [
      { title: "Survey", body: "Rode along with installers, sat in on owner calls, mapped every data source the Dutch grid exposes and every one it refuses to." },
      { title: "Blueprint", body: "Designed the schema and the operator flows before writing a single line of product UI. Every screen maps to a decision somebody actually has to make." },
      { title: "Build", body: "Shipped the platform surface, the live monitoring backbone, and the installer workspace. Fast, honest, unopinionated about which vendor you use." },
      { title: "Commission", body: "Stress-tested against bad network conditions, partial outages, and the messy reality of mixed-vendor fleets. Nothing goes live until it survives the edge cases." },
      { title: "Operate", body: "Tuning weekly. Shipping incremental improvements straight from installer feedback — this product only gets sharper the more it runs." },
    ],
    stack: ["Next.js", "Supabase", "Postgres", "TypeScript", "Three.js", "Resend"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Energy" },
      { label: "Launched", value: "2024" },
      { label: "Market", value: "NL" },
    ],
    relatedSectors: ["Energy", "Installers", "Grid"],
    gradient: "radial-gradient(600px 400px at 20% 20%, rgba(94,255,177,.22), transparent 60%)",
  },
  {
    slug: "performance-tracker",
    name: "Performance Tracker",
    tagline: "See what your system is really doing.",
    sector: "Energy / Dashboard",
    sectorSlug: "energy",
    status: "live",
    domain: "performancetracker.nl",
    external: "https://performancetracker.nl",
    summary:
      "Real-time yield, loss analysis, and alerts for solar owners and installers. Honest numbers, no vendor spin. If your system is underperforming, this tells you — in plain Dutch, with the fix attached.",
    story:
      "Most performance dashboards are built by the same companies selling you the hardware. Performance Tracker is the adversarial counterpart: it exists to tell you what your system is actually doing, in language a homeowner can read and a quote a technician can quote. That framing changed everything about how the product looks and feels.",
    phases: [
      { title: "Survey", body: "Surveyed a few dozen owners who had bought solar in the previous five years and asked them one question: do you trust the number you see? The answer was almost always no." },
      { title: "Blueprint", body: "Designed around two primary users: the homeowner who wants one number, and the installer who wants twenty. Same data, two views, no compromise." },
      { title: "Build", body: "A customer-journey pipeline synced hourly with the CRM that runs much of the Dutch solar trade — with gap detectors, retry queues and a dead-letter table so no lead or status change silently disappears." },
      { title: "Commission", body: "Stress-tested against the API's undocumented limits and permission quirks — a sync layer that fails loudly beats one that fails politely." },
      { title: "Operate", body: "Daily integrity checks and a growing playbook of edge cases. The honest number wins compound trust over time." },
    ],
    stack: ["Next.js", "Postgres", "TimescaleDB", "TypeScript", "Recharts"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Energy" },
      { label: "Users", value: "Owners + installers" },
      { label: "Market", value: "NL" },
    ],
    relatedSectors: ["Energy", "Homeowners", "Installers"],
    gradient: "radial-gradient(600px 400px at 80% 20%, rgba(125,211,252,.18), transparent 60%)",
  },
  {
    slug: "help-mij-besparen",
    name: "Help Mij Besparen",
    tagline: "Lower your energy bill, in plain Dutch.",
    sector: "Energy / Consumer",
    sectorSlug: "energy",
    status: "live",
    domain: "helpmijbesparen.nl",
    external: "https://helpmijbesparen.nl",
    summary:
      "A calm, honest tool that tells Dutch households exactly where their money is leaking — and the moves that actually fix it. No affiliate noise, no fear-mongering, no dashboards that require a degree.",
    story:
      "Dutch energy bills in 2025 looked like a ransom note. Everywhere you turned, a confused household was being pitched a new contract, a new loan, a new insulation package. Help Mij Besparen is the antidote: a simple, opinionated tool that looks at your actual situation and says what would actually save money. Sometimes that's a heat pump. Often it's not. The point is honesty, delivered at the reading level of a tired person at their kitchen table.",
    phases: [
      { title: "Survey", body: "Collected a few hundred energy bills, invoices, and quotes that households had been sent. The gap between what was promised and what was reasonable was the whole product opportunity." },
      { title: "Blueprint", body: "Designed the flow around the tiredness of the user. No jargon, no chrome, no upsells." },
      { title: "Build", body: "A progressive intake that adapts to what the household actually has, paired with a calculator that doesn't cheat in favor of any vendor." },
      { title: "Commission", body: "Tested with mixed-income households across the country. If it couldn't work for a grandmother in Zwolle, it wasn't done." },
      { title: "Operate", body: "Updated as tariffs and rules change. Every time the rules move, this product gets a new weekend of attention." },
    ],
    stack: ["Next.js", "TypeScript", "Supabase", "Forms-by-hand"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Consumer" },
      { label: "Audience", value: "Dutch households" },
      { label: "Language", value: "Dutch" },
    ],
    relatedSectors: ["Energy", "Consumer", "Policy"],
    gradient: "radial-gradient(600px 400px at 50% 10%, rgba(255,181,71,.15), transparent 60%)",
  },
  {
    slug: "salderingsregeling-2027",
    name: "Salderingsregeling 2027",
    tagline: "The phase-out, explained.",
    sector: "Energy / Policy",
    sectorSlug: "energy",
    status: "live",
    domain: "salderingsregeling2027.nl",
    external: "https://salderingsregeling2027.nl",
    summary:
      "The public field guide to the Dutch net-metering change. What it means, when it hits, and what solar owners should actually do about it. Free, apolitical, updated when the rules shift.",
    story:
      "On January 1, 2027, the Dutch net-metering rule (salderingsregeling) that made rooftop solar a no-brainer for a decade ends. Millions of households will wake up on a different economic grid, and most of them have no idea. This product is the field guide — built to be the first thing you find when you search for answers, and the last thing you need to read before you act.",
    phases: [
      { title: "Survey", body: "Read every government communication, every energy-supplier notice, and every forum thread. Nobody was explaining this in a way a household could read in five minutes." },
      { title: "Blueprint", body: "Scoped a simple explainer with a calculator slotted in — enough to turn fear into a decision." },
      { title: "Build", body: "Shipped fast: clear language, one calculator, three branching outcomes, zero ads." },
      { title: "Commission", body: "Had actual homeowners read it before we launched. If they came away with one clear next action, it passed." },
      { title: "Operate", body: "Updates every time the rules change. This page stays authoritative or it doesn't deserve the URL." },
    ],
    stack: ["Next.js", "MDX", "TypeScript"],
    metrics: [
      { label: "Status", value: "Live" },
      { label: "Sector", value: "Policy / Energy" },
      { label: "Audience", value: "Solar owners" },
      { label: "Updates", value: "Rolling" },
    ],
    relatedSectors: ["Energy", "Policy", "Consumer"],
    gradient: "radial-gradient(600px 400px at 50% 80%, rgba(94,255,177,.16), transparent 60%)",
  },
  {
    slug: "philly",
    name: "Philly",
    tagline: "The US ops dashboard.",
    sector: "Logistics / Field",
    sectorSlug: "adjacent",
    status: "shipping",
    domain: "philly.juandiazllc.com",
    external: "/app",
    summary:
      "The stateside sibling. Field-first interface for ground teams — dispatch, routing, live status, built to stay alive on bad networks. The first product under Juan Diaz, LLC's US arm.",
    story:
      "Philly is the first product I'm shipping with the US as the primary market. Everything I learned building operator tooling in the Dutch energy vertical transfers — the same five phases, the same refusal to lie to the person doing the actual work. What changes is the physicality: American field operations live on long distances, bad coverage, and trucks that have been running since before the software was written. That's the constraint that shapes everything.",
    phases: [
      { title: "Survey", body: "Shadowing dispatchers and ride-alongs with ground teams. Watching what people do when the software breaks — which it always does." },
      { title: "Blueprint", body: "Designed around offline-first state, tap-friendly flows, and the idea that the truck is always more authoritative than the server." },
      { title: "Build", body: "In progress. Shipping the dispatch surface first, the field client second, the operator hub third." },
      { title: "Commission", body: "Pending — will ship to a pilot team before opening up." },
      { title: "Operate", body: "Post-pilot — weekly operating rhythm with the ground teams themselves." },
    ],
    stack: ["Next.js", "Supabase", "TypeScript", "PWA"],
    metrics: [
      { label: "Status", value: "Shipping" },
      { label: "Sector", value: "Field ops" },
      { label: "Market", value: "US" },
      { label: "Pilot", value: "2026" },
    ],
    relatedSectors: ["Logistics", "Field services", "Dispatch"],
    gradient: "radial-gradient(600px 400px at 70% 70%, rgba(125,211,252,.22), transparent 60%)",
  },
];

export function getVenture(slug: string) {
  return VENTURES.find((v) => v.slug === slug);
}

// Maps an insight tag ("Energy", "Systems", etc.) to the venture that
// most clearly demonstrates the idea in production. Used on insight
// pages to give readers a "see it in the wild" link — concrete proof
// instead of just more writing.
const TAG_TO_VENTURE: Record<string, string> = {
  Energy: "voltafy",
  Systems: "philly",
  Growth: "help-mij-besparen",
  Strategy: "philly",
};

export function getVentureForTag(tag: string) {
  const slug = TAG_TO_VENTURE[tag];
  return slug ? getVenture(slug) : undefined;
}
