import type { Metadata } from "next";
import { Ventures } from "@/components/sections/Ventures";

export const metadata: Metadata = {
  title: "Work — revenue engines, live in the field",
  description:
    "Live products under Juan Diaz LLC — each one the five-phase playbook applied to a real sector.",
};

export default function WorkPage() {
  return (
    <>
      <header className="page-hero">
        <div className="eyebrow">◉ The work</div>
        <h1>The playbook, <em>in motion.</em></h1>
        <p>
          Each of these products is the five-phase method applied to a real sector with real
          operators and a real P&amp;L. They&apos;re proof, not pitch — visit any of them.
        </p>
      </header>
      <Ventures />
    </>
  );
}
