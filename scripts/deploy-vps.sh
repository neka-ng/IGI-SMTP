#!/bin/bash
# =========================================================================
# IGI SMTP - VPS Deployment Script
# Tested on: Ubuntu 22.04 / 24.04 LTS
# Usage: bash scripts/deploy-vps.sh
# =========================================================================

set -e

echo "============================================"
echo "  IGI SMTP - VPS Deployment Script"
echo "============================================"

# Configuration
APP_DIR="/var/www/igi-smtp"
DOMAIN="${DOMAIN:-igi-smtp.io}"
NODE_VERSION="20"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}Step 1: System Update${NC}"
sudo apt update && sudo apt upgrade -y

echo -e "${YELLOW}Step 2: Install Node.js $NODE_VERSION LTS${NC}"
curl -fsSL https://deb.nodesource.com/setup_${NODE_VERSION}.x | sudo -E bash -
sudo apt install -y nodejs
node -v && npm -v

echo -e "${YELLOW}Step 3: Install PostgreSQL${NC}"
sudo apt install -y postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql

echo -e "${YELLOW}Step 4: Create Database & User${NC}"
sudo -u postgres psql -c "CREATE DATABASE igi_smtp;" 2>/dev/null || echo "Database may already exist"
sudo -u postgres psql -c "CREATE USER igi_admin WITH ENCRYPTED PASSWORD 'CHANGE_ME_TO_SECURE_PASSWORD';" 2>/dev/null || echo "User may already exist"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE igi_smtp TO igi_admin;"
sudo -u postgres psql -c "GRANT ALL ON SCHEMA public TO igi_admin;"

echo -e "${YELLOW}Step 5: Install PM2 & Nginx${NC}"
sudo npm install -g pm2
sudo apt install -y nginx certbot python3-certbot-nginx

echo -e "${YELLOW}Step 6: Setup Application Directory${NC}"
sudo mkdir -p $APP_DIR
cd $APP_DIR

echo -e "${YELLOW}Step 7: Setup Environment Variables${NC}"
cat > .env << 'EOF'
NODE_ENV=production
PORT=3000
APP_URL=https://${DOMAIN}
DATABASE_URL="postgresql://igi_admin:CHANGE_ME_TO_SECURE_PASSWORD@localhost:5432/igi_smtp?schema=public"
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_SENDER_EMAIL=admin@igi-smtp.io
EOF

echo -e "${YELLOW}Step 8: Install Dependencies & Build${NC}"
npm install
npx prisma generate
npx prisma db push
npm run build

echo -e "${YELLOW}Step 9: Start Application with PM2${NC}"
pm2 start dist/server.cjs --name "igi-smtp" --max-memory-restart 512M
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp /home/$(whoami)

echo -e "${YELLOW}Step 10: Configure Nginx${NC}"
sudo tee /etc/nginx/sites-available/igi-smtp > /dev/null << NGINX
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name $DOMAIN www.$DOMAIN;

    ssl_certificate /etc/letsencrypt/live/$DOMAIN/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/$DOMAIN/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    client_max_body_size 10m;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
NGINX

sudo ln -sf /etc/nginx/sites-available/igi-smtp /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

echo -e "${YELLOW}Step 11: Configure Firewall${NC}"
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  Deployment Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo -e "Next steps:"
echo -e "  1. Run: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
echo -e "  2. Update .env with your actual credentials"
echo -e "  3. Update MICROSOFT_* env vars in .env"
echo -e "  4. Restart the app: pm2 restart igi-smtp"
echo ""
echo -e "Useful commands:"
echo -e "  pm2 logs igi-smtp          # View application logs"
echo -e "  pm2 monit                  # Monitor process"
echo -e "  sudo systemctl status nginx # Check Nginx status"
echo ""