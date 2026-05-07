"""
Generate DEUS-Server-Specification.pdf — formal corporate document
prepared for hosting-provider review and internal co-ownership review.

Output: docs/DEUS-Server-Specification.pdf
"""
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_JUSTIFY, TA_CENTER, TA_LEFT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle,
    KeepTogether, ListFlowable, ListItem,
)
from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from datetime import date
import os

# --- Brand palette ---------------------------------------------------------
BRAND_DARK = colors.HexColor("#0B3D2E")
BRAND_GREEN = colors.HexColor("#0E6B44")
BRAND_ACCENT = colors.HexColor("#1F8F5C")
TEXT_BODY = colors.HexColor("#1A1A1A")
TEXT_MUTED = colors.HexColor("#555555")
RULE_LIGHT = colors.HexColor("#D8DCD9")
TABLE_HEAD_BG = colors.HexColor("#0B3D2E")
TABLE_ALT_BG = colors.HexColor("#F2F5F3")

# --- Output paths ----------------------------------------------------------
OUT_DIR = os.path.join(os.path.dirname(__file__), "..", "docs")
OUT_PATH = os.path.normpath(os.path.join(OUT_DIR, "DEUS-Server-Specification.pdf"))

# --- Page template with header + footer -----------------------------------
def on_page(canv: canvas.Canvas, doc):
    canv.saveState()
    page_w, page_h = A4

    # Header rule
    canv.setStrokeColor(RULE_LIGHT)
    canv.setLineWidth(0.5)
    canv.line(2 * cm, page_h - 1.5 * cm, page_w - 2 * cm, page_h - 1.5 * cm)

    # Header text — left
    canv.setFont("Helvetica-Bold", 8)
    canv.setFillColor(BRAND_DARK)
    canv.drawString(2 * cm, page_h - 1.2 * cm, "DEUS PLATFORM")
    # Header text — right
    canv.setFont("Helvetica", 8)
    canv.setFillColor(TEXT_MUTED)
    canv.drawRightString(
        page_w - 2 * cm,
        page_h - 1.2 * cm,
        "Server Specification & Capacity Plan",
    )

    # Footer rule
    canv.setStrokeColor(RULE_LIGHT)
    canv.line(2 * cm, 1.5 * cm, page_w - 2 * cm, 1.5 * cm)

    # Footer text
    canv.setFont("Helvetica", 8)
    canv.setFillColor(TEXT_MUTED)
    canv.drawString(2 * cm, 1.0 * cm, "Confidential — LucenAI / Juan Diaz LLC")
    canv.drawCentredString(page_w / 2, 1.0 * cm, "Document v1.0  ·  8 May 2026")
    canv.drawRightString(page_w - 2 * cm, 1.0 * cm, f"Page {doc.page}")

    canv.restoreState()


# --- Styles ----------------------------------------------------------------
styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    "Title", parent=styles["Title"],
    fontName="Helvetica-Bold", fontSize=26, leading=32,
    textColor=BRAND_DARK, alignment=TA_LEFT, spaceAfter=8,
)
subtitle_style = ParagraphStyle(
    "Subtitle", parent=styles["Normal"],
    fontName="Helvetica", fontSize=13, leading=17,
    textColor=TEXT_MUTED, alignment=TA_LEFT, spaceAfter=24,
)
meta_label_style = ParagraphStyle(
    "MetaLabel", parent=styles["Normal"],
    fontName="Helvetica-Bold", fontSize=8.5, leading=11,
    textColor=BRAND_DARK, alignment=TA_LEFT,
)
meta_value_style = ParagraphStyle(
    "MetaValue", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=13,
    textColor=TEXT_BODY, alignment=TA_LEFT, spaceAfter=4,
)
h1_style = ParagraphStyle(
    "H1", parent=styles["Heading1"],
    fontName="Helvetica-Bold", fontSize=15, leading=20,
    textColor=BRAND_DARK, spaceBefore=18, spaceAfter=8,
    keepWithNext=True,
)
h2_style = ParagraphStyle(
    "H2", parent=styles["Heading2"],
    fontName="Helvetica-Bold", fontSize=11.5, leading=15,
    textColor=BRAND_GREEN, spaceBefore=10, spaceAfter=6,
    keepWithNext=True,
)
body_style = ParagraphStyle(
    "Body", parent=styles["Normal"],
    fontName="Helvetica", fontSize=10, leading=14,
    textColor=TEXT_BODY, alignment=TA_JUSTIFY,
    spaceAfter=8,
)
bullet_style = ParagraphStyle(
    "Bullet", parent=body_style, leftIndent=14, bulletIndent=2,
    spaceAfter=3,
)
mono_style = ParagraphStyle(
    "Mono", parent=styles["Code"],
    fontName="Courier", fontSize=8.5, leading=11,
    textColor=TEXT_BODY, leftIndent=10, rightIndent=10,
    backColor=colors.HexColor("#F6F8F7"),
    borderColor=RULE_LIGHT, borderWidth=0.5, borderPadding=6,
    spaceAfter=10,
)
caption_style = ParagraphStyle(
    "Caption", parent=styles["Normal"],
    fontName="Helvetica-Oblique", fontSize=8.5, leading=11,
    textColor=TEXT_MUTED, spaceAfter=10,
)


