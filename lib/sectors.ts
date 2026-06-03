export type Sector = {
  slug: string;
  name: string;
  tagline: string;
  summary: string;
  // SEO-only overrides. The visible page uses name/tagline/summary
  // (brand voice); generateMetadata prefers these keyword-targeted
  // strings when present, falling back to name+tagline / summary.
  seoTitle?: string;
  seoDescription?: string;
  leaks: { title: string; body: string }[];
  playbook: { phase: string; applied: string }[];
  proof: { title: string; body: string; href?: string }[];
  tags: string[];
  cta: string;
  gradient: string;
};

export const SECTORS: Sector[] = [
  {
    slug: "energy",
    name: "Energy & solar",
    tagline: "The grid is about to change. Most operators are not ready.",
    seoTitle: "Energy & Solar Operations Consultant | Juan Diaz",
    seoDescription:
      "Fractional revenue operator and operations consultant for energy and solar operators — honest tooling, CRM and revenue systems built for the post-2027 grid.",
    summary:
      "Dutch households, installers, and grid operators are heading into the 2027 net-metering phase-out with software that was built for a different economic reality. Real revenue will be won by whoever ships honest tooling first.",
    leaks: [
      { title: "Vendor-friendly numbers", body: "Most performance dashboards are built by the company that sold you the system. The number you see is not the number that's real." },
      { title: "Pre-2027 assumptions", body: "Every ROI calculator and every customer journey still assumes salderingsregeling. That math is about to break for millions." },
      { title: "Installer tooling", body: "The field teams keeping these systems alive are managing fleets on spreadsheets. At 3am, on bad coverage, with vendor apps that don't talk to each other." },
    ],
    playbook: [
      { phase: "Survey", applied: "Ride along with installers. Read government comms. Map every inverter API the Dutch market actually exposes." },
      { phase: "Blueprint", applied: "Design the operator surface before the consumer surface. Every screen maps to a decision a human actually has to make." },
      { phase: "Build", applied: "Ship the platform layer that the consumer products all connect back to. Don't build four disconnected things — build one honest system." },
      { phase: "Commission", applied: "Stress-test across seasons, across regions, across weird mixed-vendor fleets. Honest numbers or nothing goes live." },
      { phase: "Operate", applied: "Update every time the regulations shift. Ship weekly from installer feedback, not roadmap theater." },
    ],
    proof: [
      { title: "Voltafy", body: "The flagship platform — energy intelligence for Dutch households and installers.", href: "/work/voltafy" },
      { title: "Performance Tracker", body: "Honest yield numbers for owners and installers.", href: "/work/performance-tracker" },
      { title: "Salderingsregeling 2027", body: "Public field guide to the phase-out.", href: "/work/salderingsregeling-2027" },
    ],
    tags: ["Solar", "Installers", "Metering", "Post-2027"],
    cta: "Your installer operation needs a blueprint?",
    gradient: "radial-gradient(600px 400px at 20% 20%, rgba(94,255,177,.22), transparent 60%)",
  },
  {
    slug: "real-estate",
    name: "Real estate",
    tagline: "Numbers the asset manager can actually trust.",
    seoTitle: "Real Estate Operations Consultant | Juan Diaz",
    seoDescription:
      "Operations consultant and fractional revenue operator for real estate — unified portfolio data, ESG reporting and asset numbers the manager can actually trust.",
    summary:
      "Real estate runs on numbers that everyone quietly knows are wrong. Utilities data is patchy, tenant ops live in email threads, ESG reporting is produced under deadline pressure once a year. The operators know — the software doesn't.",
    leaks: [
      { title: "Portfolio blindness", body: "You cannot compare two assets on the dimensions that matter because the data came from two different property managers with two different definitions." },
      { title: "Retrofit math fiction", body: "ROI models for insulation, heat pumps, solar are built on regional assumptions that don't match the actual building." },
      { title: "Tenant ops in email", body: "Service requests, maintenance history, tenant sentiment — all locked in inboxes no one reads fully." },
      { title: "ESG as a scramble", body: "Once-a-year panic to produce numbers that should have been live all along." },
    ],
    playbook: [
      { phase: "Survey", applied: "Site visits. Property manager interviews. Read the last five ESG reports and find where the data came from." },
      { phase: "Blueprint", applied: "Unified asset model across every property manager's data format. Define the numbers first, then build the UI." },
      { phase: "Build", applied: "Portfolio dashboard that works for the asset manager AND the ops team. Same source of truth." },
      { phase: "Commission", applied: "Verify every aggregate against the underlying utility bills. If the dashboard disagrees with the invoice, the dashboard is wrong." },
      { phase: "Operate", applied: "Weekly cadence with the ops team. ESG reporting becomes a live surface, not an annual fire drill." },
    ],
    proof: [
      { title: "Available", body: "Looking for the first live real estate portfolio engagement. Early collaborations get named as founding partners." },
    ],
    tags: ["Retrofit", "Portfolio", "Tenant ops", "ESG"],
    cta: "Running a portfolio on trust and spreadsheets?",
    gradient: "radial-gradient(600px 400px at 70% 30%, rgba(125,211,252,.18), transparent 60%)",
  },
  {
    slug: "hospitality",
    name: "Hospitality & revenue",
    tagline: "From gut-feel pricing to an honest instrument.",
    seoTitle: "Hospitality Revenue & Operations Consultant | Juan Diaz",
    seoDescription:
      "Revenue operations consultant for hospitality operators — channel intelligence, a pricing instrument and frontline tools that replace gut-feel decisions.",
    summary:
      "Hospitality is one of the few industries where the revenue manager still makes call-by-call judgment decisions without a real instrument to check them against. The biggest margin lives in the 10 minutes before check-in, and most of it is slipping through on gut feel.",
    leaks: [
      { title: "Channel chaos", body: "OTAs, direct, corporate rates, seasonal promos — all managed in five dashboards that don't reconcile." },
      { title: "Revenue blindness", body: "You know this week's numbers. You don't know why. By the time you do, the next week is already pricing." },
      { title: "Staff tooling", body: "Frontline staff — the people who actually make the guest experience happen — are on systems built for the 2010s." },
      { title: "Guest data not used", body: "Every guest touchpoint is a data point. Almost none of it flows back to the next stay." },
    ],
    playbook: [
      { phase: "Survey", applied: "Shadow the revenue manager through a full pricing cycle. Watch the front desk on a Friday night. Map every system touched." },
      { phase: "Blueprint", applied: "Single operator surface with three views: revenue, channels, staff. Same data, role-specific." },
      { phase: "Build", applied: "Live channel intelligence, a pricing instrument the revenue manager trusts, and frontline tools staff actually want to open." },
      { phase: "Commission", applied: "Run in parallel to the existing process for two cycles. Prove the number before flipping the default." },
      { phase: "Operate", applied: "Weekly tune with the revenue manager. Quarterly review with operations. Guest data loop closes at checkout." },
    ],
    proof: [
      { title: "Available", body: "Open to the first hospitality operator who wants to build the instrument instead of buying another dashboard." },
    ],
    tags: ["Revenue ops", "Channels", "Staff", "Guest data"],
    cta: "Pricing on gut feel is costing you — let's measure it.",
    gradient: "radial-gradient(600px 400px at 30% 70%, rgba(255,181,71,.15), transparent 60%)",
  },
  {
    slug: "adjacent",
    name: "Adjacent sectors",
    tagline: "Anywhere operators have a P&L and bad software.",
    seoTitle: "Operations Consultant for Operators | Juan Diaz",
    seoDescription:
      "Fractional revenue operator and operations consultant for logistics, retail and field-service operators running real P&Ls on software that lies to them.",
    summary:
      "Logistics, retail, field services, frontier industries — the five-phase method doesn't care what industry your building sits in. If there are operators running real operations against a real P&L on software that lies to them, the playbook applies.",
    leaks: [
      { title: "Tooling that's a decade behind", body: "The operators doing the hardest work are often the ones handed the oldest software." },
      { title: "Data silos", body: "The dispatcher knows things the analyst doesn't. The analyst knows things the exec doesn't. Nobody's sharing." },
      { title: "Tribal knowledge", body: "The thing that keeps the operation alive is in one person's head. When they leave, chaos." },
    ],
    playbook: [
      { phase: "Survey", applied: "Same as always: walk the site, watch the work, find the workarounds, capture the tribal knowledge." },
      { phase: "Blueprint", applied: "Design for the person doing the work, not the person reporting on it." },
      { phase: "Build", applied: "Ship the surface that matters first. The analytics can come later — the ops team needs tools now." },
      { phase: "Commission", applied: "Break it on purpose. Bad networks. Mid-shift changes. Every edge case the ops team already knows is coming." },
      { phase: "Operate", applied: "Weekly rhythm. Forever." },
    ],
    proof: [
      { title: "Philly", body: "First US adjacent build — field ops dashboard for ground teams.", href: "/work/philly" },
    ],
    tags: ["Field ops", "Fleet", "Retail", "Services"],
    cta: "Your operators are stuck on bad software?",
    gradient: "radial-gradient(600px 400px at 50% 50%, rgba(94,255,177,.16), transparent 60%)",
  },
];

export function getSector(slug: string) {
  return SECTORS.find((s) => s.slug === slug);
}
