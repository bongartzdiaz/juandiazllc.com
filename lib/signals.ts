export type Signal = {
  slug: string;
  date: string; // ISO
  dateLabel: string; // short display
  tag: string;
  readTime: string;
  title: string;
  excerpt: string;
  body: { type: "p" | "h2" | "quote" | "list"; text: string | string[] }[];
};

export const SIGNALS: Signal[] = [
  {
    slug: "instruments-not-saas",
    date: "2026-04-12",
    dateLabel: "2026.04 · Essay",
    tag: "Design",
    readTime: "6 min read",
    title: "Why operator tools should feel like instruments, not SaaS.",
    excerpt:
      "A pilot doesn't want a dashboard. A pilot wants an altimeter. Most software for operators has confused those two things for fifteen years.",
    body: [
      { type: "p", text: "I spent a long time watching field operators use software before I realized what they actually want it to be. They don't want a dashboard. They want an altimeter." },
      { type: "p", text: "Dashboards assume you have the time to look around. An altimeter assumes you need one number, now, and that number had better be right. Almost all operator software is built as the former. Almost all operators would pay more for the latter." },
      { type: "h2", text: "What instruments actually are." },
      { type: "p", text: "An instrument has three properties that almost no SaaS product has. The primary number is exactly where your eye lands first. The secondary numbers are available but never in front. And the whole thing reads correctly when you're distracted, tired, or out of context." },
      { type: "p", text: "None of that is a design preference. It's a consequence of the environment. A cockpit has finite attention. A control room has finite attention. A Friday night at a busy hotel front desk has finite attention. The software that survives those environments is the software designed around attention scarcity, not feature richness." },
      { type: "h2", text: "The test I run." },
      { type: "quote", text: "Can the operator pull the one number they need in three seconds, on bad lighting, while someone is talking to them? If not, it's not an instrument yet." },
      { type: "p", text: "Every product I've shipped for operators runs that test before anything else. Voltafy. Performance Tracker. Philly. If you can't pass the three-second rule, every other design decision is downstream of the wrong priority." },
      { type: "h2", text: "Why this matters commercially." },
      { type: "p", text: "SaaS has trained an entire generation of builders to optimize for feature velocity. That's the right optimization for the tools people choose to use. It's the wrong optimization for the tools people are forced to use. Operators are forced to use their software. That changes what good means." },
      { type: "p", text: "The business outcome, in my experience: when you stop trying to be a dashboard and start trying to be an instrument, adoption goes up and support tickets drop. Operators stop fighting the tool and start leaning on it. That's when revenue starts compounding from retained attention instead of churned trials." },
    ],
  },
  {
    slug: "five-phases",
    date: "2026-03-20",
    dateLabel: "2026.03 · Build log",
    tag: "Method",
    readTime: "7 min read",
    title: "Every business is a construction project. Here's the five-phase build plan.",
    excerpt:
      "Construction managers know something most SaaS founders don't: you can't ship a building on vibes. The method transfers cleanly to revenue engines — and here's exactly how.",
    body: [
      { type: "p", text: "When I trained as a construction manager, the lesson that stuck hardest wasn't about concrete or schedules or bills of quantities. It was the five-phase rhythm: Survey, Blueprint, Build, Commission, Operate." },
      { type: "p", text: "You can't ship a building on vibes. Every building that got shipped ran that rhythm or something structurally identical. Skip a phase and the building gets finished late, over budget, or — worst of all — finished on time and quietly wrong." },
      { type: "p", text: "What I've realized building operator tools is that every business runs the same rhythm too. Most just don't know it, so they skip phases and wonder why the revenue leaks." },
      { type: "h2", text: "01 — Survey" },
      { type: "p", text: "Before you build anything, walk the site. In a building that means levels, soil, existing services, neighbor constraints. In a business it means: shadow the operators, read the last quarter's data, find the workarounds, capture the tribal knowledge. Every real plan starts with seeing what's actually there." },
      { type: "h2", text: "02 — Blueprint" },
      { type: "p", text: "Draw the plan. Sequence the moves. Every phase has a number attached — how long, how much, who's responsible. In construction this is the drawing set. In a business it's the build plan that a contractor (or a new hire) could read and execute without asking you what you meant." },
      { type: "p", text: "Most businesses I meet have a strategy deck. Nobody has a blueprint. That's the gap." },
      { type: "h2", text: "03 — Build" },
      { type: "p", text: "Ship the systems that unlock the number. Dashboards, automations, products, whole engines. In construction: pour concrete, frame the building, run the services. In a business: ship operator surfaces that run when nothing else does." },
      { type: "h2", text: "04 — Commission" },
      { type: "p", text: "This is the phase most teams skip and it's where the most revenue evaporates. You stress-test. Verify every number. Run the edges. Nothing gets called 'live' until the system is honest under load. In construction, commissioning is why the heating works when the first tenant moves in. In a business, commissioning is why the dashboard tells the truth when the first customer asks for a quote." },
      { type: "h2", text: "05 — Operate" },
      { type: "p", text: "A building doesn't stop working once the ribbon is cut. Neither does a revenue engine. Phase five is the control room: monitor, tune, improve weekly. The operators who win long term are the ones who treat operations as a living discipline, not a project that finished." },
      { type: "h2", text: "The compounding effect." },
      { type: "p", text: "Every skipped phase becomes a tax you pay later, with interest. Survey you skip becomes surprise-cost in Build. Blueprint you skip becomes rework in Commission. Commission you skip becomes damage to customer trust in Operate. The businesses that look effortless from the outside are the ones that never took the shortcut." },
    ],
  },
  {
    slug: "holding-as-container",
    date: "2026-02-18",
    dateLabel: "2026.02 · Note",
    tag: "Operations",
    readTime: "4 min read",
    title: "A holding company as a creative container.",
    excerpt:
      "Starting a holding for my work changed more than the legal wrapper. It changed what I was willing to build — and what I wasn't.",
    body: [
      { type: "p", text: "Setting up Juan Diaz, LLC was on my list for a long time before I actually did it. When I finally moved, the thing that surprised me was how much the legal structure changed the creative work, not just the accounting." },
      { type: "p", text: "Before the holding existed, every new product had to justify itself as a business in isolation. Voltafy had to be a company. Performance Tracker had to be a company. Each had to carry its own overhead, its own brand, its own survival." },
      { type: "p", text: "Once there was a holding, the calculation flipped. Each product could be a product. The holding was the business. That tiny change — product instead of company — rearranged what was worth building." },
      { type: "h2", text: "The products got braver." },
      { type: "p", text: "The first visible effect was that I started shipping more specific, more opinionated tools. Salderingsregeling 2027 wouldn't be a business. As a free public guide under the holding, it makes perfect sense. Help Mij Besparen wouldn't pass a venture-scale business test either. Under the holding, it earns its keep by strengthening the overall portfolio's credibility." },
      { type: "h2", text: "The positioning got cleaner." },
      { type: "p", text: "When the holding is the brand, every individual product inherits the holding's credibility. The five-phase playbook that runs through everything becomes a throughline, not a marketing claim. Customers on one product feel the trust that was earned on another." },
      { type: "h2", text: "The creative container effect." },
      { type: "p", text: "The thing I didn't expect: the holding made me a better builder. Because everything lives under one name, the output has to age well. No short-term trend-chasing. No one-off experiments that would embarrass the holding in two years. The structure enforces a longer time horizon than any internal discipline could." },
      { type: "quote", text: "A holding is not a legal wrapper. It's a creative discipline dressed as a tax structure." },
      { type: "p", text: "If you're a solo operator shipping more than one thing, start the holding. Not for the accounting. For the way it rearranges what you'll let yourself build." },
    ],
  },
];

export function getSignal(slug: string) {
  return SIGNALS.find((s) => s.slug === slug);
}
