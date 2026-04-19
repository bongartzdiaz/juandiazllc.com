import type { Metadata } from "next";
import { NotFoundBody } from "@/components/NotFoundBody";

export const metadata: Metadata = {
  title: "Not found — 404",
  description: "The page you were looking for does not exist.",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return <NotFoundBody />;
}
