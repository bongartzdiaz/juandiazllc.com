# PhilanthropyAI — Deployment Guide

## What You Need

- A VPS server (Digital Ocean, Hetzner, AWS, etc.) with Ubuntu 22.04+
- A domain name (e.g., philanthropyai.eu) pointed to your server IP
- SSH access to the server (root or sudo user)
- Node.js 20+ installed on the server

---

## Step 1: Point Your Domain to the Server

Go to your domain registrar (Cloudflare, Namecheap, GoDaddy, etc.) and create:

```
Type: A
Name: @ (or your subdomain like "app")
Value: YOUR_SERVER_IP
TTL: Auto
```

If you want `www` too:
```
Type: CNAME
Name: www
Value: philanthropyai.eu
```

Wait 5-30 minutes for DNS propagation.

---

## Step 2: SSH into Your Server

```bash
ssh root@YOUR_SERVER_IP
```

---

## Step 3: Install Dependencies on the Server

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Install PM2 (process manager)
npm install -g pm2

# Install Nginx (reverse proxy)
apt install -y nginx

# Install Certbot (free SSL)
apt install -y certbot python3-certbot-nginx

# Verify installations
node -v    # Should show v20.x
npm -v     # Should show 10.x
pm2 -v     # Should show 5.x
nginx -v   # Should show nginx/1.x
```

---

## Step 4: Clone and Build the Project

```bash
# Create app directory
mkdir -p /var/www
cd /var/www

# Clone the repository
git clone https://github.com/bongartzdiaz/Phily.git philanthropyai
cd philanthropyai

# Install dependencies
npm install

# Create environment file
cp .env.example .env.local
nano .env.local
```

Edit `.env.local` with your values:
```
DATABASE_URL=postgresql://user:password@localhost:5432/philanthropyai
NEXTAUTH_SECRET=run-this-command-openssl-rand-base64-32
NEXTAUTH_URL=https://philanthropyai.eu
```

Generate a secret:
```bash
openssl rand -base64 32
# Copy the output and paste it as NEXTAUTH_SECRET
```

Build the project:
```bash
npm run build
```

---

## Step 5: Start the App with PM2

```bash
# Start the app on port 3000
pm2 start npm --name "philanthropyai" -- start

# Save PM2 config (auto-restart on server reboot)
pm2 save
pm2 startup
# Run the command it outputs

# Verify it's running
pm2 status
curl http://localhost:3000
```

---

## Step 6: Configure Nginx (Reverse Proxy)

```bash
nano /etc/nginx/sites-available/philanthropyai
```

Paste this configuration (replace `philanthropyai.eu` with your domain):

```nginx
server {
    listen 80;
    server_name philanthropyai.eu www.philanthropyai.eu;

    location / {
        proxy_pass http://localhost:3000;
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

Enable the site:
```bash
ln -s /etc/nginx/sites-available/philanthropyai /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default  # Remove default site
nginx -t                              # Test config
systemctl restart nginx
```

Visit `http://philanthropyai.eu` — you should see the dashboard.

---

## Step 7: Enable HTTPS (Free SSL with Let's Encrypt)

```bash
certbot --nginx -d philanthropyai.eu -d www.philanthropyai.eu
```

Follow the prompts:
1. Enter your email
2. Agree to terms
3. Choose "redirect HTTP to HTTPS" when asked

Certbot auto-renews. Verify with:
```bash
certbot renew --dry-run
```

Visit `https://philanthropyai.eu` — your site is now live with SSL.

---

## Step 8: Set Up Auto-Deploy (Optional)

Create a deploy script on the server:

```bash
nano /var/www/philanthropyai/deploy.sh
```

```bash
#!/bin/bash
cd /var/www/philanthropyai
git pull origin master
npm install
npm run build
pm2 restart philanthropyai
echo "Deploy complete!"
```

```bash
chmod +x /var/www/philanthropyai/deploy.sh
```

To deploy updates:
```bash
# On the server:
/var/www/philanthropyai/deploy.sh

# Or from your local machine:
ssh root@YOUR_SERVER_IP "/var/www/philanthropyai/deploy.sh"
```

---

## Quick Reference

| Command | Description |
|---------|-------------|
| `pm2 status` | Check if app is running |
| `pm2 logs philanthropyai` | View app logs |
| `pm2 restart philanthropyai` | Restart the app |
| `pm2 stop philanthropyai` | Stop the app |
| `nginx -t` | Test nginx config |
| `systemctl restart nginx` | Restart nginx |
| `certbot renew` | Renew SSL certificate |

---

## Troubleshooting

**App not loading?**
```bash
pm2 logs philanthropyai --lines 50  # Check for errors
curl http://localhost:3000           # Test if app responds
```

**Nginx errors?**
```bash
nginx -t                    # Check config syntax
tail -f /var/log/nginx/error.log
```

**Port already in use?**
```bash
lsof -i :3000              # Find what's using port 3000
pm2 delete all && pm2 start npm --name "philanthropyai" -- start
```

**Update the app?**
```bash
cd /var/www/philanthropyai
git pull origin master
npm install
npm run build
pm2 restart philanthropyai
```
