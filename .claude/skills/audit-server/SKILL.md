---
name: audit-server
description: Diepe VPS audit (disk, RAM, CPU, processes, pm2, logs, security, fail2ban, cron, backups). Gebruik wanneer Juan server health wil weten, na een crash, of voor capacity planning.
trigger: /audit-server
---

# /audit-server

VPS audit voor NEXUS BOS (64.225.74.36) en HMB (165.232.82.71).

## Usage

```
/audit-server                   # beide servers
/audit-server --host nexus      # alleen NEXUS VPS
/audit-server --host hmb
/audit-server --scope security  # security only
```

## Checks (12)

### 1. Resources
```bash
df -h                                      # disk per mount
free -m                                    # RAM (NEXUS = 8GB, niet 961MB)
uptime                                     # load average + uptime
top -bn1 | head -20                        # top processes
iostat -x 1 5                              # disk I/O
vmstat 1 5                                 # memory pressure
```

### 2. Process management (pm2)
```bash
pm2 status
pm2 jlist                                  # JSON status
pm2 logs --lines 100 --nostream
pm2 prettylist | grep restart_time         # restart counts
```

### 3. Systemd services
```bash
systemctl --failed
systemctl list-units --state=running | head -30
```

### 4. Security
```bash
# SSH attempts laatste 24u
journalctl -u ssh --since "24 hours ago" | grep -i "failed\|invalid" | wc -l
# fail2ban status
fail2ban-client status
# UFW / iptables
ufw status verbose
# Open ports
ss -tlnp
# Recent logins
last -n 20
# sudo log
journalctl _COMM=sudo --since "7 days ago" | tail -30
```

### 5. Updates
```bash
apt list --upgradable 2>/dev/null | wc -l
# Security updates specifiek
apt-get -s upgrade | grep -i security
# Reboot required?
[ -f /var/run/reboot-required ] && echo "REBOOT NEEDED"
```

### 6. Cron / scheduled tasks
```bash
crontab -l
ls /etc/cron.d/ /etc/cron.daily/ /etc/cron.hourly/
# pg_cron jobs (zie /audit-db)
```

### 7. Logs (size + errors)
```bash
du -sh /var/log/* | sort -h | tail -10
journalctl --disk-usage
# Recente errors per service
journalctl -p err --since "24 hours ago" | tail -50
```

### 8. Network
```bash
# Bandwidth (vereist vnstat)
vnstat -d
# Open connections
ss -s
# DNS
nslookup nexus.local
```

### 9. Docker (indien gebruikt — n8n)
```bash
docker ps -a
docker stats --no-stream
docker images | wc -l
# Dangling images
docker images -f dangling=true | wc -l
```

### 10. Backups
- Wanneer laatste backup?
- Backup naar GitHub (NEXUS BOS)
- DigitalOcean snapshots
- DB dumps aanwezig?

### 11. SSL certs
```bash
# Per domein
echo | openssl s_client -servername helpmijbesparen.nl -connect helpmijbesparen.nl:443 2>/dev/null | openssl x509 -noout -dates
```
Cert expiry warning bij <30 dagen.

### 12. Claude Code / agents
```bash
ls /root/nexus-bos/agents/
ls /root/.claude/skills/                  # zie CLAUDE.md §10 verwachte set
# Per agent CLAUDE.md aanwezig?
```

## Output

```
SERVER AUDIT — 2026-05-02

═══ HOST: NEXUS BOS (64.225.74.36) ═══

RESOURCES
- Disk: X% used (N GB free)
- RAM: X MB / 8192 MB (X%)
- Load: X.X X.X X.X
- Uptime: N days

PM2
- Processes: N online, N stopped, N errored
- Total restarts: N (top: <process> = N)

SYSTEMD
- Failed units: N
- Lijst: ...

SECURITY
- Failed SSH: N (24u)
- fail2ban bans: N active
- Open ports: N (verwacht: 22, 80, 443, 5678)
- Last sudo: [tijd]

UPDATES
- Available: N
- Security: N
- Reboot needed: ✓/✗

CRON
- User cron: N entries
- /etc/cron.*: N entries
- Recent failures: N

LOGS
- /var/log size: N MB
- journalctl: N MB
- ERR last 24h: N

NETWORK
- Inbound 24h: N MB
- Outbound 24h: N MB

DOCKER (n8n)
- Containers: N running
- Dangling images: N

BACKUPS
- Last GitHub push: [tijd]
- DO snapshot: [tijd]
- DB dump: [tijd]

SSL CERTS
- helpmijbesparen.nl: expires in N days
- voltafy.nl: ...

AGENTS
- 13 agent dirs aanwezig: ✓/✗
- Skills installed: N (zie §10)

═══ HOST: HMB SITE (165.232.82.71) ═══
[zelfde structuur]

═══ TOP 10 PRIORITEITEN ═══
1. ...

═══ MEMORY UPDATE ═══
project_server_audit_<datum>.md
```

## Hard rules
- Cert <30 dagen = HIGH
- Reboot needed = WARN, niet auto-rebooten
- Disk >85% = HIGH
- Failed SSH >100/24u = HIGH (mogelijk brute-force)
- ALTIJD memory updaten
