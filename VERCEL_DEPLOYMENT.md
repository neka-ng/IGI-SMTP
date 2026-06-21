# IGI SMTP – Vercel + Neon Deployment Guide

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                     Vercel (Serverless)                   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  Express App (dist/server.cjs)                    │  │
│  │  ┌──────────────────┐  ┌───────────────────┐      │  │
│  │  │  React SPA       │  │  API Routes       │      │  │
│  │  │  (/, /assets/*)  │  │  /api/*           │      │  │
│  │  └──────────────────┘  │  /api/v1/*        │      │  │
│  │                        │  /api/tracking/*  │      │  │
│  │                        └───────────────────┘      │  │
│  └────────────────────────┬─────────────────────────┘  │
│                           │                             │
│                    ┌──────▼──────┐                      │
│                    │  Neon (DB)  │                      │
│                    │  PostgreSQL │                      │
│                    └─────────────┘                      │
│                                                          │
│  External: Azure Entra ID (Microsoft Graph API)          │
│  → Real email sending via OAuth 2.0 Client Credentials   │
└──────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **GitHub account** (connected to Vercel)
2. **Neon account** (or any PostgreSQL provider)
3. **Azure Entra ID app registration** (for real email sending via Microsoft Graph)

---

## Step 1: Create Neon PostgreSQL Database

1. Go to [neon.tech](https://neon.tech) and sign up
2. Create a new project
3. Copy the **connection string** (looks like: `postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require`)
4. Make note of it for Vercel environment variables

## Step 2: Push the Prisma Schema to Neon

From your local machine (one-time setup):
```bash
# Set DATABASE_URL to your Neon connection string
set DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require

# Push the schema
npx prisma db push
```

This creates all tables in Neon and seeds the default admin user (`admin@igi-smtp.io` / `admin123`).

## Step 3: Deploy to Vercel

### Option A: Deploy via Git (Recommended)

1. Push your code to a GitHub repository:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

2. Go to [vercel.com](https://vercel.com) and click **Add New → Project**
3. Import your GitHub repository
4. Configure the project:

| Setting | Value |
|---------|-------|
| Framework Preset | **Other** |
| Build Command | `npm run vercel-build` |
| Output Directory | `dist` |
| Install Command | `npm install` |

5. Add the following **Environment Variables**:

| Variable | Value | Notes |
|----------|-------|-------|
| `DATABASE_URL` | `postgresql://...` | Your Neon connection string |
| `NODE_ENV` | `production` | Production mode |
| `APP_URL` | `https://your-app.vercel.app` | Your Vercel deployment URL |
| `MICROSOFT_TENANT_ID` | `your_tenant_id` | From Azure Entra ID |
| `MICROSOFT_CLIENT_ID` | `your_client_id` | From Azure Entra ID |
| `MICROSOFT_CLIENT_SECRET` | `your_client_secret` | From Azure Entra ID |
| `MICROSOFT_SENDER_EMAIL` | `hello@yourdomain.com` | Verified sender in Microsoft 365 |
| `PRISMA_GENERATE_DATAPROXY` | (leave empty) | Not needed |

6. Click **Deploy**

### Option B: Deploy via Vercel CLI

```bash
npm i -g vercel
vercel login
vercel --prod
```

The CLI will detect the `vercel.json` and prompt for environment variables.

## Step 4: Post-Deployment Verification

```bash
# Health check
curl https://your-app.vercel.app/api/v1/health
# Expected: {"status":"ok","service":"IGI SMTP API","version":"1.0.0"}

# Database status
curl https://your-app.vercel.app/api/db-status
# Expected: {"connected":true,"mode":"SQLite","hasUri":true}
# (mode shows "SQLite" string from the API, but actually uses PostgreSQL via Neon)

# Frontend
open https://your-app.vercel.app
```

## Important Caveats

| Issue | Explanation | Workaround |
|-------|-------------|------------|
| **Campaign scheduler** (`setInterval`) | ❌ Won't work on Vercel serverless (cold starts + function timeout) | Use **Vercel Cron Jobs** to trigger scheduled sends, or keep campaigns small enough to send synchronously in a single request |
| **Bulk campaign sending** (1000+ emails) | ⚠️ Vercel Hobby plan has 10s timeout, Pro has 60s | For large campaigns, use a small VPS or background job worker |
| **In-memory rate limiter** | ⚠️ Resets on every cold start | Safe for most use cases; consider switching to DB-backed rate limiting for production |
| **File upload** (data: URLs) | ⚠️ Stored as base64 in DB, not ideal for large images | Use external storage (S3, Cloudinary) for production |

## Recommended: Vercel Cron Jobs for Scheduled Campaigns

If you need reliable scheduled campaign delivery, add a `vercel.json` cron configuration:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-queued-campaigns",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

Then add an API route `/api/cron/check-queued-campaigns` that checks for QUEUED campaigns and triggers them. This replaces the `setInterval` scheduler that doesn't work in serverless.

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| `DATABASE_URL` errors | Neon URL not set or invalid | Check Vercel env vars |
| `PrismaClientInitializationError` | Prisma client not generated | Ensure `postinstall` or `vercel-build` runs `prisma generate` |
| Login fails | No user seeded in Neon | Run `npx prisma db push` locally with Neon URL to seed admin |
| 503 Database not connected | Neon connection rejected | Verify SSL mode in URL (`?sslmode=require`) |
| Emails not sending | Microsoft Graph credentials missing/invalid | Add env vars, verify with `/api/microsoft-settings/verify` |
| Static assets 404 | Wrong path in vercel.json | Check `assets` route matches build output |
| Build fails with "Module not found" | Missing dependency | Run `npm install` locally then redeploy |

## Local Development with Neon (Optional)

To test against Neon locally instead of SQLite:

```bash
# Set DATABASE_URL to your Neon string
set DATABASE_URL=postgresql://user:password@ep-xxxx.neon.tech/neondb?sslmode=require

# Push schema
npx prisma db push

# Run dev server
npm run dev
```

This way you can verify everything works with PostgreSQL before deploying.