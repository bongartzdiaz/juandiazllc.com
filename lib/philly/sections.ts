// Canonical catalog of dashboard sections. Every top-level navigation
// item in the Philly sidebar lives here so (a) per-user visibility
// can be persisted as an allow-list of slugs, and (b) server-side
// guards have one source of truth for "which URL prefixes live under
// which section slug".
//
// null `dashboardSections` on a User = superadmin / full access.
// Non-null array = strict allow-list. `role === 'admin'` ALWAYS
// bypasses the check (admins can't lock themselves out).

export const SECTION_GROUPS = ["primary", "tools", "industry", "system"] as const;
export type SectionGroup = (typeof SECTION_GROUPS)[number];

export type SectionDef = {
  slug: string;
  group: SectionGroup;
  // Every URL that belongs to this section. First entry is the
  // canonical landing href. Matching is "starts with" — nested
  // pages under these prefixes inherit the parent section's gate.
  paths: string[];
  // Dict key on `philly.sidebar.*`. Sidebar already translates these.
  labelKey: string;
};

export const SECTIONS: SectionDef[] = [
  // ── Primary
  { slug: "dashboard", group: "primary", paths: ["/philly"], labelKey: "philly.sidebar.dashboard" },
  { slug: "projects", group: "primary", paths: ["/philly/projects"], labelKey: "philly.sidebar.projects" },
  { slug: "contacts", group: "primary", paths: ["/philly/contacts"], labelKey: "philly.sidebar.contacts" },
  { slug: "impact", group: "primary", paths: ["/philly/impact"], labelKey: "philly.sidebar.impact" },

  // ── Tools
  { slug: "reports", group: "tools", paths: ["/philly/reports"], labelKey: "philly.sidebar.reports" },
  { slug: "kanban", group: "tools", paths: ["/philly/kanban"], labelKey: "philly.sidebar.kanban" },
  { slug: "deals", group: "tools", paths: ["/philly/deals"], labelKey: "philly.sidebar.deals" },
  { slug: "calendar", group: "tools", paths: ["/philly/calendar"], labelKey: "philly.sidebar.calendar" },
  { slug: "timeline", group: "tools", paths: ["/philly/timeline"], labelKey: "philly.sidebar.timeline" },
  { slug: "documents", group: "tools", paths: ["/philly/documents"], labelKey: "philly.sidebar.documents" },
  { slug: "inbox", group: "tools", paths: ["/philly/inbox"], labelKey: "philly.sidebar.inbox" },
  { slug: "email", group: "tools", paths: ["/philly/email"], labelKey: "philly.sidebar.email" },
  { slug: "sms", group: "tools", paths: ["/philly/sms"], labelKey: "philly.sidebar.sms" },
  { slug: "templates", group: "tools", paths: ["/philly/templates"], labelKey: "philly.sidebar.templates" },
  { slug: "pages", group: "tools", paths: ["/philly/pages"], labelKey: "philly.sidebar.pages" },
  { slug: "ai", group: "tools", paths: ["/philly/ai"], labelKey: "philly.sidebar.ai" },

  // ── Industry (real-estate)
  { slug: "properties", group: "industry", paths: ["/philly/properties"], labelKey: "philly.sidebar.properties" },
  { slug: "showings", group: "industry", paths: ["/philly/showings"], labelKey: "philly.sidebar.showings" },
  { slug: "offers", group: "industry", paths: ["/philly/offers"], labelKey: "philly.sidebar.offers" },
  { slug: "openHouses", group: "industry", paths: ["/philly/open-houses"], labelKey: "philly.sidebar.openHouses" },
  { slug: "commissions", group: "industry", paths: ["/philly/commissions"], labelKey: "philly.sidebar.commissions" },
  { slug: "transactions", group: "industry", paths: ["/philly/transactions"], labelKey: "philly.sidebar.transactions" },

  // ── System
  { slug: "notifications", group: "system", paths: ["/philly/notifications"], labelKey: "philly.sidebar.notifications" },
  { slug: "automations", group: "system", paths: ["/philly/automations"], labelKey: "philly.sidebar.automations" },
  { slug: "integrations", group: "system", paths: ["/philly/integrations"], labelKey: "philly.sidebar.integrations" },
  { slug: "audit", group: "system", paths: ["/philly/audit"], labelKey: "philly.sidebar.auditLog" },
  { slug: "settings", group: "system", paths: ["/philly/settings"], labelKey: "philly.sidebar.settings" },
];

export type SectionSlug = (typeof SECTIONS)[number]["slug"];

const SLUG_SET = new Set(SECTIONS.map((s) => s.slug));

export function isValidSectionSlug(slug: string): boolean {
  return SLUG_SET.has(slug);
}

// Parse the raw DB JSON (or legacy null) into a validated slug list.
// Null / empty / malformed → null (treated as "all sections").
export function parseDashboardSections(raw: unknown): string[] | null {
  if (raw == null) return null;
  if (!Array.isArray(raw)) return null;
  const clean = raw.filter((s): s is string => typeof s === "string" && SLUG_SET.has(s));
  return clean.length ? clean : null;
}

// Core access check. Admins and users with null `dashboardSections`
// pass every section. Otherwise the slug must appear in the list.
// Unknown section slugs ALWAYS fail closed (defensive).
export function hasSection(
  user: { role: string; dashboardSections: string[] | null },
  slug: string,
): boolean {
  if (!SLUG_SET.has(slug)) return false;
  if (user.role === "admin") return true;
  if (user.dashboardSections === null) return true;
  return user.dashboardSections.includes(slug);
}

// Given a URL pathname, resolve which section (if any) gates it.
// Longest-prefix wins so `/philly/settings/webhooks` still maps to
// `settings`, not to a hypothetical parent path.
export function sectionForPath(pathname: string): SectionDef | null {
  let best: SectionDef | null = null;
  let bestLen = -1;
  for (const s of SECTIONS) {
    for (const p of s.paths) {
      if (pathname === p || pathname.startsWith(`${p}/`)) {
        if (p.length > bestLen) {
          best = s;
          bestLen = p.length;
        }
      }
    }
  }
  return best;
}
