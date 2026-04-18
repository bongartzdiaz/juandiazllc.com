import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Red_Hat_Mono } from "next/font/google";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ClientLayout } from "@/components/phily/layout/ClientLayout";
import "./phily.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

const redHatMono = Red_Hat_Mono({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-red-hat-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Diaz · Dashboard", template: "%s · Diaz Dashboard" },
  description: "Juan Diaz LLC operations dashboard.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function PhilyDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/diaz/login?next=/diaz/dashboard");

  return (
    <div className={`${jakarta.variable} ${redHatMono.variable}`} data-theme="light">
      <ClientLayout>{children}</ClientLayout>
    </div>
  );
}
