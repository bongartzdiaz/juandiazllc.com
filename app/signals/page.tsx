import type { Metadata } from "next";
import { Signals } from "@/components/sections/Signals";

export const metadata: Metadata = {
  title: "Signals — field notes and build logs",
  description:
    "Short essays on designing operator tools, shipping dashboards that survive real environments, and running small studios at speed.",
};

export default function SignalsPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ Signals</div>
        <h1>Field notes, build <em>logs.</em></h1>
        <p>
          Writing is a lagging indicator of real work. These are the operating notes I&apos;d want a
          new hire, partner, or client to read before we start. More pieces arrive when they&apos;re ready
          — not before.
        </p>
      </header>
      <Signals />
    </>
  );
}
