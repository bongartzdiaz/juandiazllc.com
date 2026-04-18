/**
 * Per-user welcome greeting.
 * Reads preferred_locale from user_metadata (set in Supabase Auth),
 * falls back to 'en'. Time-of-day aware.
 */
type GreetLocale = "en" | "nl" | "de" | "es";

const GREETINGS: Record<GreetLocale, { morning: string; afternoon: string; evening: string; default: string }> = {
  en: { morning: "Good morning", afternoon: "Good afternoon", evening: "Good evening", default: "Welcome" },
  nl: { morning: "Goedemorgen", afternoon: "Goedemiddag", evening: "Goedenavond", default: "Welkom" },
  de: { morning: "Guten Morgen", afternoon: "Guten Tag", evening: "Guten Abend", default: "Willkommen" },
  es: { morning: "Buenos días", afternoon: "Buenas tardes", evening: "Buenas noches", default: "Bienvenido" },
};

export function buildGreeting(opts: {
  fullName?: string | null;
  email?: string | null;
  preferredLocale?: string | null;
  now?: Date;
}): { greeting: string; firstName: string; locale: GreetLocale } {
  const locale = (
    ["en", "nl", "de", "es"].includes(opts.preferredLocale ?? "")
      ? opts.preferredLocale
      : "en"
  ) as GreetLocale;

  const firstName =
    opts.fullName?.trim().split(" ")[0] ??
    opts.email?.split("@")[0] ??
    "operator";

  const hour = (opts.now ?? new Date()).getHours();
  const part =
    hour < 5 ? "evening" :
    hour < 12 ? "morning" :
    hour < 18 ? "afternoon" : "evening";

  const greeting = GREETINGS[locale][part];
  return { greeting, firstName, locale };
}
