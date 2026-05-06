---
name: audit-repos
description: GitHub repos health audit — open PRs, stale branches, CI failures, vulnerable deps, billing status, secret scanning, license check. Gebruik wanneer Juan repo overzicht wil, vóór een release, of GitHub billing/Actions issues onderzoekt.
trigger: /audit-repos
---

# /audit-repos

GitHub repos audit (bongartzdiaz/* en mistersocial99/*).

## Usage

```
/audit-repos                  # alle repos
/audit-repos --org bongartzdiaz
/audit-repos --repo <naam>
/audit-repos --scope security # alleen secrets/deps
```

## Checks (10)

### 1. Repo inventory
Via `gh api`:
- Lijst alle repos per org
- Per repo: visibility, default branch, last push, archived?
- Compare met reference_github_repos memory

### 2. Open PRs
```bash
gh pr list --repo <repo> --state open
```
Per PR:
- Author, age, mergeable, conflicts
- CI status (passing/failing)
- Reviewers assigned, review status
- Labels (blocked, ready, draft)
- Stale (>14 dagen geen activiteit)

### 3. Branches
- Stale branches (>30 dagen, geen open PR)
- master vs main convention
- Protected branches enabled?
- Force-push history (recent destruction)

### 4. CI / Actions
```bash
gh run list --repo <repo> --limit 20
```
- Recent workflow runs status
- Billing usage (project_daily_seo_publisher: GitHub Actions billing geblokkeerd!)
- Failing workflows count
- Skipped workflows (mogelijk misconfig)

### 5. Dependabot / vulnerabilities
```bash
gh api /repos/<owner>/<repo>/dependabot/alerts
```
- Open alerts per severity (critical/high/medium/low)
- Outdated lockfiles

### 6. Secret scanning
```bash
gh api /repos/<owner>/<repo>/secret-scanning/alerts
```
- Exposed secrets in commits
- `.env` files in history
- Hardcoded tokens (zie /pt-review)

### 7. Code quality
- README aanwezig?
- LICENSE aanwezig?
- CONTRIBUTING.md?
- .github/CODEOWNERS?
- Pre-commit hooks (.pre-commit-config.yaml)?

### 8. Releases & tags
- Latest release per repo
- Releases without changelog
- Tags zonder release

### 9. Issues
- Open issues count
- Bugs vs features ratio
- Stale issues (>60 dagen)
- Missing labels

### 10. Billing / quota
- GitHub Actions minutes usage
- Storage quota
- LFS usage
- Recent billing alerts

## Output

```
REPOS AUDIT — 2026-05-02

═══ INVENTORY ═══
bongartzdiaz: N repos (N public, N private, N archived)
mistersocial99: N repos
Drift vs memory: ±N

═══ OPEN PRs ═══
Total: N
Stale (>14d): N
Failing CI: N
Conflicts: N
Top 5 oldest: ...

═══ BRANCHES ═══
Stale branches (>30d): N
Unprotected default branches: N
master/main inconsistencies: N

═══ CI ═══
Failing workflows last 24h: N
GitHub Actions billing: [STATUS]
Long-running queues: N

═══ SECURITY ═══
Dependabot alerts: critical=N, high=N, med=N, low=N
Secret scanning: N exposed
Repos zonder branch protection: N

═══ QUALITY ═══
Repos zonder README: N
Repos zonder LICENSE: N
Repos zonder CODEOWNERS: N

═══ RELEASES ═══
Repos zonder release: N
Outdated releases (>6 mnd): N

═══ ISSUES ═══
Open total: N
Stale (>60d): N

═══ BILLING ═══
Actions minutes: N / quota
Storage: N MB / quota
Alerts: ...

═══ TOP 10 PRIORITEITEN ═══
1. [KRITIEK] GitHub Actions billing — daily-seo-publisher geblokkeerd
2. ...

═══ MEMORY UPDATE ═══
project_repos_audit_<datum>.md + reference_github_repos refresh
```

## Hard rules
- Exposed secrets = KRITIEK, ALTIJD escalate
- Stale branch met geen open PR + geen recent commits = candidate voor delete (NIET auto-deleten — vraag Juan)
- Update reference_github_repos.md memory bij nieuwe/gearchiveerde repos