def b(p):
    """Body paragraph."""
    return Paragraph(p, body_style)


def heading(n, text):
    return Paragraph(f"{n}. {text}", h1_style)


def sub(text):
    return Paragraph(text, h2_style)


def bullet_list(items):
    return ListFlowable(
        [ListItem(Paragraph(t, bullet_style), leftIndent=12) for t in items],
        bulletType="bullet",
        bulletColor=BRAND_GREEN,
        leftIndent=10,
        bulletFontSize=8,
    )


def make_table(data, col_widths=None, header=True, zebra=True):
    style_cmds = [
        ("FONT", (0, 0), (-1, -1), "Helvetica", 9.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LINEBELOW", (0, 0), (-1, 0), 0.7, BRAND_DARK),
        ("LINEABOVE", (0, 0), (-1, 0), 0.7, BRAND_DARK),
        ("LINEBELOW", (0, -1), (-1, -1), 0.7, BRAND_DARK),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]
    if header:
        style_cmds.extend([
            ("BACKGROUND", (0, 0), (-1, 0), TABLE_HEAD_BG),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9.5),
        ])
    if zebra:
        for row_idx in range(1, len(data)):
            if row_idx % 2 == 0:
                style_cmds.append(
                    ("BACKGROUND", (0, row_idx), (-1, row_idx), TABLE_ALT_BG)
                )
    return Table(data, colWidths=col_widths, style=TableStyle(style_cmds))


# --- Build the document ----------------------------------------------------
doc = SimpleDocTemplate(
    OUT_PATH,
    pagesize=A4,
    leftMargin=2 * cm,
    rightMargin=2 * cm,
    topMargin=2.2 * cm,
    bottomMargin=2.0 * cm,
    title="DEUS Platform — Server Specification",
    author="Juan Diaz LLC",
    subject="Multi-tenant hosting capacity assessment for the DEUS platform",
    creator="LucenAI",
    producer="LucenAI",
)

story = []

# --- Cover block ---
story.append(Spacer(1, 1.5 * cm))
story.append(Paragraph("DEUS Platform", title_style))
story.append(Paragraph(
    "Server Specification &amp; Capacity Plan for Multi-Tenant Hosting",
    subtitle_style,
))

