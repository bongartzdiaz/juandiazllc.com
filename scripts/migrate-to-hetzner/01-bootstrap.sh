#!/bin/bash
set -euo pipefail

# 01-bootstrap.sh
# What this does:
#   First-SSH bootstrap of a Hetzner GEX44 box for the DEUS CRM cutover.
#   Runs as root once, then SSH locks to the operator key only.
#   Installs: Postgres 17, Caddy 2, Node 22 LTS, PM2, fail2ban, UFW, b2 CLI.
#   Creates the 'deus' user, hardens SSH, opens firewall ports 22/80/443.
#   See docs/hetzner-cutover-runbook.md Section 2 for the full description.
#
# Required env vars:
#   DEUS_OPERATOR_KEY   ssh-ed25519 public key for the operator
#   DEUS_DOMAIN         e.g. juandiazllc.com (used in cron + log labels)
#
# Usage (as root, once):
#   chmod +x 01-bootstrap.sh
#   DEUS_OPERATOR_KEY="ssh-ed25519 AAAA... operator@laptop" \
#   DEUS_DOMAIN="juandiazllc.com" \
#     ./01-bootstrap.sh

if [[ "${EUID}" -ne 0 ]]; then
  echo "ERROR: must run as root" >&2
  exit 1
fi

: "${DEUS_OPERATOR_KEY:?DEUS_OPERATOR_KEY env var required}"
: "${DEUS_DOMAIN:?DEUS_DOMAIN env var required}"

OS_RELEASE=$(. /etc/os-release && echo "${ID}-${VERSION_ID}")
if [[ "${OS_RELEASE}" != "ubuntu-24.04" ]]; then
  echo "WARNING: tested on ubuntu-24.04, you have ${OS_RELEASE}" >&2
fi

echo "==> apt update + base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y \
  curl wget gnupg ca-certificates lsb-release \
  git jq unzip htop ufw fail2ban \
  apt-transport-https software-properties-common \
  unattended-upgrades

echo "==> create deus user"
if ! id -u deus >/dev/null 2>&1; then
  adduser --disabled-password --gecos "" deus
  usermod -aG sudo deus
fi

mkdir -p /home/deus/.ssh
echo "${DEUS_OPERATOR_KEY}" > /home/deus/.ssh/authorized_keys
chmod 700 /home/deus/.ssh
chmod 600 /home/deus/.ssh/authorized_keys
chown -R deus:deus /home/deus/.ssh

# narrow sudoers grant: just the things PM2 / Caddy reload need
cat >/etc/sudoers.d/90-deus <<'SUDO'
deus ALL=(root) NOPASSWD: /bin/systemctl reload caddy
deus ALL=(root) NOPASSWD: /bin/systemctl restart caddy
deus ALL=(root) NOPASSWD: /bin/systemctl status caddy
deus ALL=(root) NOPASSWD: /usr/bin/journalctl -u caddy *
SUDO
chmod 440 /etc/sudoers.d/90-deus

echo "==> harden sshd"
mkdir -p /etc/ssh/sshd_config.d
cat >/etc/ssh/sshd_config.d/10-deus.conf <<'SSHD'
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
ChallengeResponseAuthentication no
KbdInteractiveAuthentication no
UsePAM yes
X11Forwarding no
AllowAgentForwarding no
AllowTcpForwarding no
ClientAliveInterval 300
ClientAliveCountMax 2
MaxAuthTries 3
LoginGraceTime 30
AllowUsers deus
SSHD
systemctl reload ssh

echo "==> fail2ban"
cat >/etc/fail2ban/jail.d/deus-sshd.local <<'F2B'
[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd
maxretry = 3
findtime = 10m
bantime = 1h
F2B
systemctl enable --now fail2ban

echo "==> ufw firewall"
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw logging low
yes | ufw enable

echo "==> postgres 17 (apt.postgresql.org)"
install -d /usr/share/postgresql-common/pgdg
curl -fsSL https://www.postgresql.org/media/keys/ACCC4CF8.asc \
  -o /usr/share/postgresql-common/pgdg/apt.postgresql.org.asc
echo "deb [signed-by=/usr/share/postgresql-common/pgdg/apt.postgresql.org.asc] \
https://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" \
  > /etc/apt/sources.list.d/pgdg.list
apt-get update -y
apt-get install -y postgresql-17 postgresql-contrib-17

# tuning for 64 GB RAM box
mkdir -p /etc/postgresql/17/main/conf.d
cat >/etc/postgresql/17/main/conf.d/10-deus-tuning.conf <<'PG'
# 10-deus-tuning.conf — tuned for Hetzner GEX44 (Ryzen 7 8700GE, 64 GB, NVMe)
listen_addresses = '127.0.0.1'
max_connections = 200
shared_buffers = 16GB
effective_cache_size = 48GB
work_mem = 32MB
maintenance_work_mem = 2GB
wal_buffers = 16MB
random_page_cost = 1.1
effective_io_concurrency = 200
checkpoint_completion_target = 0.9
min_wal_size = 1GB
max_wal_size = 4GB
log_min_duration_statement = 500ms
log_line_prefix = '%t [%p] %u@%d '
PG
systemctl restart postgresql

echo "==> caddy 2"
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key \
  | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt \
  > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y
apt-get install -y caddy
systemctl enable caddy

echo "==> node 22 lts (NodeSource)"
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
npm install -g pnpm pm2

echo "==> pm2 startup as deus"
sudo -u deus pm2 startup systemd -u deus --hp /home/deus | tail -1 \
  | sed 's/^.*sudo //' | bash

echo "==> b2 cli (backups)"
curl -fsSL "https://github.com/Backblaze/B2_Command_Line_Tool/releases/latest/download/b2-linux" \
  -o /usr/local/bin/b2
chmod +x /usr/local/bin/b2

echo "==> unattended-upgrades for security patches only"
dpkg-reconfigure -plow unattended-upgrades || true

echo "==> placeholder /etc/cron.d/deus (filled by 08-backup-cron.sh install)"
cat >/etc/cron.d/deus <<'CRON'
# DEUS cron jobs — populated by 08-backup-cron.sh on first run
SHELL=/bin/bash
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
MAILTO=""
CRON
chmod 644 /etc/cron.d/deus

echo
echo "==================================================================="
echo "DONE.  Next steps:"
echo "  1. log out, then ssh deus@<this-box-ip>"
echo "  2. clone the repo:"
echo "       git clone git@github.com:bongartzdiaz/website.git"
echo "  3. run 02-postgres-init.sql + 03-lucia-schema.sql (see runbook)"
echo "  4. drop ENV vars into ~/website/.env.production"
echo "  5. npm ci && npm run build && pm2 startOrReload <ecosystem>"
echo "  6. install Caddyfile from 06-caddy-config.example"
echo "==================================================================="
