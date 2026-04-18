import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Diaz · Command", template: "%s · Diaz" },
  description: "Juan's master command surface across every Juan Diaz LLC venture.",
  robots: { index: false, follow: false },
};

export default function DiazLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