# Metadata block — two columns
meta_data = [
    [Paragraph("PREPARED BY", meta_label_style),
     Paragraph("Juan Diaz, LLC <br/>operating the LucenAI brand", meta_value_style)],
    [Paragraph("DOCUMENT VERSION", meta_label_style),
     Paragraph("1.0", meta_value_style)],
    [Paragraph("DATE OF ISSUE", meta_label_style),
     Paragraph(date(2026, 5, 8).strftime("%-d %B %Y") if os.name != "nt" else "8 May 2026",
               meta_value_style)],
    [Paragraph("INTENDED RECIPIENTS", meta_label_style),
     Paragraph("Hosting provider (technical evaluation) <br/>"
               "Co-ownership / internal review",
               meta_value_style)],
    [Paragraph("CLASSIFICATION", meta_label_style),
     Paragraph("Confidential — limited distribution", meta_value_style)],
]
meta_table = Table(meta_data, colWidths=[4.5 * cm, 11 * cm])
meta_table.setStyle(TableStyle([
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("LEFTPADDING", (0, 0), (-1, -1), 0),
    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
    ("TOPPADDING", (0, 0), (-1, -1), 6),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ("LINEBELOW", (0, 0), (-1, -2), 0.3, RULE_LIGHT),
]))
story.append(meta_table)
story.append(Spacer(1, 0.6 * cm))

# Cover summary box
cover_summary = (
    "This document specifies the server-side software requirements and capacity "
    "considerations for hosting the DEUS platform, a multi-tenant customer-relationship "
    "management application, at <b>deus.lucenai.eu</b>. It is intended to support the "
    "hosting provider in confirming whether existing infrastructure is sufficient or "
    "whether additional capacity is required, and to give internal stakeholders a "
    "consolidated view of the deployment plan."
)
story.append(Paragraph(cover_summary, body_style))
story.append(Spacer(1, 0.3 * cm))

# Table of Contents (manual — short doc, easier than auto-toc)
story.append(Paragraph("Contents", h2_style))
toc_items = [
    "1. Executive summary",
    "2. Tenancy architecture options",
    "3. URL routing pattern",
    "4. Server software inventory",
    "5. Resource sizing &amp; capacity envelopes",
    "6. Application-level changes for per-tenant database isolation",
    "7. Cutover sequence",
    "8. Information requested from the hosting provider",
    "9. Recommendations summary",
    "10. Out of scope",
]
for item in toc_items:
    story.append(Paragraph(item, body_style))
story.append(PageBreak())

# === SECTION 1 — Executive summary ===
story.append(heading(1, "Executive summary"))
story.append(b(
    "The DEUS platform is a multi-tenant CRM application currently in the launch-readiness "
    "phase. Existing application code already supports logical multi-tenancy via "
    "organisation-scoped database rows. To meet the operational requirement of providing each "
    "client with a dedicated login at <b>deus.lucenai.eu/&lt;client&gt;</b> with a separate "
    "database under direct operator control, three deployment patterns are available — described "
    "in Section 2. The recommended pattern is <b>physical database-per-tenant</b>, which combines "
    "strong isolation with manageable operational overhead and a modest application-side change "
    "(approximately 150 lines of code for tenant resolution and connection-pool factory)."
))
story.append(b(
    "The recommended hosting target is a single dedicated server in an EU datacentre, "
    "GEX44-class or larger (Ryzen 7 8700GE-class CPU, 64 GB RAM, 1 TB NVMe). This configuration "
    "supports approximately 80 to 120 concurrent tenants under the recommended pattern. Scaling "
    "beyond this threshold requires either a larger server class (EX101 / 128 GB RAM and above) "
    "or a horizontal split across multiple servers, which is outside the scope of the initial "
    "launch."
))
story.append(b(
    "All required server software is open-source or operates as a managed service. No commercial "
    "licences are required."
))

# === SECTION 2 — Tenancy ===
story.append(heading(2, "Tenancy architecture options"))
story.append(b(
    "Three distinct deployment patterns address the multi-tenant requirement. Each implies a "
    "different per-tenant footprint and different operational characteristics. The choice is "
    "made once at the start of deployment and is not trivially reversible."
))

tenancy_data = [
    ["Option", "Model", "Per-tenant\nfootprint", "Capacity (64 GB)", "Operational\noverhead"],
    ["A", "Logical multi-tenancy\n(shared database, row-level scoping)",
     "Negligible\n(MB on disk)", "500 – 1,000+", "Low"],
    ["B", "Physical database-per-tenant\n(shared application process)",
     "≈ 150 MB RAM\n≈ 300 MB disk", "80 – 120", "Moderate"],
    ["C", "Full instance-per-tenant\n(dedicated process and DB)",
     "≈ 500 MB RAM\nDedicated DB", "15 – 25", "High"],
]
story.append(make_table(tenancy_data, col_widths=[1.2 * cm, 5.4 * cm, 3.5 * cm, 3.0 * cm, 2.8 * cm]))
story.append(Paragraph(
    "Capacity figures assume a steady-state workload of approximately 50 active users and "
    "10,000 contacts per tenant.",
    caption_style))

