# Guideline.md - VPS Deployment Guide

Complete guide for deploying the IGI SMTP Platform on a Virtual Private Server (VPS). This document covers server preparation, configuration, deployment steps, and production best practices.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Initial Server Setup](#initial-server-setup)
4. [Install Dependencies](#install-dependencies)
5. [Database Configuration](#database-configuration)
6. [Application Deployment](#application-deployment)
7. [Reverse Proxy Setup](#reverse-proxy-setup)
8. [SSL/TLS Configuration](#ssltls-configuration)
9. [Process Management](#process-management)
10. [Firewall & Security](#firewall--security)
11. [Monitoring & Maintenance](#monitoring--maintenance)
12. [Backup Strategy](#backup-strategy)
13. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- VPS with Ubuntu 22.04 LTS or Ubuntu 24.04 LTS
- Root or sudo access
- Valid domain name pointing to your VPS IP
- Microsoft 365 tenant with SMTP relay permissions (for real email delivery)

---

## Server Requirements

### Minimum Specifications
- **CPU**: 1 vCPU
- **RAM**: 1 GB
- **Storage**: 20 GB SSD
- **OS**: Ubuntu 22.04/24.04 LTS

### Recommended Specifications (Production)
- **CPU**: 2 vCPUs
- **RAM**: 4 GB
- **Storage**: 40 GB SSD
- **OS**: Ubuntu 22.04/24.04 LTS

### Microsoft 365 Prerequisites
1. Azure AD App Registration with `SMTP.Send` permission
2. Client secret configured (valid for 1-2 years)
3. Sender email address in your Microsoft 365 tenant
4. Admin consent granted for application permissions

---

## Initial Server Setup

### 1. Connect to Your VPS

```bash
ssh root@your-vps-ip-address
```

### 2. Update System Packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git ufw
```

### 3. Create a Non-Root User (Recommended)

```bash
adduser deployuser
usermod -aG sudo deployuser
su - deployuser
```

---

## Install Dependencies

### Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

Verify installation:

```bash
node -v  # Should output v20.x.x
npm -v   # Should output 10.x.x or higher
```

### PM2 Process Manager

```bash
sudo npm install -g pm2
```

PM2 features:
- Automatic application restart on crash
- Auto-start on server boot
- Process monitoring and logs
- Memory limit enforcement

### Nginx Web Server

```bash
sudo apt install -y nginx
```

---

## Database Configuration

### Option 1: PostgreSQL (Recommended for Production)

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

Create database and user:

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell:
CREATE DATABASE igi_smtp;
CREATE USER igi_admin WITH ENCRYPTED PASSWORD 'your_secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE igi_smtp TO igi_admin;
GRANT ALL ON SCHEMA public TO igi_admin;
\q
```

### Option 2: SQLite (Development Only)

SQLite is included by default. For production, PostgreSQL is recommended for:
- Better concurrent write performance
- Easier backup/restore
- Better query optimization

---

## Application Deployment

### 1. Clone the Repository

```bash
# Using git (recommended)
sudo mkdir -p /var/www
sudo chown -R $USER:$USER /var/www
cd /var/www
git clone https://github.com/IGINIGERIA/SMTP-V1.git igi-smtp
cd igi-smtp

# Or upload via SCP/SFTP
# scp -r local-files/* deployuser@your-vps:/var/www/igi-smtp/
```

### 2. Configure Environment Variables

```bash
# Create production .env file
sudo nano .env
```

**Production .env Configuration:**

```env
# Environment
NODE_ENV=production
PORT=3000

# Database (PostgreSQL)
DATABASE_URL="postgresql://igi_admin:your_secure_password_here@localhost:5432/igi_smtp?schema=public"

# Microsoft Graph API
MICROSOFT_TENANT_ID=your-tenant-id-here
MICROSOFT_CLIENT_ID=your-client-id-here
MICROSOFT_CLIENT_SECRET=your-client-secret-here
MICROSOFT_SENDER_EMAIL=admin@yourdomain.com

# Application URL (Change to your domain)
APP_URL=https://yourdomain.com
```

Save and exit (Ctrl+X, Y, Enter).

### 3. Install Dependencies

```bash
npm ci --only=production
```

### 4. Generate Prisma Client

```bash
npx prisma generate
```

### 5. Run Database Migrations

```bash
# For PostgreSQL (recommended)
npx prisma migrate deploy

# Or push schema directly for initial setup
# npx prisma db push
```

### 6. Build the Application

```bash
npm run build
```

This creates:
- `dist/server.cjs` - Bundled Node.js server
- `dist/` - Built frontend assets

### 7. Test the Application (Optional)

```bash
node dist/server.cjs
```

Press Ctrl+C to stop. Check for any errors in the output.

---

## Reverse Proxy Setup

### 1. Create Nginx Configuration

```bash
sudo nano /etc/nginx/sites-available/igi-smtp
```

**Nginx Configuration:**

```nginx
# HTTP redirect to HTTPS
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    # SSL certificates (will be configured by Certbot)
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # SSL optimization
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;
    ssl_session_cache shared:SSL:10m;
    ssl_session_timeout 10m;

    # Proxy settings
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

        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Increase client body size for CSV imports
    client_max_body_size 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Cache static assets (optional, for built frontend)
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://localhost:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Replace `yourdomain.com` with your actual domain.

### 2. Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/igi-smtp /etc/nginx/sites-enabled/
sudo nginx -t  # Test configuration
sudo systemctl reload nginx
```

---

## SSL/TLS Configuration

### 1. Obtain SSL Certificate with Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

Follow the prompts:
- Enter your email address (for renewal notifications)
- Agree to Terms of Service
- Choose whether to redirect HTTP to HTTPS (recommended: Yes)

### 2. Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

Certbot automatically sets up renewal. Check with:

```bash
sudo systemctl status certbot.timer
```

---

## Process Management

### 1. Start Application with PM2

```bash
cd /var/www/igi-smtp
pm2 start dist/server.cjs --name "igi-smtp" --max-memory-restart 512M
```

### 2. Configure PM2 Startup

```bash
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp /home/$(whoami)
```

Follow the command output instructions (usually runs `sudo pm2 save`).

### 3. Save PM2 Configuration

```bash
pm2 save
```

### 4. Generate PM2 Startup Script

```bash
pm2 startup
```

### 5. Verify PM2 is Running

```bash
pm2 status
pm2 logs igi-smtp
```

---

## Firewall & Security

### 1. Configure UFW Firewall

```bash
# Allow SSH (change 22 to your custom SSH port if modified)
sudo ufw allow 22/tcp

# Allow HTTP and HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw --force enable
```

Check status:

```bash
sudo ufw status
```

### 2. Secure SSH (Recommended)

```bash
sudo nano /etc/ssh/sshd_config
```

Recommended changes:
```ssh
Port 2222  # Change from 22
PermitRootLogin no
PasswordAuthentication no  # Use SSH keys instead
```

Restart SSH:
```bash
sudo systemctl restart sshd
```

Update UFW rules:
```bash
sudo ufw deny 22/tcp
sudo ufw allow 2222/tcp
```

### 3. Disable Unused Services

```bash
sudo systemctl disable bluetooth
sudo systemctl disable cups
```

---

## Monitoring & Maintenance

### PM2 Monitoring Commands

```bash
# View logs
pm2 logs igi-smtp

# Monitor processes
pm2 monit

# Check status
pm2 status

# Restart application
pm2 restart igi-smtp

# Stop application
pm2 stop igi-smtp

# Delete from PM2
pm2 delete igi-smtp
```

### System Monitoring

```bash
# Disk usage
df -h

# Memory usage
free -h

# CPU usage
top

# Real-time process monitoring
htop  # Install with: sudo apt install htop
```

### Nginx Logs

```bash
# Access logs
sudo tail -f /var/log/nginx/access.log

# Error logs
sudo tail -f /var/log/nginx/error.log
```

---

## Backup Strategy

### 1. PostgreSQL Database Backup (Recommended)

Create backup script:

```bash
sudo nano /home/deployuser/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/deployuser/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

# Dump database
sudo -u postgres pg_dump igi_smtp > $BACKUP_DIR/igi-smtp_$TIMESTAMP.sql

# Compress
gzip $BACKUP_DIR/igi-smtp_$TIMESTAMP.sql

# Keep only last 30 days
find $BACKUP_DIR -name "igi-smtp_*.sql.gz" -mtime +30 -delete

echo "Backup completed: igi-smtp_$TIMESTAMP.sql.gz"
```

Make executable:
```bash
sudo chmod +x /home/deployuser/backup-db.sh
```

### 2. Automated Daily Backups

Add to crontab:
```bash
crontab -e
```

Add line:
```
0 2 * * * /home/deployuser/backup-db.sh >> /home/deployuser/backup.log 2>&1
```

This runs backup daily at 2 AM.

### 3. Full System Backup (Optional)

Consider backup services:
- VPS provider snapshots (DigitalOcean, Linode, etc.)
- Remote backup to S3 or similar
- Offsite backup to another server

---

## Troubleshooting

### Application Won't Start

**Check logs:**
```bash
pm2 logs igi-smtp
```

**Common issues:**
1. **Port 3000 already in use:**
   ```bash
   sudo lsof -i :3000
   sudo kill -9 <PID>
   ```

2. **Database connection error:**
   - Verify DATABASE_URL in .env
   - Check PostgreSQL is running: `sudo systemctl status postgresql`
   - Test connection: `sudo -u postgres psql -c "SELECT 1;"`

3. **Missing environment variables:**
   ```bash
   cat .env
   # Verify all required vars are set
   ```

### PostgreSQL Connection Issues

```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# View PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-*-main.log

# Test connection
sudo -u postgres psql -c "SELECT 1;"

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Nginx 502 Bad Gateway

```bash
# Check if app is running
pm2 status

# Check app logs
pm2 logs igi-smtp

# Verify nginx configuration
sudo nginx -t

# Restart services
pm2 restart igi-smtp
sudo systemctl restart nginx
```

### SSL Certificate Issues

```bash
# Test certificate renewal
sudo certbot renew --dry-run

# Check certificate expiry
sudo certbot certificates

# Manual renewal if needed
sudo certbot renew
```

### High Memory Usage

PM2 auto-restarts when memory exceeds 512MB (configured in startup command).

To adjust:
```bash
pm2 restart igi-smtp --max-memory-restart 1G
pm2 save
```

### Email Deliverability Issues

Check Microsoft Graph API status:
```bash
# Verify credentials in .env
# Check Microsoft 365 admin center for app permissions
# Test Microsoft Graph connection:
curl -X POST http://localhost:3000/api/microsoft-settings/verify
```

---

## Update & Deployment

### Updating the Application

```bash
cd /var/www/igi-smtp

# Pull latest changes
git pull origin main

# Install new dependencies
npm ci --only=production

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Build application
npm run build

# Restart PM2
pm2 restart igi-smtp
```

### Zero-Downtime Deployment (Advanced)

Use PM2 reload instead of restart:
```bash
pm2 reload igi-smtp
```

---

## Production Environment Checklist

- [ ] Node.js 20+ installed
- [ ] PostgreSQL running with created database
- [ ] Application cloned to `/var/www/igi-smtp`
- [ ] `.env` file configured with production values
- [ ] Microsoft Graph credentials configured
- [ ] Database migrations run (`prisma migrate deploy`)
- [ ] Application built (`npm run build`)
- [ ] PM2 started and configured for auto-start
- [ ] Nginx configured as reverse proxy
- [ ] SSL certificate installed and auto-renewal configured
- [ ] UFW firewall enabled with proper rules
- [ ] Domain DNS pointing to VPS IP
- [ ] Backups configured and tested
- [ ] Monitoring setup (PM2, server logs)
- [ ] Default admin password changed
- [ ] Application tested via HTTPS domain

---

## Environment Variables Reference

| Variable | Description | Required | Production Example |
|----------|-------------|----------|-------------------|
| `NODE_ENV` | Environment mode | Yes | `production` |
| `PORT` | Port for Express server | Yes | `3000` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | `postgresql://user:pass@localhost:5432/igi_smtp?schema=public` |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID | For real emails | `your-tenant-id` |
| `MICROSOFT_CLIENT_ID` | Azure app client ID | For real emails | `your-client-id` |
| `MICROSOFT_CLIENT_SECRET` | Azure app client secret | For real emails | `your-client-secret` |
| `MICROSOFT_SENDER_EMAIL` | Default sender email | For real emails | `admin@yourdomain.com` |
| `APP_URL` | Public URL for tracking links | Yes | `https://yourdomain.com` |

---

## Additional Recommendations

### Performance
- Use Redis for caching if scaling beyond single server
- Implement CDN for frontend assets
- Enable gzip compression in Nginx
- Configure database connection pooling

### Security
- Regular security updates: `sudo apt update && sudo apt upgrade -y`
- Use SSH keys instead of passwords
- Install Fail2Ban to prevent brute force attacks
- Regular Microsoft secret rotation (every 6-12 months)
- Implement rate limiting in Nginx

### Scalability
- Set up load balancer for multiple app instances
- Use managed PostgreSQL (RDS, CloudSQL)
- Implement queue system (Redis Bull) for large campaigns
- Separate web server and database servers

---

## Support & Resources

- **Project Repository:** https://github.com/IGINIGERIA/SMTP-V1
- **API Documentation:** See Backend.md
- **Platform Usage:** See ReadMe.md
- **Issues:** Report via GitHub Issues

---

## Quick Reference Commands

```bash
# Application management
pm2 start dist/server.cjs --name "igi-smtp"
pm2 restart igi-smtp
pm2 stop igi-smtp
pm2 logs igi-smtp
pm2 monit

# Database
sudo -u postgres psql
npx prisma migrate deploy
npx prisma studio  # Optional, for database browser

# System
sudo systemctl status nginx
sudo systemctl restart nginx
sudo systemctl status postgresql
sudo ufw status

# Logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
tail -f /var/log/postgresql/postgresql-*-main.log
```

---

*Deployment Guide Version: 1.0*
*Last Updated: 2024*