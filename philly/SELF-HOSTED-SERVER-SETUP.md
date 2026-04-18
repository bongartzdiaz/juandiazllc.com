# Self-Hosted Dashboard — Amsterdam Server Setup
> Complete guide to deploy the dashboard on your own Ubuntu server.
> No Digital Ocean, no platform fees — full control.

---

## WHAT YOU NEED BEFORE STARTING

- Ubuntu 22.04 LTS server (minimum 2GB RAM, 2 vCPU, 20GB disk)
- A domain name pointing to your server IP
- SSH access as root or sudo user
- Your project files pushed to GitHub (private repo)
- A GitHub Personal Access Token with `repo` scope

---

## PART 1 — SERVER FIRST-TIME SETUP

SSH into your server and run these once.

### 1A. Update the system
```bash
apt update && apt upgrade -y
apt install -y curl git unzip ufw fail2ban
```

### 1B. Create a deploy user (never run apps as root)
```bash
adduser deploy
usermod -aG sudo deploy

# Copy your SSH key to the deploy user
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

### 1C. Firewall — only open what you need
```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH       # SSH — port 22
ufw allow 80            # HTTP
ufw allow 443           # HTTPS
ufw enable

# Verify
ufw status
```

### 1D. Install Node.js 20 LTS
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
apt install -y nodejs
node --version    # should show v20.x
npm --version
```

### 1E. Install PM2 (keeps the app running forever)
```bash
npm install -g pm2

# Make PM2 start on server reboot
pm2 startup systemd
# Copy and run the command it outputs
```

### 1F. Install Nginx (reverse proxy — handles SSL + routing)
```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 1G. Install Certbot (free SSL via Let's Encrypt)
```bash
apt install -y certbot python3-certbot-nginx
```

---

## PART 2 — PULL YOUR CODE

Switch to the deploy user:
```bash
su - deploy
```

### 2A. Clone the repo
```bash
mkdir -p /home/deploy/apps
cd /home/deploy/apps

git clone https://YOUR_TOKEN@github.com/Bongartzdiaz/Phily.git dashboard
cd dashboard
```

Replace `YOUR_TOKEN` with your GitHub PAT (`ghp_...`).

### 2B. Install dependencies
```bash
npm install
```

### 2C. Create the environment file
```bash
nano .env.local
```

Paste all your keys (see DASHBOARD-LIVE-SETUP.md for the full list):
```env
# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://YOURPROJECTID.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# GHL
GHL_API_KEY=pit-xxxx
GHL_LOCATION_ID=xxxx
GHL_PIPELINE_NAME=Sales

# META ADS
META_ACCESS_TOKEN=EAAx
META_AD_ACCOUNT_ID=act_xxxx

# DM CHAMP
DMCHAMP_API_KEY=
DMCHAMP_WEBHOOK_SECRET=

# SLACK
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx

# ANTHROPIC
ANTHROPIC_API_KEY=sk-ant-

# APP — use your actual domain
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NODE_ENV=production
```

Save: `Ctrl+X` → `Y` → Enter

### 2D. Build the app
```bash
npm run build
```

This creates the `.next/` folder with the optimised production build. Takes 1–3 minutes.

---

## PART 3 — START WITH PM2

### 3A. Create PM2 config
```bash
cat > /home/deploy/apps/dashboard/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name:        'hmb-dashboard',
      script:      'node_modules/.bin/next',
      args:        'start',
      cwd:         '/home/deploy/apps/dashboard',
      instances:   1,           // increase to 'max' if you have multiple CPU cores
      exec_mode:   'fork',
      env: {
        NODE_ENV:  'production',
        PORT:      3000,
      },
      // Auto-restart if app crashes
      autorestart: true,
      watch:       false,
      max_memory_restart: '512M',
      // Log files
      out_file:    '/home/deploy/logs/dashboard-out.log',
      error_file:  '/home/deploy/logs/dashboard-err.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
    }
  ]
}
EOF
```

### 3B. Create logs folder
```bash
mkdir -p /home/deploy/logs
```

### 3C. Start the app
```bash
cd /home/deploy/apps/dashboard
pm2 start ecosystem.config.js

# Save so it restarts on reboot
pm2 save

# Check it's running
pm2 status
pm2 logs hmb-dashboard --lines 20
```

App is now running on `http://localhost:3000` — not public yet, Nginx will expose it.

---

## PART 4 — NGINX CONFIGURATION

