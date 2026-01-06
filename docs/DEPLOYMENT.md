# BamenyaAI Deployment Guide

Complete guide for deploying BamenyaAI to a VPS (Virtual Private Server).

---

## Table of Contents

1. [VPS Requirements](#vps-requirements)
2. [Initial Server Setup](#initial-server-setup)
3. [Install Dependencies](#install-dependencies)
4. [Deploy Dify](#deploy-dify)
5. [Deploy Supabase](#deploy-supabase)
6. [Deploy Frontend](#deploy-frontend)
7. [Configure Nginx](#configure-nginx)
8. [SSL with Let's Encrypt](#ssl-with-lets-encrypt)
9. [Domain Setup](#domain-setup)
10. [Monitoring & Maintenance](#monitoring--maintenance)

---

## VPS Requirements

### Minimum Specs
- **RAM**: 4GB (8GB recommended)
- **CPU**: 2 vCPUs
- **Storage**: 50GB SSD
- **OS**: Ubuntu 22.04 LTS

### Recommended Providers
- DigitalOcean ($24/month for 4GB)
- Hetzner ($10/month for 4GB - great value)
- Vultr ($24/month for 4GB)
- Contabo ($7/month for 8GB - budget option)

---

## Initial Server Setup

### 1. Connect to Server

```bash
ssh root@your-server-ip
```

### 2. Create Non-Root User

```bash
adduser bamenyaai
usermod -aG sudo bamenyaai
su - bamenyaai
```

### 3. Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 4. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

---

## Install Dependencies

### 1. Install Docker

```bash
# Add Docker's official GPG key
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Add repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker
```

### 2. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Install Nginx

```bash
sudo apt install -y nginx
```

### 4. Install PM2 (Process Manager)

```bash
sudo npm install -g pm2
```

---

## Deploy Dify

### 1. Clone and Start Dify

```bash
cd ~
git clone https://github.com/langgenius/dify.git
cd dify/docker

# Copy environment file
cp .env.example .env

# Edit .env for production
nano .env
```

### 2. Configure Dify Environment

Edit `.env` file:

```env
# Change these for production
SECRET_KEY=your-random-secret-key-here-make-it-long
CONSOLE_WEB_URL=https://dify.yourdomain.com
SERVICE_API_URL=https://dify.yourdomain.com
APP_WEB_URL=https://dify.yourdomain.com
```

### 3. Start Dify

```bash
docker compose up -d
```

### 4. Verify Dify is Running

```bash
docker compose ps
```

All containers should be "Up".

---

## Deploy Supabase

### Option A: Self-Hosted Supabase (Recommended for full control)

```bash
cd ~
git clone --depth 1 https://github.com/supabase/supabase
cd supabase/docker

# Copy environment file
cp .env.example .env

# Edit .env - change passwords!
nano .env

# Start Supabase
docker compose up -d
```

### Option B: Supabase Cloud (Easier)

1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Get your project URL and anon key
4. Run migrations manually in SQL editor

---

## Deploy Frontend

### 1. Clone Repository

```bash
cd ~
git clone https://github.com/YOUR_USERNAME/bamenyaAI.git
cd bamenyaAI/frontend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

```bash
cp .env.example .env.local
nano .env.local
```

Update with production values:

```env
NEXT_PUBLIC_SUPABASE_URL=https://supabase.yourdomain.com
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-production-anon-key

NEXT_PUBLIC_DIFY_API_URL=https://dify.yourdomain.com/v1
NEXT_PUBLIC_DIFY_API_KEY=your-dify-api-key
```

### 4. Build for Production

```bash
npm run build
```

### 5. Start with PM2

```bash
pm2 start npm --name "bamenyaai" -- start
pm2 save
pm2 startup
```

---

## Configure Nginx

### 1. Create Nginx Config for Frontend

```bash
sudo nano /etc/nginx/sites-available/bamenyaai
```

```nginx
server {
    listen 80;
    server_name bamenyaai.com www.bamenyaai.com;

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

### 2. Create Nginx Config for Dify

```bash
sudo nano /etc/nginx/sites-available/dify
```

```nginx
server {
    listen 80;
    server_name dify.bamenyaai.com;

    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3. Enable Sites

```bash
sudo ln -s /etc/nginx/sites-available/bamenyaai /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/dify /etc/nginx/sites-enabled/

# Test config
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## SSL with Let's Encrypt

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Get SSL Certificates

```bash
# For main domain
sudo certbot --nginx -d bamenyaai.com -d www.bamenyaai.com

# For Dify subdomain
sudo certbot --nginx -d dify.bamenyaai.com
```

### 3. Auto-Renewal

Certbot automatically sets up renewal. Test with:

```bash
sudo certbot renew --dry-run
```

---

## Domain Setup

### DNS Records

Add these DNS records at your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A | @ | your-server-ip |
| A | www | your-server-ip |
| A | dify | your-server-ip |
| A | supabase | your-server-ip (if self-hosted) |

---

## Monitoring & Maintenance

### View Logs

```bash
# Frontend logs
pm2 logs bamenyaai

# Dify logs
cd ~/dify/docker && docker compose logs -f

# Nginx logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### Restart Services

```bash
# Frontend
pm2 restart bamenyaai

# Dify
cd ~/dify/docker && docker compose restart

# Nginx
sudo systemctl restart nginx
```

### Update Application

```bash
cd ~/bamenyaAI
git pull origin main
cd frontend
npm install
npm run build
pm2 restart bamenyaai
```

### Backup Database

```bash
# Supabase backup (if self-hosted)
docker exec -t supabase-db pg_dump -U postgres > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Frontend Not Loading
```bash
# Check PM2 status
pm2 status

# Check logs
pm2 logs bamenyaai --lines 50
```

### Dify Not Responding
```bash
# Check Docker containers
cd ~/dify/docker
docker compose ps

# Restart Dify
docker compose down && docker compose up -d
```

### Database Connection Issues
```bash
# Check Supabase containers
cd ~/supabase/docker
docker compose ps

# Check PostgreSQL logs
docker compose logs db
```

### SSL Certificate Issues
```bash
# Force renewal
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

---

## Security Checklist

- [ ] Change all default passwords
- [ ] Use strong SECRET_KEY for Dify
- [ ] Enable firewall (UFW)
- [ ] Set up SSL certificates
- [ ] Regular system updates
- [ ] Set up automated backups
- [ ] Use SSH keys instead of passwords
- [ ] Configure fail2ban for brute-force protection

---

## Cost Estimation

| Service | Monthly Cost |
|---------|--------------|
| VPS (4GB RAM) | $10-24 |
| Domain | $10-15/year |
| SSL | Free (Let's Encrypt) |
| **Total** | **~$15-30/month** |

---

## Next Steps

After deployment:

1. Configure Dify app with production settings
2. Set up monitoring (Uptime Robot, etc.)
3. Configure automated backups
4. Set up CI/CD for automatic deployments
