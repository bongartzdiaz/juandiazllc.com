import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Story } from "@/components/sections/Story";
import { Sectors } from "@/components/sections/Sectors";
import { Process } from "@/components/sections/Process";
import { Kinetic } from "@/components/sections/Kinetic";
import { Chapters } from "@/components/sections/Chapters";
import { Ventures } from "@/components/sections/Ventures";
import { Stats } from "@/components/sections/Stats";
import { ResultsStrip } from "@/components/sections/ResultsStrip";
import { Signals } from "@/components/sections/Signals";
import { CtaBig } from "@/components/sections/CtaBig";
import { Contact } from "@/components/sections/Contact";

// FAQ schema — makes the landing page eligible for rich "people also
// ask" treatment in Google and feeds LLMs concrete Q/A pairs for AI
// search surfacing. Questions mirror what operators actually ask in
// the first call, so the answers stay truthful and specific.
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does Juan Diaz LLC actually do?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Juan Diaz LLC builds revenue engines for operators — the CRM, automations and growth infrastructure that turn a team of humans plus software into a compounding system. We operate as a holding company with internal ventures (Philly CRM, Voltafy, Help Mij Besparen) and a small number of operator engagements per year.",
      },
    },
    {
      "@type": "Question",
      name: "Which industries do you work with?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Energy (installers, solar, batteries), real estate (brokerages, property management), hospitality (multi-location), and operator-heavy adjacent industries like logistics, trades and home services. The common thread is a field team that generates revenue and an office that tries to make sense of it.",
      },
    },
    {
      "@type": "Question",
      name: "Do you build from scratch or configure existing tools?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Both — we match the tool to the job. Core workflows that differentiate your business get built (or heavily customised). Commodity workflows (email, accounting, payroll) get the cheapest reliable tool that does not break your data contracts. The moat lives in the integration layer plus two or three core flows — not in owning every seat of every SaaS.",
      },
    },
    {
      "@type": "Question",
      name: "What is a blueprint call?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A free 30-minute call where we map your current revenue flow end-to-end and identify the two or three leverage points. Blunt, structured, no slides. You leave with a one-page diagnosis regardless of whether we work together afterwards.",
      },
    },
    {
      "@type": "Question",
      name: "Where are you based?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Operating out of the Netherlands with clients across the EU and occasional US engagements. Remote-first, with on-site time for discovery and rollouts when it moves the needle.",
      },
    },
  ],
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Hero />
      <Marquee />
      <Story />
      <Sectors />
      <Process />
      <Kinetic />
      <Chapters />
      <Ventures />
      <Stats />
      <ResultsStrip />
      <Signals />
      <CtaBig />
      <Contact />
    </>
  );
}
