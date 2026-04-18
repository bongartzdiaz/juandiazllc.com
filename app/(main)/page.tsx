import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/sections/Marquee";
import { Story } from "@/components/sections/Story";
import { Sectors } from "@/components/sections/Sectors";
import { Process } from "@/components/sections/Process";
import { Kinetic } from "@/components/sections/Kinetic";
import { Chapters } from "@/components/sections/Chapters";
import { Ventures } from "@/components/sections/Ventures";
import { Stats } from "@/components/sections/Stats";
import { Signals } from "@/components/sections/Signals";
import { CtaBig } from "@/components/sections/CtaBig";
import { Contact } from "@/components/sections/Contact";

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee />
      <Story />
      <Sectors />
      <Process />
      <Kinetic />
      <Chapters />
      <Ventures />
      <Stats />
      <Signals />
      <CtaBig />
      <Contact />
    </>
  );
}