story.append(sub("Recommended pattern — Option B"))
story.append(b(
    "Option B is recommended for the launch deployment. It provides each client with a dedicated "
    "MariaDB database under direct administrative control, while keeping a single application "
    "process per server. The implementation requires a thin tenant-resolution layer in the "
    "application — described in Section 6 — and carries the operational overhead of one Prisma "
    "migration step per tenant when schema changes are released. Option C should be reserved "
    "for individual client contracts that require process-level isolation (for example, a client "
    "subject to regulated-industry contractual requirements)."
))

story.append(PageBreak())

# === SECTION 3 — URL routing ===
story.append(heading(3, "URL routing pattern"))
story.append(b(
    "Two routing patterns are technically feasible for distinguishing tenants:"
))
story.append(bullet_list([
    "<b>Path-based:</b> <font face='Courier'>deus.lucenai.eu/&lt;client&gt;</font> — a single domain with the tenant identifier in the path.",
    "<b>Subdomain-based:</b> <font face='Courier'>&lt;client&gt;.deus.lucenai.eu</font> — a separate subdomain per tenant under a wildcard certificate.",
]))

routing_data = [
    ["Aspect", "Path-based", "Subdomain-based"],
    ["TLS certificate", "Single certificate for the apex domain",
     "Wildcard certificate via DNS-01 challenge"],
    ["Browser cookie isolation",
     "Cookies on the apex are visible to every tenant — explicit Path scoping required",
     "Automatic — browser confines cookies to the issuing subdomain"],
    ["Application code complexity",
     "Application must be aware of the path prefix on every link and asset",
     "Application is unaware of the prefix — minimal changes"],
    ["DNS configuration",
     "One A record",
     "One A record plus a wildcard A record"],
    ["Operational complexity", "Higher", "Lower"],
]
story.append(make_table(routing_data, col_widths=[3.5 * cm, 6.2 * cm, 6.5 * cm]))

story.append(sub("Recommended pattern — subdomain-per-tenant"))
story.append(b(
    "The subdomain-based pattern is recommended. A wildcard A record at the registrar points "
    "all subdomains to the dedicated server; Caddy issues per-host certificates automatically "
    "via the DNS-01 challenge. Cookie isolation between tenants is enforced by the browser "
    "without additional application code. The path-based pattern remains technically achievable "
    "but requires explicit cookie-path scoping in the authentication layer and per-tenant "
    "configuration for the OAuth callback handlers."
))

# === SECTION 4 — Software inventory ===
story.append(heading(4, "Server software inventory"))
story.append(b(
    "The following components must be installed on the host. All are open-source and "
    "available through standard package repositories or upstream-supplied installers. "
    "The combined fresh-install footprint is approximately 8 GB on disk."
))

inv_data = [
    ["Layer", "Component", "Version", "Purpose"],
    ["Operating system", "Ubuntu LTS or Debian stable", "24.04 LTS / 12",
     "Host operating system"],
    ["Runtime", "Node.js", "22 LTS", "JavaScript application runtime"],
    ["Runtime", "pnpm", "9", "Package manager"],
    ["Runtime", "PM2", "latest", "Process supervision and log rotation"],
    ["Web layer", "Caddy", "2", "TLS termination and reverse proxy"],
    ["Database", "MariaDB", "11.4 LTS", "Per-tenant application data store"],
    ["Database", "PostgreSQL", "17", "Authentication store"],
    ["Cache", "Redis", "7", "Rate-limit token bucket and session cache"],
    ["Email", "Resend (managed service)", "—",
     "Transactional email — no server-side install"],
    ["Backups", "b2 CLI (Backblaze)", "latest",
     "Daily database snapshots to EU bucket"],
    ["Security", "ufw, fail2ban, OpenSSH, unattended-upgrades", "—",
     "Firewall, intrusion mitigation, key-only SSH, security patches"],
    ["Observability", "Sentry SDK (managed service)", "—",
     "Application error tracking — no server-side install"],
    ["Observability", "journalctl, logrotate", "—",
     "System log retention — included with the operating system"],
    ["Build tools", "git, build-essential", "—",
     "Source control and native module compilation"],
]
story.append(make_table(inv_data, col_widths=[3.0 * cm, 4.2 * cm, 2.0 * cm, 7.0 * cm]))