### 4A. Create Nginx site config
```bash
sudo nano /etc/nginx/sites-available/dashboard
```

Paste this (replace `yourdomain.com` with your actual domain):
```nginx
server {
    listen 80;
    listen [::]:80;
    server_name yourdomain.com www.yourdomain.com;

    # Redirect all HTTP to HTTPS (after SSL is set up)
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL — Certbot will fill these in automatically
    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options            "SAMEORIGIN"                          always;
    add_header X-Content-Type-Options     "nosniff"                             always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin"     always;

    # Proxy to Next.js
    location / {
        proxy_pass         http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade           $http_upgrade;
        proxy_set_header   Connection        'upgrade';
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Next.js static assets — serve directly (faster)
    location /_next/static/ {
        proxy_pass   http://localhost:3000;
        expires      365d;
        add_header   Cache-Control "public, immutable";
    }

    # Limit upload size
    client_max_body_size 10M;

    # Gzip compression
    gzip              on;
    gzip_comp_level   6;
    gzip_types        text/plain text/css application/json application/javascript
                      text/xml application/xml image/svg+xml;
}
```

### 4B. Enable the site
```bash
# Enable
sudo ln -s /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/

# Remove default
sudo rm -f /etc/nginx/sites-enabled/default

# Test config
sudo nginx -t

# Reload
sudo systemctl reload nginx
```

---

## PART 5 — SSL CERTIFICATE (Free)

First make sure your domain's DNS A record points to your server IP.
Then run:

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Certbot will:
1. Verify you own the domain (via HTTP challenge)
2. Issue the certificate
3. **Automatically update your Nginx config** with SSL settings
4. Set up auto-renewal (every 90 days)

Test renewal works:
```bash
sudo certbot renew --dry-run
```

**Your site is now live at `https://yourdomain.com`** ✓

---

## PART 6 — AUTO-DEPLOY ON GIT PUSH

Every time you push to GitHub, the server should automatically pull and rebuild. Two options:

### Option A — Simple: GitHub Webhook (recommended)

#### On your server — create a deploy script:
```bash
cat > /home/deploy/deploy.sh << 'EOF'
#!/bin/bash
set -e

APP_DIR="/home/deploy/apps/dashboard"
LOG_FILE="/home/deploy/logs/deploy.log"

echo "[$(date)] Deploy started" >> $LOG_FILE

cd $APP_DIR

# Pull latest code
git pull origin main >> $LOG_FILE 2>&1

# Install any new dependencies
npm install --production=false >> $LOG_FILE 2>&1

# Build
npm run build >> $LOG_FILE 2>&1

# Restart app
pm2 reload hmb-dashboard >> $LOG_FILE 2>&1

echo "[$(date)] Deploy complete" >> $LOG_FILE
EOF

chmod +x /home/deploy/deploy.sh
```

#### Create a tiny webhook receiver:
```bash
cat > /home/deploy/apps/webhook/server.js << 'EOF'
const http   = require('http')
const crypto = require('crypto')
const { exec } = require('child_process')

const SECRET = process.env.WEBHOOK_SECRET || 'change-this-secret'
const PORT   = 9000

http.createServer((req, res) => {
  if (req.method !== 'POST' || req.url !== '/deploy') {
    res.writeHead(404); res.end(); return
  }

  let body = ''
  req.on('data', chunk => body += chunk)
  req.on('end', () => {
    // Verify GitHub signature
    const sig = req.headers['x-hub-signature-256'] || ''
    const expected = 'sha256=' + crypto
      .createHmac('sha256', SECRET)
      .update(body)
      .digest('hex')

    if (sig !== expected) {
      res.writeHead(401); res.end('Unauthorized'); return
    }

    res.writeHead(200); res.end('OK')

    // Run deploy in background
    exec('/home/deploy/deploy.sh', (err, stdout, stderr) => {
      if (err) console.error('Deploy error:', err)
      else console.log('Deploy success:', new Date().toISOString())
    })
  })
}).listen(PORT, () => console.log(`Webhook listening on :${PORT}`))
EOF

mkdir -p /home/deploy/apps/webhook
```

Start the webhook server with PM2:
```bash
cd /home/deploy/apps/webhook
pm2 start server.js --name webhook -- --env WEBHOOK_SECRET=your-secret-here
pm2 save
```

