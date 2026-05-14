"""PR-A — Rebrand visible UI strings: Philly -> DEUS.

Targets ONLY customer-facing files. Leaves alone:
  - Folder paths (app/philly/, lib/philly/, etc.) — PR-C territory
  - API route URLs — PR-C territory
  - Internal docs (CLAUDE.md, DEPLOY.md, .claude/skills/*)
  - Code comments referencing internal product name
  - Migration files (immutable history)

Replacement order matters: compound terms first, then standalone.
"""

from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parent.parent

# Visible-string files (case-sensitive paths)
TARGETS = [
    # i18n dictionaries
    ROOT / "lib/i18n/dict.ts",
    # Next-intl message bundles
    *ROOT.glob("messages/*.json"),
    # App pages (root brand site) — locale-aware metadata + visible copy
    ROOT / "app/[locale]/about/page.tsx",
    ROOT / "app/[locale]/dashboard/page.tsx",
    ROOT / "app/[locale]/pricing/page.tsx",
    ROOT / "app/[locale]/uses/page.tsx",
    # Standalone app — welcome wizard customer copy
    ROOT / "apps/philly-standalone/app/welcome/page.tsx",
    # Public README
    ROOT / "README.md",
]

# Order matters: longest first so compounds replace before standalone "Philly"
REPLACEMENTS = [
    (re.compile(r"\bPhilly CRM\b"), "DEUS"),
    (re.compile(r"\bPhilly Dashboard\b"), "DEUS"),
    (re.compile(r"\bPhilly dashboard\b"), "DEUS dashboard"),
    (re.compile(r"\bPhilly\b"), "DEUS"),
]

# Files where we replace lowercase 'philly' too (customer-visible UI keys
# that happen to be in lowercase, e.g. story labels). Limited scope.
LOWERCASE_TARGETS = {
    ROOT / "lib/i18n/dict.ts": [
        # Only inside string VALUES — be careful with keys
        # We'll match patterns like "...philly..." in quoted string values
    ],
}


def replace_visible(text: str) -> tuple[str, int]:
    total = 0
    for pattern, replacement in REPLACEMENTS:
        new_text, n = pattern.subn(replacement, text)
        text = new_text
        total += n
    return text, total


def process_file(path: Path) -> int:
    if not path.exists():
        print(f"  SKIP (missing): {path.relative_to(ROOT)}")
        return 0
    text = path.read_text(encoding="utf-8")
    new_text, n = replace_visible(text)
    if n > 0:
        path.write_text(new_text, encoding="utf-8")
        print(f"  [{n:3d}] {path.relative_to(ROOT)}")
    return n


def main():
    total_replacements = 0
    files_changed = 0
    print("=== PR-A: visible UI strings Philly -> DEUS ===\n")

    for target in TARGETS:
        n = process_file(target)
        if n > 0:
            files_changed += 1
            total_replacements += n

    print(f"\nFiles changed: {files_changed}")
    print(f"Total replacements: {total_replacements}")

    # Verification sweep — any 'Philly' left in our target files?
    print("\n=== Post-rebrand verification ===")
    leftover_files = []
    for target in TARGETS:
        if not target.exists():
            continue
        text = target.read_text(encoding="utf-8")
        if re.search(r"\bPhilly\b", text):
            # Find context
            for m in re.finditer(r"\bPhilly\b", text):
                line_no = text[: m.start()].count("\n") + 1
                line = text.splitlines()[line_no - 1] if line_no <= len(text.splitlines()) else ""
                leftover_files.append((target.relative_to(ROOT), line_no, line.strip()))
    if leftover_files:
        print(f"WARNING: {len(leftover_files)} 'Philly' mentions remain in target files:")
        for f, ln, txt in leftover_files[:10]:
            print(f"  {f}:{ln}: {txt[:100]}")
    else:
        print("All target files cleaned. No 'Philly' proper-noun mentions remain.")


if __name__ == "__main__":
    main()