story.append(sub("Components not required"))
story.append(bullet_list([
    "Container runtime (Docker, Podman) — the application runs directly under PM2.",
    "Container orchestrator (Kubernetes, Nomad) — single-host deployment.",
    "Additional reverse proxies (Apache, Nginx) — Caddy is the sole proxy layer.",
    "Standalone DNS server — DNS is managed at the registrar.",
    "Network load balancer — single-host deployment.",
    "Commercial database licences — both MariaDB and PostgreSQL are open-source.",
]))

story.append(PageBreak())

# === SECTION 5 — Resource sizing ===
story.append(heading(5, "Resource sizing and capacity envelopes"))
story.append(b(
    "Resource consumption is decomposed into a constant baseline and a per-tenant increment. "
    "Figures below assume the recommended Option B (physical database-per-tenant) deployment "
    "with Caddy, Node.js, MariaDB, PostgreSQL and Redis active."
))

story.append(sub("Per-tenant footprint"))
pt_data = [
    ["Resource", "Cost per tenant"],
    ["Disk — MariaDB database files", "150 – 500 MB"],
    ["Disk — PostgreSQL authentication row", "Less than 1 MB"],
    ["RAM — MariaDB connection pool (10 active connections)", "80 – 100 MB"],
    ["RAM — InnoDB buffer pool slice (shared)", "30 – 50 MB"],
    ["RAM — Application-side Prisma client", "20 MB"],
    ["Total per tenant (steady state)", "≈ 150 MB RAM, ≈ 300 MB disk"],
]
story.append(make_table(pt_data, col_widths=[10.5 * cm, 5.7 * cm]))

story.append(sub("Shared baseline (constant regardless of tenant count)"))
sb_data = [
    ["Resource", "Cost"],
    ["Operating system and systemd", "1 GB RAM"],
    ["Caddy 2", "100 – 200 MB RAM"],
    ["Node.js application under PM2", "500 – 800 MB RAM"],
    ["MariaDB server (excluding buffer pool)", "1 GB RAM"],
    ["PostgreSQL server", "500 MB RAM"],
    ["Redis server", "256 – 512 MB RAM"],
    ["MariaDB InnoDB buffer pool (tunable)", "16 – 24 GB RAM"],
    ["Backup staging area on disk", "1 – 2 GB"],
    ["Total baseline RAM", "≈ 20 – 28 GB"],
    ["Total baseline disk", "≈ 10 GB"],
]
story.append(make_table(sb_data, col_widths=[10.5 * cm, 5.7 * cm]))

story.append(sub("Capacity envelopes by server class"))
ce_data = [
    ["Server class", "RAM", "Tenants — Option B", "Tenants — Option C"],
    ["AX42-class", "32 GB", "30 – 50", "5 – 10"],
    ["GEX44-class (recommended)", "64 GB", "80 – 120", "15 – 25"],
    ["EX101-class", "128 GB", "250 – 400", "50 – 80"],
    ["AX162-class", "256 GB", "600 – 900", "150 – 250"],
]
story.append(make_table(ce_data, col_widths=[4.5 * cm, 2.5 * cm, 4.5 * cm, 4.5 * cm]))
story.append(Paragraph(
    "Disk is rarely the limiting resource at this scale: 1,000 tenants × 500 MB = 500 GB, "
    "well within a 1 TB NVMe drive.",
    caption_style))