Add to Nginx (inside the `server { }` block, before the closing `}`):
```nginx
    # Webhook for auto-deploy (internal only via specific path)
    location /webhook/deploy {
        proxy_pass http://localhost:9000/deploy;
        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Hub-Signature-256 $http_x_hub_signature_256;
    }
```

In GitHub → Phily repo → Settings → Webhooks → Add webhook:
```
Payload URL:  https://yourdomain.com/webhook/deploy
Content type: application/json
Secret:       your-secret-here  (same as above)
Events:       Just the push event
Active:       ✓
```

Now every `git push origin main` automatically deploys to your server.

### Option B — Manual deploy (simpler, no webhook)
```bash
# SSH in and run manually when needed
ssh deploy@yourserver.com
cd /home/deploy/apps/dashboard && ./deploy.sh
```

---

## PART 7 — DNS SETTINGS

In your domain registrar (Cloudflare / TransIP / etc.):

```
Type    Name    Value                   TTL
A       @       YOUR.SERVER.IP.HERE     Auto (or 300)
A       www     YOUR.SERVER.IP.HERE     Auto (or 300)
```

**If using Cloudflare** (recommended — free DDoS protection + caching):
- Set SSL/TLS mode to **Full (strict)**
- Enable **Auto Minify** (JS, CSS, HTML)
- Enable **Brotli compression**
- DNS proxy: **✓ Proxied** (orange cloud) — hides your real server IP

---

## PART 8 — MONITORING & MAINTENANCE

### Check app status
```bash
pm2 status                          # all running processes
pm2 logs hmb-dashboard --lines 50   # recent logs
pm2 monit                           # live CPU/memory monitor
```

### Check Nginx
```bash
sudo systemctl status nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Disk & memory
```bash
df -h        # disk usage
free -h      # memory usage
htop         # live process monitor (install: apt install htop)
```

### Update the server regularly
```bash
apt update && apt upgrade -y
pm2 update
```

### SSL auto-renewal (runs automatically, but verify)
```bash
sudo certbot renew --dry-run
# Renewal runs automatically via systemd timer
systemctl status certbot.timer
```

---

## PART 9 — USEFUL COMMANDS CHEATSHEET

| Task | Command |
|---|---|
| Start app | `pm2 start ecosystem.config.js` |
| Stop app | `pm2 stop hmb-dashboard` |
| Restart app | `pm2 restart hmb-dashboard` |
| Zero-downtime reload | `pm2 reload hmb-dashboard` |
| View live logs | `pm2 logs hmb-dashboard` |
| Manual deploy | `cd ~/apps/dashboard && ./deploy.sh` |
| Test Nginx config | `sudo nginx -t` |
| Reload Nginx | `sudo systemctl reload nginx` |
| Check firewall | `sudo ufw status` |
| Check SSL | `sudo certbot certificates` |
| Renew SSL | `sudo certbot renew` |

---

## PART 10 — ENVIRONMENT VARIABLE SECURITY

Your `.env.local` contains sensitive keys. Lock it down:
```bash
chmod 600 /home/deploy/apps/dashboard/.env.local
chown deploy:deploy /home/deploy/apps/dashboard/.env.local
```

Make sure `.env.local` is in your `.gitignore` (it should be by default with Next.js):
```bash
grep ".env.local" /home/deploy/apps/dashboard/.gitignore
# Should output: .env.local
```

If it's not there:
```bash
echo ".env.local" >> /home/deploy/apps/dashboard/.gitignore
```

---

## TROUBLESHOOTING

**App won't start**
```bash
pm2 logs hmb-dashboard --lines 100   # check for errors
cd ~/apps/dashboard && npm run build  # rebuild if needed
```

**502 Bad Gateway from Nginx**
```bash
pm2 status        # is the app actually running?
pm2 restart hmb-dashboard
```

**SSL certificate error**
```bash
sudo certbot certificates              # check expiry
sudo certbot renew --force-renewal     # force renew
sudo systemctl reload nginx
```

**Can't push to GitHub from server (token expired)**
```bash
cd ~/apps/dashboard
git remote set-url origin https://NEW_TOKEN@github.com/Bongartzdiaz/Phily.git
```

**Port 3000 already in use**
```bash
lsof -i :3000           # find what's using it
pm2 delete all          # kill all pm2 processes
pm2 start ecosystem.config.js
```

---

*Your server in Amsterdam, fully under your control.*
*No platform fees, no vendor lock-in, full root access.*
