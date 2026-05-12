#!/usr/bin/env node
/**
 * Regenerate pricing-page outputs from `_drafts/pricing/pricing-tiers.csv`.
 *
 * The CSV is the single source-of-truth for tier prices, min-seats, and
 * the feature × tier matrix. Two derived outputs are regenerated here:
 *
 *   1. `app/[locale]/pricing/page.tsx`
 *      - TIERS constant (monthlyPrice, annualPrice, minSeats per tier)
 *      - FEATURE_TABLE constant (one section per category, rows nested)
 *
 *   2. `_drafts/pricing/pricing-tiers-en.md`
 *      - Per-category feature tables (Markdown) between the GENERATED markers
 *
 * Idempotent: running the script without CSV changes produces zero diff.
 *
 * Run:
 *   node scripts/regenerate-pricing.mjs       # write outputs
 *   node scripts/regenerate-pricing.mjs --check  # exit 1 if outputs would change
 *
 * Hand-controlled (NOT regenerated):
 *   - TIERS.ctaHref values (UX decision per tier, not data)
 *   - TIERS keys (`starter`/`pro`/`business`/`enterprise`)
 *   - i18n dict.ts (translations are not in the CSV)
 *   - Pricing-page surrounding copy, FAQ, internal-notes section
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const CSV_PATH = join(ROOT, "_drafts/pricing/pricing-tiers.csv");
const PAGE_PATH = join(ROOT, "app/[locale]/pricing/page.tsx");
const MD_PATH = join(ROOT, "_drafts/pricing/pricing-tiers-en.md");

const CHECK_MODE = process.argv.includes("--check");

// ---------- CSV parser ----------
// Simple split-on-comma — no quoted commas in this data. If features
// ever contain commas, switch to a real CSV parser (papaparse).
function parseCsv(text) {
  const lines = text.trim().split(/\r?\n/);
  const header = lines[0].split(",");
  const rows = lines.slice(1).map((line) => {
    const cells = line.split(",");
    const obj = {};
    header.forEach((h, i) => {
      obj[h.trim()] = (cells[i] ?? "").trim();
    });
    return obj;
  });
  return { header, rows };
}

// ---------- Cell type mapping ----------
// Pure integers ≥1000 get thousands-separator formatting for readability
// ("5000" → "5,000"). CSV stores plain integers because comma is the
// field-separator; we re-format on the way out. Strings with units
// ("5 GB", "30 days") pass through unchanged.
function formatCell(value) {
  if (/^\d{4,}$/.test(value)) {
    return Number(value).toLocaleString("en-US");
  }
  return value;
}

// CSV cell → TypeScript value used in FeatureRow:
//   "✓"   → true
//   ""    → false
//   other → string literal (with thousands-separator if pure integer)
function cellToTs(value) {
  if (value === "✓") return "true";
  if (value === "") return "false";
  const formatted = formatCell(value);
  // Escape backslash + double-quote
  const escaped = formatted.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `"${escaped}"`;
}

// CSV cell → Markdown rendering:
//   "✓"   → "✓"
//   ""    → "" (empty cell)
//   other → raw string with thousands-separator formatting
function cellToMd(value) {
  return formatCell(value);
}

// CSV category name → i18n titleKey. Must match keys in lib/i18n/dict.ts.
const CATEGORY_TO_KEY = {
  "Core CRM": "pricing.sec.core",
  Calendar: "pricing.sec.calendar",
  Email: "pricing.sec.email",
  AI: "pricing.sec.ai",
  Security: "pricing.sec.security",
  Compliance: "pricing.sec.compliance",
  Branding: "pricing.sec.branding",
  Integrations: "pricing.sec.integrations",
  Support: "pricing.sec.support",
  Limits: "pricing.sec.limits",
  Infrastructure: "pricing.sec.infrastructure",
};

// CSV category → shorter slug used in feature-label i18n keys.
// Same mapping as above, but only the last segment.
const CATEGORY_TO_SLUG = {
  "Core CRM": "core",
  Calendar: "calendar",
  Email: "email",
  AI: "ai",
  Security: "security",
  Compliance: "compliance",
  Branding: "branding",
  Integrations: "integrations",
  Support: "support",
  Limits: "limits",
  Infrastructure: "infrastructure",
};

// Feature label → key-safe camelCase slug.
//   "Contacts" → "contacts"
//   "Custom fields" → "customFields"
//   "AI lead scoring" → "aiLeadScoring"
//   "Two-factor authentication" → "twoFactorAuthentication"
//   "SSO (SAML 2.0)" → "sso" (parens stripped)
//   "Custom SMTP (send via your domain)" → "customSmtp"
//   "GDPR-compliant by default" → "gdprCompliantByDefault"
function labelToSlug(label) {
  // Strip parenthesised clarifications — they don't add meaning to the key.
  const stripped = label.replace(/\s*\([^)]*\)/g, "");
  // Split on non-alphanumeric, drop empties, camelCase
  const words = stripped
    .split(/[^a-zA-Z0-9]+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) {
    throw new Error(`Cannot derive slug from label: "${label}"`);
  }
  return words
    .map((w, i) =>
      i === 0
        ? w.toLowerCase()
        : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
    )
    .join("");
}

// Full i18n key for a feature-label cell.
//   featureKey("Core CRM", "Custom fields") → "pricing.feat.core.customFields"
function featureKey(category, label) {
  const sectionSlug = CATEGORY_TO_SLUG[category];
  if (!sectionSlug) {
    throw new Error(`No section slug for category "${category}"`);
  }
  return `pricing.feat.${sectionSlug}.${labelToSlug(label)}`;
}

// Categories that are NOT feature-table sections (skipped from
// FEATURE_TABLE + Markdown tables). These rows are pricing metadata.
const META_CATEGORIES = new Set(["Pricing"]);

// ---------- Tier-data extraction ----------
// Pulls monthlyPrice / annualPrice / minSeats from the Pricing-meta
// rows. ctaHref stays hand-controlled (read from existing page.tsx).
function extractTierMeta(rows) {
  const monthly = rows.find((r) =>
    r.Feature.startsWith("Price per seat per month (monthly")
  );
  const annual = rows.find((r) =>
    r.Feature.startsWith("Price per seat per month (annual")
  );
  const minSeats = rows.find((r) => r.Feature === "Minimum seats");

  if (!monthly || !annual || !minSeats) {
    throw new Error(
      "CSV missing one of: monthly price, annual price, minimum seats rows"
    );
  }

  return [
    {
      key: "starter",
      monthlyPrice: monthly.Starter || null,
      annualPrice: annual.Starter || null,
      minSeats: parseInt(minSeats.Starter, 10),
    },
    {
      key: "pro",
      monthlyPrice: monthly.Professional || null,
      annualPrice: annual.Professional || null,
      minSeats: parseInt(minSeats.Professional, 10),
    },
    {
      key: "business",
      monthlyPrice: monthly.Business || null,
      annualPrice: annual.Business || null,
      minSeats: parseInt(minSeats.Business, 10),
    },
    {
      key: "enterprise",
      monthlyPrice: null, // Enterprise is contact-only, never has a price
      annualPrice: null,
      minSeats: parseInt(minSeats.Enterprise, 10),
    },
  ];
}

// ctaHref values are not in the CSV. Read them from the existing
// page.tsx so the regen doesn't blow away UX decisions.
function readCtaHrefs(pageText) {
  const out = {};
  const re =
    /\{\s*key:\s*"(starter|pro|business|enterprise)",[^}]*ctaHref:\s*"([^"]*)"/g;
  let m;
  while ((m = re.exec(pageText)) !== null) {
    out[m[1]] = m[2];
  }
  return out;
}

// ---------- Feature-section grouping ----------
function groupByCategory(rows) {
  const sections = [];
  let current = null;
  for (const row of rows) {
    if (META_CATEGORIES.has(row.Category)) continue;
    if (!current || current.category !== row.Category) {
      current = { category: row.Category, rows: [] };
      sections.push(current);
    }
    current.rows.push(row);
  }
  return sections;
}

// ---------- Generators ----------
function generateTiersConstant(tierMeta, ctaHrefs) {
  const lines = ["const TIERS: Tier[] = ["];
  for (const t of tierMeta) {
    const monthly = t.monthlyPrice ? `"${t.monthlyPrice}"` : "null";
    const annual = t.annualPrice ? `"${t.annualPrice}"` : "null";
    const cta = ctaHrefs[t.key];
    if (!cta) throw new Error(`No ctaHref found for tier "${t.key}"`);
    lines.push(
      `  { key: "${t.key}", monthlyPrice: ${monthly}, annualPrice: ${annual}, minSeats: ${t.minSeats}, ctaHref: "${cta}" },`
    );
  }
  lines.push("];");
  return lines.join("\n");
}

function generateFeatureTableConstant(sections) {
  const lines = ["const FEATURE_TABLE: FeatureSection[] = ["];
  for (const section of sections) {
    const titleKey = CATEGORY_TO_KEY[section.category];
    if (!titleKey) {
      throw new Error(
        `Category "${section.category}" has no titleKey mapping in CATEGORY_TO_KEY`
      );
    }
    lines.push("  {");
    lines.push(`    titleKey: "${titleKey}",`);
    lines.push("    rows: [");
    for (const row of section.rows) {
      const lblKey = featureKey(section.category, row.Feature);
      lines.push(
        `      { labelKey: "${lblKey}", starter: ${cellToTs(
          row.Starter
        )}, pro: ${cellToTs(row.Professional)}, business: ${cellToTs(
          row.Business
        )}, enterprise: ${cellToTs(row.Enterprise)} },`
      );
    }
    lines.push("    ],");
    lines.push("  },");
  }
  lines.push("];");
  return lines.join("\n");
}

function generateMarkdownTables(sections) {
  const lines = [];
  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    lines.push(`### ${section.category}`);
    lines.push("");
    lines.push("| | Starter | Professional | Business | Enterprise |");
    lines.push("|---|---|---|---|---|");
    for (const row of section.rows) {
      lines.push(
        `| ${row.Feature} | ${cellToMd(row.Starter)} | ${cellToMd(
          row.Professional
        )} | ${cellToMd(row.Business)} | ${cellToMd(row.Enterprise)} |`
      );
    }
    if (i < sections.length - 1) lines.push("");
  }
  return lines.join("\n");
}

// ---------- Marker-replace helpers ----------
// Line-based marker replacement. Finds the line containing the BEGIN
// marker substring and the line containing the END marker substring,
// preserves both marker lines exactly as written, and replaces everything
// between them with `replacement`. This is safer than substring-indexOf
// when marker lines contain extra text after the marker keyword (e.g.
// human-readable comments in the BEGIN line).
function replaceBetweenMarkers(text, beginMarker, endMarker, replacement) {
  const lines = text.split("\n");
  let beginIdx = -1;
  let endIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (beginIdx === -1 && lines[i].includes(beginMarker)) {
      beginIdx = i;
    } else if (beginIdx !== -1 && lines[i].includes(endMarker)) {
      endIdx = i;
      break;
    }
  }
  if (beginIdx === -1 || endIdx === -1) {
    throw new Error(
      `Marker not found: BEGIN=${beginIdx} END=${endIdx} for "${beginMarker}"`
    );
  }
  const before = lines.slice(0, beginIdx + 1).join("\n"); // includes BEGIN line
  const after = lines.slice(endIdx).join("\n"); // includes END line
  return `${before}\n${replacement}\n${after}`;
}

// ---------- Main ----------
function main() {
  const csvText = readFileSync(CSV_PATH, "utf8");
  const { rows } = parseCsv(csvText);

  const tierMeta = extractTierMeta(rows);
  const sections = groupByCategory(rows);

  // page.tsx — regenerate TIERS + FEATURE_TABLE
  const pageBefore = readFileSync(PAGE_PATH, "utf8");
  const ctaHrefs = readCtaHrefs(pageBefore);

  const tiersBlock = generateTiersConstant(tierMeta, ctaHrefs);
  const featureBlock = generateFeatureTableConstant(sections);

  let pageAfter = pageBefore;
  pageAfter = replaceBetweenMarkers(
    pageAfter,
    "// <BEGIN GENERATED:TIERS>",
    "// <END GENERATED:TIERS>",
    tiersBlock
  );
  pageAfter = replaceBetweenMarkers(
    pageAfter,
    "// <BEGIN GENERATED:FEATURE_TABLE>",
    "// <END GENERATED:FEATURE_TABLE>",
    featureBlock
  );

  // markdown — regenerate per-category tables
  const mdBefore = readFileSync(MD_PATH, "utf8");
  const mdBlock = generateMarkdownTables(sections);
  const mdAfter = replaceBetweenMarkers(
    mdBefore,
    "BEGIN GENERATED:FEATURE_TABLES",
    "END GENERATED:FEATURE_TABLES",
    mdBlock
  );

  const pageChanged = pageAfter !== pageBefore;
  const mdChanged = mdAfter !== mdBefore;

  if (CHECK_MODE) {
    if (pageChanged || mdChanged) {
      console.error(
        "✗ Generated outputs do not match CSV. Run `npm run regen:pricing` to fix."
      );
      if (pageChanged) console.error("  - page.tsx out of sync");
      if (mdChanged) console.error("  - pricing-tiers-en.md out of sync");
      process.exit(1);
    }
    console.log("✓ Generated outputs match CSV.");
    process.exit(0);
  }

  if (pageChanged) {
    writeFileSync(PAGE_PATH, pageAfter, "utf8");
    console.log(`✓ Wrote ${PAGE_PATH}`);
  } else {
    console.log(`= No change in ${PAGE_PATH}`);
  }
  if (mdChanged) {
    writeFileSync(MD_PATH, mdAfter, "utf8");
    console.log(`✓ Wrote ${MD_PATH}`);
  } else {
    console.log(`= No change in ${MD_PATH}`);
  }
}

main();
