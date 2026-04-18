# Philly Dashboard — Deployment Guide

## What You Need

- A VPS server (Digital Ocean, Hetzner, AWS, etc.) with Ubuntu 22.04+
- A domain name pointed to your server IP
- SSH access (root or sudo user)
- Node.js 20+ on the server
- MariaDB 10.11+ (or MySQL 8) — local on the box, or hosted

---

## Step 1: Point Your Domain to the Server

In your DNS provider (Cloudflare, Namecheap, etc.):

```
Type: A
Name: @ (or a subdomain like "dashboard")
Value: YOUR_SERVER_IP
TTL: Auto
```

Wait 5–30 minutes for DNS propagation.

---

## Step 2: SSH into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

---

## Step 3: Install Dependencies

```bash
apt update && apt upgrade -y

# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# MariaDB
apt install -y mariadb-server
systemctl enable --now mariadb
mysql_secure_installation

# PM2, Nginx, Certbot
npm install -g pm2
apt install -y nginx certbot python3-certbot-nginx

# Verify
node -v   # v20.x
pm2 -v
nginx -v
mariadb --version
```

---

## Step 4: Create the Database

```bash
mariadb -u root -p
```

```sql
CREATE DATABASE phily CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'phily'@'localhost' IDENTIFIED BY 'CHANGEME_STRONG_PASSWORD';
GRANT ALL PRIVILEGES ON phily.* TO 'phily'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Step 5: Clone and Configure

```bash
mkdir -p /var/www
cd /var/www
git clone https://github.com/bongartzdiaz/philly-dashboard.git
cd philly-dashboard

npm install

cp .env.example .env.local
nano .env.local
```

Set in `.env.local`:

```
DATABASE_URL=mysql://phily:CHANGEME_STRONG_PASSWORD@localhost:3306/phily
NEXTAUTH_SECRET=PASTE_OUTPUT_OF_OPENSSL_RAND_BASE64_32
NEXTAUTH_URL=https://dashboard.example.com
SEED_ADMIN_EMAIL=you@example.com
SEED_ADMIN_PASSWORD=PICK_A_STRONG_ONE
```

Generate the secret:

```bash
openssl rand -base64 32
```

---

## Step 6: Migrate, Seed, Build

```bash
npm run db:generate
npm run db:push          # creates the schema in MariaDB
npm run seed             # creates the first admin user + sample org
npm run build
```

---

## Step 7: Start with PM2

```bash
pm2 start npm --name "philly-dashboard" -- start
pm2 save
pm2 startup
# Run the command pm2 startup prints
pm2 status
curl http://localhost:3100
```

The app listens on **port 3100** by default (set in `package.json`).

---

## Step 8: Nginx Reverse Proxy

```bash
nano /etc/nginx/sites-available/philly-dashboard
```

```nginx
server {
    listen 80;
    server_name dashboard.example.com;

    location / {
        proxy_pass http://localhost:3100;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
ln -s /etc/nginx/sites-available/philly-dashboard /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl restart nginx
```

---

## Step 9: Enable HTTPS

```bash
certbot --nginx -d dashboard.example.com
```

Follow the prompts. Certbot auto-renews.

```bash
certbot renew --dry-run
```

---

## Step 10: Auto-deploy (Optional)

```bash
nano /var/www/philly-dashboard/deploy.sh
```

```bash
#!/bin/bash
set -e
cd /var/www/philly-dashboard
git pull origin master
npm install
npm run db:generate
npm run db:push
npm run build
pm2 restart philly-dashboard
echo "Deploy complete."
```

```bash
chmod +x /var/www/philly-dashboard/deploy.sh
```

---

## Quick Reference

| Command | Description |
|---|---|
| `pm2 status` | Check if app is running |
| `pm2 logs philly-dashboard` | Tail app logs |
| `pm2 restart philly-dashboard` | Restart app |
| `nginx -t && systemctl reload nginx` | Reload nginx config |
| `npm run db:push` | Sync schema to DB |
| `npm run seed` | Re-run seed (idempotent) |

---

## Troubleshooting

**App not loading?**
```bash
pm2 logs philly-dashboard --lines 100
curl http://localhost:3100
```

**Database connection refused?**
```bash
systemctl status mariadb
mariadb -u phily -p phily   # try logging in
```

**Login returns 500?**
- Make sure `NEXTAUTH_SECRET` is set in production.
- Make sure the schema is migrated (`npm run db:push`) and at least one user exists (`npm run seed`).

**Port already in use?**
```bash
lsof -i :3100
pm2 delete all && pm2 start npm --name "philly-dashboard" -- start
```