story.append(sub("Network"))
story.append(bullet_list([
    "1 Gbps unmetered or 100 TB/month allowance is sufficient for a CRM workload.",
    "Typical bandwidth consumption is below 50 GB per tenant per month, dominated by "
    "API traffic and asset transfer.",
    "Inbound webhooks (payment provider, calendar providers) are negligible in volume.",
]))

story.append(PageBreak())

# === SECTION 6 — Codebase changes ===
story.append(heading(6, "Application-level changes for per-tenant database isolation"))
story.append(b(
    "The current application code uses a single database per environment. Implementing "
    "Option B requires four discrete additions:"
))

ch_data = [
    ["Component", "Approximate size", "Description"],
    ["Tenant resolver middleware", "≈ 50 lines",
     "Reads the tenant slug from the request hostname or path, looks the tenant up in a "
     "registry, attaches the tenant configuration to the request context."],
    ["Per-tenant Prisma client factory", "≈ 80 lines",
     "Returns a Prisma client bound to the tenant's database connection string. Connection "
     "pools are cached per tenant slug for the lifetime of the process."],
    ["Tenant registry table", "1 PostgreSQL table",
     "Single source of truth listing each tenant — slug, display name, MariaDB connection "
     "string, status, creation timestamp. Stored in the shared authentication PostgreSQL "
     "instance."],
    ["Provisioning script", "≈ 50 lines",
     "Creates the MariaDB database and user, runs the application's Prisma migrations against "
     "it, and inserts the tenant row in the registry. Exposed as a single shell command for "
     "the operator."],
]
story.append(make_table(ch_data, col_widths=[5.0 * cm, 3.0 * cm, 8.2 * cm]))

story.append(b(
    "Total estimated effort is approximately 150 lines of TypeScript, plus the SQL for the "
    "registry table and migration scaffolding for new tenants. No changes to existing "
    "application logic, business rules, or user interface are required. The change is "
    "additive and does not affect tenants already deployed under the logical-tenancy model."
))

story.append(sub("Connection-pool sizing"))
story.append(b(
    "Each tenant's Prisma client is configured with an initial connection limit of 5. At "
    "100 tenants × 5 connections = 500, this matches the recommended <font face='Courier'>"
    "max_connections = 500</font> setting on MariaDB. Should the tenant count exceed 100, "
    "either the global maximum can be raised or the per-tenant limit can be reduced to 3."
))

# === SECTION 7 — Cutover sequence ===
story.append(heading(7, "Cutover sequence"))
story.append(b(
    "The cutover from the existing single-tenant environment to the multi-tenant configuration "
    "follows the steps below. Each step is a single operator action; the entire sequence can "
    "be completed in a single working day once the hosting provider has confirmed the "
    "specification."
))

cutover_data = [
    ["Step", "Action", "Owner"],
    ["1", "Hosting provider confirms the specification and provisions the dedicated server.",
     "Hosting provider"],
    ["2", "Bootstrap script applied — installs operating-system packages, databases, "
     "web layer, monitoring agents.", "Operator"],
    ["3", "Wildcard A record (<font face='Courier'>*.deus.lucenai.eu</font>) configured at "
     "the registrar; root A record points to the same address.", "Operator"],
    ["4", "Caddy is configured with on-demand TLS and the DNS-01 challenge plugin for the "
     "registrar's DNS provider.", "Operator"],
    ["5", "Tenant resolver middleware and Prisma factory deployed; provisioning script "
     "smoke-tested against a sandbox tenant.", "Operator"],
    ["6", "First production tenant provisioned end-to-end and validated.", "Operator"],
    ["7", "Second tenant onboarded as the first commercial customer.", "Operator"],
]
story.append(make_table(cutover_data, col_widths=[1.0 * cm, 12.0 * cm, 3.2 * cm]))

story.append(b(
    "From step 7 onward, every subsequent tenant is provisioned by a single shell command and "
    "is fully operational within approximately five minutes."
))

story.append(PageBreak())

# === SECTION 8 — Info requested from provider ===
story.append(heading(8, "Information requested from the hosting provider"))
story.append(b(
    "To enable a complete capacity assessment and to confirm the suitability of existing "
    "infrastructure, the hosting provider is requested to confirm the following items:"
))

