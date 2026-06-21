# IGI SMTP – cPanel Deployment Plan

## 1. Pre-requisites

- cPanel hosting account with **Node.js support** (usually requires "Node.js Application" feature or CloudLinux)
- SSH access or Terminal access in cPanel
- Domain or subdomain pointing to the hosting server
- PostgreSQL database (can be external like Supabase, Neon, or provider-managed)

---

## 2. Environment Variables Required

Create a `.env` file on the server with these variables. Sensitive values must be changed for production.

```env
# Database
DATABASE_URL=postgresql://user:password@host:5432/dbname

# Microsoft Graph / Entra ID (REQUIRED for real email delivery)
MICROSOFT_TENANT_ID=your_tenant_id
MICROSOFT_CLIENT_ID=your_client_id
MICROSOFT_CLIENT_SECRET=your_client_secret
MICROSOFT_SENDER_EMAIL=admin@yourdomain.com

# App
APP_URL=https://yourdomain.com
NODE_ENV=production
PORT=3000
```

> ⚠️ **Important:** The hardcoded Microsoft credentials in `server.ts` (lines 225–227) are for development only. When deploying, either overwrite them via the `.env` file above or remove them from the source.

---

## 3. Build Steps (run locally or in CI/CD)

```bash
# 1. Install dependencies
npm ci --production=false

# 2. Generate Prisma client
npx prisma generate

# 3. Push schema to PostgreSQL
npx prisma db push

# 4. Build the frontend and bundle the server
npm run build
```

Output artifacts:
- `dist/server.cjs` – bundled Node.js server
- `dist/` (or `public/`) – static frontend files

---

## 4. cPanel Upload & Setup

### 4.1 Upload Files

Use **File Manager** or **Git** (if available) to:

1. Upload `dist/` contents to `~/your_app/dist/`
2. Upload `.env` to `~/your_app/`
3. Upload `prisma/schema.prisma` to `~/your_app/`

### 4.2 Create Node.js Application

In cPanel:

1. Go to **Setup Node.js App** (or **Node.js Selector**)
2. Click **Create Application**
3. Fill in:

| Field | Value |
|-------|-------|
| Node.js version | 18.x or 20.x (LTS) |
| Application mode | Production |
| Application root | `~/your_app` |
| Application URL | `https://yourdomain.com` (or subdomain) |
| Application startup file | `dist/server.cjs` |
| Passenger log file | (auto-filled) |

4. Click **Create**

### 4.3 Install Dependencies via SSH

```bash
cd ~/your_app
npm install --production
```

---

## 5. Process Management / Startup

### Option A: Using cPanel "Setup Node.js App" (auto-restarts on crash)

After creating the app in cPanel, click **Run NPM Install** inside the app manager.

### Option B: Using PM2 (more control)

```bash
# Install PM2 globally
npm install -g pm2

# Start the app
cd ~/your_app
pm2 start dist/server.cjs --name igi-smtp

# Save the process list
pm2 save

# Generate startup script for cPanel/CloudLinux
pm2 startup
# Follow the instructions it prints (usually one command)
```

---

## 6. Database Migration

If switching from SQLite (dev) to PostgreSQL (production):

```bash
cd ~/your_app
npx prisma db push
```

The app will seed the default admin user on first run if no users exist.

---

## 7. Domain / Reverse Proxy Configuration

In cPanel:

1. Create a **Subdomain** (e.g., `smtp.yourdomain.com`) pointing to your app's public folder, OR
2. Use **ProxyPass** via **.htaccess**:

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://127.0.0.1:3000/$1 [P,L]
```

> Note: If `mod_proxy` is not enabled, use Cloudflare Tunnel or a manual reverse proxy setup via your hosting provider.

---

## 8. SSL / HTTPS

- Install an **SSL certificate** via cPanel **SSL/TLS Status**
- Set `APP_URL` to `https://yourdomain.com`
- Ensure all tracking pixels and redirects use HTTPS

---

## 9. Post-Deployment Verification Checklist

| Check | How |
|-------|-----|
| Server responds | `curl https://yourdomain.com/api/v1/health` |
| Database connected | `curl https://yourdomain.com/api/db-status` → `{"connected":true}` |
| Frontend loads | Open `https://yourdomain.com/` in browser |
| Subscribers endpoint | `curl https://yourdomain.com/api/subscribers` |
| Campaigns endpoint | `curl https://yourdomain.com/api/campaigns` |
| Default admin exists | Login at `https://yourdomain.com/` with `admin@igi-smtp.io` / `admin123` (change immediately) |

---

## 10. Common cPanel Issues & Fixes

| Issue | Fix |
|-------|-----|
| `EACCES` on port 3000 | Use the port assigned by cPanel Node.js manager (often a random high port) or set `process.env.PORT` |
| `Prisma Client not generated` | Run `npx prisma generate` after every `npm install` |
| Database connection refused | Verify `DATABASE_URL` format and that the DB server allows remote connections (or is local) |
| App crashes on restart | Check `~/npm-logs/` or cPanel error logs |
| Static files 404 | Ensure `dist/` was uploaded and the app serves them (see `server.ts` lines 2609–2621) |

---

## 11. Security Hardening

- [ ] Change default admin password immediately
- [ ] Rotate Microsoft Graph client secret
- [ ] Restrict API key creation to admin users (enforced in `server.ts`)
- [ ] Enable cPanel **Hotlink Protection** and **Password Protect Directories** for `.env` and `prisma/`
- [ ] Set up automated backups (cPanel **Backup** wizard) for `prisma/dev.db` or PostgreSQL dumps
- [ ] Configure firewall rules in cPanel **IP Blocker** if needed

---

## 12. Updating the App

```bash
cd ~/your_app
git pull origin main   # or upload new build
npm install --production
npx prisma generate
npm run build          # rebuild server.cjs
pm2 restart igi-smtp   # or restart via cPanel UI
```

---

## 13. Architecture Summary

```
┌────────────────────────────────────────────────────┐
│                   cPanel / Nginx                    │
│  ┌─────────────────────────────────────────────┐  │
│  │  Reverse Proxy (port 443 → app port)         │  │
│  └─────────────────────────────────────────────┘  │
│                        │                           │
│            ┌───────────▼────────────┐             │
│            │   Express App          │             │
│            │   (dist/server.cjs)    │             │
│            │                        │             │
│            │  ┌──────────────────┐  │             │
│            │  │   Vite SPA       │  │             │
│            │  │   (/, /assets)    │  │             │
│            │  └──────────────────┘  │             │
│            │                        │             │
│            │  API Routes:           │             │
│            │  • /api/v1/*   (ext.) │             │
│            │  • /api/campaigns     │             │
│            │  • /api/subscribers   │             │
│            │  • /api/compose/send  │             │
│            │  • /api/tracking/*    │             │
│            │                        │             │
│            └───────────┬────────────┘             │
│                        │                           │
│            ┌───────────▼────────────┐             │
│            │   PostgreSQL / Prisma │             │
│            └───────────────────────┘             │
└────────────────────────────────────────────────────┘