req_items = [
    "Server hardware specification — CPU model and core count, RAM capacity, NVMe storage capacity.",
    "Network configuration — dedicated link bandwidth and any monthly transfer cap.",
    "Datacentre region — must be EU-resident for compliance with EU data-protection requirements (Falkenstein, Helsinki, Amsterdam and equivalent are all suitable).",
    "Storage redundancy — RAID-1 or hardware-mirrored NVMe is required for production workloads; storage class for the boot volume.",
    "Snapshot policy — frequency, retention period, and storage location for system snapshots.",
    "Reverse-DNS / PTR record configuration — must be settable to <font face='Courier'>deus.lucenai.eu</font>.",
    "IPv6 inclusion — preferred but not required.",
    "Out-of-band access — KVM, IPMI or rescue-system access in case primary SSH is unavailable.",
    "DDoS protection — confirmation of any network-layer protection included with the package.",
    "Bandwidth-overage policy — pricing or throttling behaviour beyond the included allowance.",
]
story.append(ListFlowable(
    [ListItem(Paragraph(t, bullet_style), leftIndent=12) for t in req_items],
    bulletType="1",
    leftIndent=10,
))

# === SECTION 9 — Recommendations summary ===
story.append(heading(9, "Recommendations summary"))

story.append(sub("If existing dedicated server is GEX44-class (64 GB RAM) or larger"))
story.append(bullet_list([
    "<b>Existing capacity is sufficient</b> for the recommended Option B deployment up to approximately 80 – 120 tenants.",
    "No additional server is required for the initial launch.",
    "An additional server should be considered when the active-tenant count exceeds 100, to leave operational headroom.",
]))

story.append(sub("If existing dedicated server is AX42-class (32 GB RAM) or smaller"))
story.append(bullet_list([
    "Existing capacity is workable for a soft-launch of 30 – 50 tenants under Option B.",
    "A second dedicated server should be planned at approximately tenant 25 to maintain operational headroom.",
    "Migration to a 64 GB-class server is recommended before onboarding customer 5 if Option C is contemplated for any client.",
]))

story.append(sub("If procuring a new dedicated server"))
story.append(bullet_list([
    "<b>Floor specification: 64 GB RAM, 1 TB NVMe, EU datacentre.</b>",
    "Recommended specification: GEX44-class (Ryzen 7 8700GE, 64 GB RAM, 1 TB NVMe) or equivalent.",
    "Disk capacity is not the constraint at this scale.",
    "EU residency of the datacentre is mandatory for compliance with EU data-protection law.",
]))

# === SECTION 10 — Out of scope ===
story.append(heading(10, "Out of scope"))
story.append(b(
    "The following items are intentionally not addressed by this document:"
))
story.append(bullet_list([
    "<b>Application-level rate limiting.</b> Rate limits per tenant are enforced inside the application using Redis-backed token buckets.",
    "<b>Migration of existing logical-tenant data into per-tenant databases.</b> Addressed in a separate operational document and only relevant if the platform is currently serving production tenants under the logical model.",
    "<b>Per-tenant payment-provider configuration.</b> Each tenant maps to a separate subscription record at the payment provider; no infrastructure-side changes are required.",
    "<b>Email deliverability.</b> Handled by the managed email provider through DNS records (SPF, DKIM, DMARC) on the application domain. No server-side email infrastructure is provisioned.",
    "<b>Cross-region disaster recovery.</b> The initial launch is a single-region deployment with daily off-site backups to an EU object-storage bucket. Multi-region active-active replication is a future architectural step beyond the scope of this launch.",
]))

# Closing line
story.append(Spacer(1, 1 * cm))
closing = Paragraph(
    "<i>End of document — DEUS Platform Server Specification, version 1.0.</i>",
    ParagraphStyle("Closing", parent=body_style, alignment=TA_CENTER,
                   textColor=TEXT_MUTED, fontName="Helvetica-Oblique"),
)
story.append(closing)

# --- Build ---
doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
print(f"OK — wrote {OUT_PATH}")
print(f"Size: {os.path.getsize(OUT_PATH)} bytes")
