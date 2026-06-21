# Documentation.md - Technical API Reference & Implementation Guide

This document provides deep technical documentation of the IGI SMTP backend, mapping each API endpoint to its exact implementation location, internal logic flow, and how components interact.

## Table of Contents

1. [API Architecture](#api-architecture)
2. [Core Utilities & Helpers](#core-utilities--helpers)
3. [Database Layer](#database-layer)
4. [API Endpoints by Location](#api-endpoints-by-location)
5. [Business Logic Flows](#business-logic-flows)
6. [Email Delivery Engine](#email-delivery-engine)
7. [Tracking System](#tracking-system)
8. [Caching Implementation](#caching-implementation)

---

## API Architecture

### Server Structure

**Main File:** `server.ts` (2407 lines)
- Express.js application
- All routes defined in a single file
- TypeScript with TSX runtime

**Entry Point:** `startServer()` function (line 598)
- Initializes Express app
- Mounts middleware
- Registers all routes
- Starts campaign scheduler

**Port:** 3000 (configurable via `PORT` env var)

**Middleware:**
```typescript
app.use(express.json({ limit: '50mb' }));  // Line 602
app.use(express.urlencoded({ limit: '50mb', extended: true }));  // Line 603
```

---

## Core Utilities & Helpers

### Caching System (Lines 13-42)

**Location:** `server.ts:13-42`

**Purpose:** In-memory caching to reduce database queries

**Functions:**
- `getCached<T>(key: string)` - Line 17: Retrieves cached data
- `setCache(key: string, data: any, ttl?: number)` - Line 24: Stores data with TTL
- `invalidateCache(pattern?: string)` - Line 28: Clears cache by pattern
- `fetchCached<T>(key: string, fetcher: () => Promise<T>, ttl?: number)` - Line 36: Fetch-or-cache pattern

**Cache Keys Used:**
- `subscribers:all` - All subscribers list
- `campaigns:all` - All campaigns list
- `templates:all` - All templates list
- `subscribers:export` - Full subscriber export data

**TTL:** 30 seconds (30000ms)

---

### Email Normalization (Lines 44-62)

**Location:** `server.ts:44-62`

**Functions:**
- `normalizeEmail(email: unknown): string` - Line 44: Converts to lowercase, trims whitespace
- `normalizeStatus(status: unknown): SubscriberStatus` - Line 48: Normalizes status strings to Active/Dormant/Unsubscribed
- `getInitials(name: string): string` - Line 55: Extracts initials from full name

---

### JSON Field Utilities (Lines 64-76)

**Location:** `server.ts:64-76`

**Purpose:** Handle JSON data stored as text in SQLite

**Functions:**
- `parseJsonField<T>(value: any, fallback: T): T` - Line 65: Safely parses JSON strings
- `stringifyJsonField(value: any): string` - Line 73: Converts objects to JSON strings

**Used For:** `emailElements`, `targetLists`, `elements`, `allowedModules`

---

### Subscriber Sanitization (Lines 78-112)

**Location:** `server.ts:78-112`

**Functions:**
- `sanitizeSubscriberPayload(input: any)` - Line 78: Validates and normalizes subscriber data
  - Accepts multiple field name variations (email/Email/routeEmail)
  - Defaults: roster='General', plan='Free', status='Active'
  - Generates initials and dateAdded

- `getSubscriberUpdatePayload(payload)` - Line 100: Prepares data for database update

- `upsertSubscriberRecord(input, overwriteExisting)` - Line 114: Upsert logic for bulk import
  - Uses Prisma `findFirst` to check existence
  - Updates existing or creates new
  - Handles unique constraint violations (P2002)

---

### Campaign Event Logger (Lines 183-217)

**Location:** `server.ts:183-217`

**Function:** `recordCampaignEvent(campaignId, email, name, eventType, url?)`

**Purpose:** Records tracking events to database

**Event Types:**
- `delivered` - Email successfully sent
- `open` - Email opened by recipient
- `click` - Link clicked in email
- `unsubscribe` - Recipient unsubscribed

**Side Effects:**
- Creates `CampaignEvent` record
- Updates subscriber status to 'Unsubscribed' if eventType is 'unsubscribe'

---

### Campaign Statistics Updaters (Lines 315-343)

**Location:** `server.ts:315-343`

**Functions:**
- `updateCampaignStats(campaignId, sent, total)` - Line 316: Updates recipient count
- `updateCampaignStatus(campaignId, status, recipients, openRate)` - Line 331: Updates final campaign status

---

## Database Layer

### Connection Management

**File:** `src/db/database.ts`

**Functions:**
- `connectToDatabase()` - Establishes Prisma connection
- `isDatabaseConnected()` - Checks connection status
- `prisma` - Prisma client instance

**Connection String:** `DATABASE_URL` environment variable

**Default:** SQLite (`file:./prisma/dev.db`)

**Production:** PostgreSQL recommended

---

### Database Schema

**File:** `prisma/schema.prisma`

**Models:**
1. **User** - Admin accounts
2. **Subscriber** - Email recipients
3. **Campaign** - Email campaigns
4. **CampaignEvent** - Tracking events
5. **EmailTemplate** - Reusable templates

---

## API Endpoints by Location

### Health & Status

#### GET /api/db-status (Line 635)

**Location:** `server.ts:635-642`

**Purpose:** Check database connection status

**Implementation:**
```typescript
const connected = await isDatabaseConnected();
res.json({
  connected,
  mode: connected ? 'SQLite' : 'Disconnected',
  hasUri: !(!process.env.DATABASE_URL),
});
```

**Response Fields:**
- `connected` (boolean) - Database connection status
- `mode` (string) - Database type or 'Disconnected'
- `hasUri` (boolean) - Whether DATABASE_URL is set

---

### Authentication Endpoints

#### POST /api/auth/login (Line 1619)

**Location:** `server.ts:1619-1644`

**Purpose:** User authentication

**Implementation Details:**
- Queries `User` model by email and password
- Password compared directly (plaintext in dev)
- Returns user object without password field
- Parses `allowedModules` JSON field

**Response Includes:**
- User ID, email, name, role
- `mustChangePassword` flag
- `allowedModules` array

---

#### PUT /api/auth/first-login (Line 1647)

**Location:** `server.ts:1647-1677`

**Purpose:** Force password change on first login

**Implementation:**
- Finds user with `mustChangePassword: true`
- Updates password
- Sets `mustChangePassword` to false
- Validates password length (min 4 chars)

---

#### GET /api/auth/me (Line 1680)

**Location:** `server.ts:1680-1698`

**Purpose:** Session recovery after page refresh

**Query Param:** `email` (required)

**Implementation:**
- Selects specific fields (excludes password)
- Parses `allowedModules` JSON

---

#### PUT /api/auth/profile (Line 1701)

**Location:** `server.ts:1701-1730`

**Purpose:** Update user profile

**Updatable Fields:**
- `name` - Display name
- `avatarUrl` - Profile picture URL

**Implementation:**
- Validates email exists
- Partial update allowed
- Returns updated user object

---

#### PUT /api/auth/change-password (Line 1733)

**Location:** `server.ts:1733-1765`

**Purpose:** Change password with verification

**Implementation:**
- Verifies current password first
- Updates to new password
- Min length: 4 characters

---

#### POST /api/auth/register (Line 1767)

**Location:** `server.ts:1767-1788`

**Purpose:** Self-registration (creates admin role)

**Implementation:**
- Checks for duplicate email
- Creates user with `role: 'admin'`
- Returns user without password

---

#### POST /api/auth/users (Line 1791)

**Location:** `server.ts:1791+`

**Purpose:** Super-admin creates new users

**Implementation:**
- Creates admin user
- Sets `mustChangePassword: true`
- Assigns `allowedModules`

---

### Subscriber Endpoints

#### GET /api/subscribers (Line 661)

**Location:** `server.ts:661-681`

**Purpose:** Retrieve all subscribers

**Implementation:**
- Uses cache: `fetchCached('subscribers:all', ...)`
- Queries: `prisma.subscriber.findMany({ orderBy: { createdAt: 'desc' } })`
- Maps fields for frontend (rosterName, roster)

**Cache Invalidation:** On create/update/delete

---

#### POST /api/subscribers (Line 684)

**Location:** `server.ts:684-717`

**Purpose:** Create single subscriber

**Implementation:**
- Generates initials from name
- Sets `dateAdded` to formatted date
- Defaults: status='Active', plan='Free', roster='General'
- Converts email to lowercase
- Invalidates subscribers cache

---

#### POST /api/subscribers/bulk-import (Line 720)

**Location:** `server.ts:720-790`

**Purpose:** Bulk import with upsert logic

**Implementation:**
```typescript
for (const sub of subscribers) {
  // Validate email
  const email = sub.email.toLowerCase().trim();
  
  // Prisma upsert
  await prisma.subscriber.upsert({
    where: { email },
    update: { name, status, plan, roster, rosterName, initials },
    create: { email, name, status, plan, roster, rosterName, initials, dateAdded }
  });
}
```

**Response Includes:**
- `total` - Total records processed
- `created` - New records count
- `updated` - Updated records count
- `skipped` - Invalid records count
- `results` - Array with status per email

---

#### PUT /api/subscribers/:id (Line 793)

**Location:** `server.ts:793-821`

**Purpose:** Update subscriber

**Implementation:**
- Removes `id` and `_id` from update data
- Auto-generates initials if name changed
- Handles P2025 (not found) error

---

#### DELETE /api/subscribers/:id (Line 824)

**Location:** `server.ts:824-840`

**Purpose:** Delete single subscriber

**Implementation:**
- Direct `prisma.subscriber.delete()`
- Invalidates subscribers cache

---

#### POST /api/subscribers/bulk-delete (Line 1480)

**Location:** `server.ts:1480-1493`

**Purpose:** Delete multiple subscribers

**Request Body:** `{ ids: string[] }`

**Implementation:**
```typescript
const result = await prisma.subscriber.deleteMany({
  where: { id: { in: ids } }
});
```

---

#### PUT /api/subscribers/bulk-update (Line 1495)

**Location:** `server.ts:1495-1519`

**Purpose:** Bulk update subscribers

**Allowed Fields:** `status`, `plan`, `roster`, `rosterName`

**Implementation:**
- Sanitizes input (only allowed fields)
- Uses `updateMany` for batch operation

---

#### GET /api/subscribers/export (Line 1521)

**Location:** `server.ts:1521-1532`

**Purpose:** Export all subscribers as JSON

**Implementation:**
- Uses cache: `fetchCached('subscribers:export', ...)`
- Sets download headers
- Returns full subscriber array

---

### Campaign Endpoints

#### GET /api/campaigns (Line 1264)

**Location:** `server.ts:1264-1275`

**Purpose:** Retrieve all campaigns

**Implementation:**
- Uses cache: `fetchCached('campaigns:all', ...)`
- Parses JSON fields (emailElements, targetLists)
- Ordered by creation date (newest first)

---

#### POST /api/campaigns (Line 1277)

**Location:** `server.ts:1277-1313`

**Purpose:** Create new campaign

**Implementation:**
- Stringifies `emailElements` and `targetLists` arrays
- Sets `createdDate` to formatted date
- **Auto-trigger:** If status='SENDING', calls `triggerCampaignSend()`
- Invalidates campaigns cache

---

#### PUT /api/campaigns/:id (Line 1315)

**Location:** `server.ts:1315-1353`

**Purpose:** Update campaign

**Implementation:**
- Removes `id` from updates
- Stringifies JSON arrays if present
- **Auto-trigger:** If status changed to 'SENDING', starts delivery
- Invalidates campaigns cache

---

#### DELETE /api/campaigns/:id (Line 1355)

**Location:** `server.ts:1355-1369`

**Purpose:** Delete campaign

---

#### POST /api/campaigns/:id/send (Line 1371)

**Location:** `server.ts:1371-1389`

**Purpose:** Manual retry trigger

**Implementation:**
- Clears progress store: `delete campaignProgressStore[id]`
- Updates status to 'SENDING'
- Calls `triggerCampaignSend()`

---

#### POST /api/campaigns/test (Line 1392)

**Location:** `server.ts:1392-1419`

**Purpose:** Send test email

**Implementation:**
```typescript
if (microsoftSettings configured) {
  // Real Microsoft Graph API send
  const accessToken = await getMicrosoftAccessToken();
  await sendMicrosoftEmail(...);
} else {
  // Simulated mode
  console.log('[TEST] Simulated email...');
}
```

**Response Methods:**
- `simulated` - No credentials, mock send
- `microsoft_graph` - Real send successful
- `microsoft_graph_failed` - Real send failed

---

### Email Template Endpoints

#### GET /api/templates (Line 1535)

**Location:** `server.ts:1535-1546`

**Purpose:** List all templates

**Implementation:**
- Uses cache: `fetchCached('templates:all', ...)`
- Parses `elements` JSON field

---

#### POST /api/templates (Line 1548)

**Location:** `server.ts:1548-1561`

**Purpose:** Create template

**Implementation:**
- Stringifies `elements` array
- Invalidates templates cache

---

#### PUT /api/templates/:id (Line 1563)

**Location:** `server.ts:1563-1588`

**Purpose:** Update template

**Implementation:**
- Removes `id` from updates
- Stringifies `elements` if array
- Invalidates templates cache

---

#### DELETE /api/templates/:id (Line 1590)

**Location:** `server.ts:1590-1604`

**Purpose:** Delete template

**Implementation:**
- Invalidates templates cache

---

### Tracking Endpoints

#### GET /api/tracking/click (Line 924)

**Location:** `server.ts:924-941`

**Purpose:** Track link clicks

**Query Params:**
- `campaignId` - Campaign identifier
- `email` - Subscriber email
- `url` - Destination URL

**Implementation:**
```typescript
await recordCampaignEvent(campaignId, email, name, 'click', url);
return res.redirect(url || 'https://www.iginigeria.com');
```

**Flow:**
1. Look up subscriber name (optional)
2. Record click event
3. Redirect to destination URL

---

#### GET /api/tracking/unsubscribe (Line 944)

**Location:** `server.ts:944-971`

**Purpose:** Handle unsubscribe requests

**Query Params:**
- `campaignId` (optional) - Campaign ID
- `email` (required) - Subscriber email

**Implementation:**
1. Record unsubscribe event
2. Update subscriber status to 'Unsubscribed'
3. Return HTML confirmation page with resubscribe link

**HTML Page Includes:**
- IGI branding
- Confirmation message
- Resubscribe button

---

#### GET /api/tracking/resubscribe (Line 974)

**Location:** `server.ts:974-996`

**Purpose:** Reactivate unsubscribed user

**Query Params:**
- `email` (required) - Subscriber email

**Implementation:**
```typescript
await prisma.subscriber.updateMany({
  where: { email: email.trim() },
  data: { status: 'Active' }
});
```

**Returns:** HTML confirmation page

---

#### POST /api/webhooks (Line 999)

**Location:** `server.ts:999-1034`

**Purpose:** Receive external ESP webhooks

**Implementation:**
- Accepts array or single object
- Normalizes field names:
  - Email: `email`, `recipient`, `address`, `rcpt`
  - Event: `eventType`, `event`, `event`
  - Campaign: `campaignId`, `campaign_id`, `campaign`
- Maps events to types: delivered, open, click, unsubscribe
- Records each event via `recordCampaignEvent()`

---

### Analytics Endpoints

#### GET /api/analytics/engagement-trends (Line 1037)

**Location:** `server.ts:1037-1088`

**Purpose:** 7-day engagement metrics

**Implementation:**
- Queries all `CampaignEvent` records
- Groups by date (last 7 days)
- Counts: opens, clicks, delivered
- Returns array: `[{ date, opens, clicks, delivered }]`

**Graceful Degradation:** Returns empty trends if DB disconnected

---

#### GET /api/analytics/deliverability (Line 1090)

**Location:** `server.ts:1090-1125`

**Purpose:** 10-day deliverability rates

**Implementation:**
- For each of last 10 days:
  - Counts sent campaigns
  - Counts delivered events
  - Calculates percentage: `(delivered / sent) * 100`
- Returns: `[{ day: "Day 1", deliverability: 98 }]`

---

#### GET /api/analytics/performance (Line 1127)

**Location:** `server.ts:1127-1167`

**Purpose:** Overall platform metrics

**Metrics Calculated:**
- `sends` - Total recipients from SENT campaigns
- `delivered` - Total delivered events
- `opens` - Total open events
- `clicks` - Total click events
- `bounce` - Total unsubscribes
- `bounceRate` - (unsubscribes / deliveries) * 100
- `spam` - Unsubscribes with 'spam' in URL
- `spamRate` - (spam / deliveries) * 100
- `openRate` - (opens / sends) * 100
- `clickRate` - (clicks / sends) * 100

---

#### GET /api/analytics/system-health (Line 1169)

**Location:** `server.ts:1169-1213`

**Purpose:** Infrastructure status monitoring

**Implementation:**
```typescript
const eventsLast5Min = await prisma.campaignEvent.count({
  where: { timestamp: { gte: fiveMinAgo } }
});
const throughput = eventsLast5Min > 0 ? (eventsLast5Min / 300).toFixed(2) : 0;
```

**Returns:**
- `throughput` - Emails per second (last 5 min)
- `queueDepth` - Campaigns with SENDING/QUEUED status
- `totalEvents` - Total events processed
- `uptime` - Server uptime in seconds
- `nodes` - Hardcoded health metrics (IP reputation, SPF/DKIM, SMTP relay, queue)

---

#### GET /api/analytics/hourly-trends (Line 1215)

**Location:** `server.ts:1215-1261`

**Purpose:** 24-hour delivery patterns

**Implementation:**
- For each hour (last 24):
  - Count events by type (sent, opened, clicked)
  - Filter by timestamp range
- Returns: `[{ hour: "14:00", sent: 120, opened: 72, clicked: 36 }]`

---

#### GET /api/events (Line 1607)

**Location:** `server.ts:1607-1616`

**Purpose:** Raw event log

**Implementation:**
- Queries all `CampaignEvent` records
- Ordered by timestamp (newest first)
- Returns complete event array

---

### Microsoft Graph Integration

#### GET /api/microsoft-settings (Line 843)

**Location:** `server.ts:843-850`

**Purpose:** Get current Microsoft config

**Returns:**
- `tenantId`
- `clientId`
- `senderEmail`
- `clientSecretMasked` - Shows first 5 and last 3 chars only

---

#### POST /api/microsoft-settings (Line 852)

**Location:** `server.ts:852-863`

**Purpose:** Update Microsoft credentials

**Implementation:**
```typescript
if (tenantId) microsoftSettings.tenantId = tenantId;
if (clientId) microsoftSettings.clientId = clientId;
if (clientSecret) microsoftSettings.clientSecret = clientSecret;
// senderEmail only from env var
if (senderEmail && !process.env.MICROSOFT_SENDER_EMAIL) {
  microsoftSettings.senderEmail = senderEmail;
}
```

**Storage:** In-memory only (lost on restart)

---

#### POST /api/microsoft-settings/verify (Line 865)

**Location:** `server.ts:865-873`

**Purpose:** Test Microsoft Graph connection

**Implementation:**
```typescript
const token = await getMicrosoftAccessToken();
if (token) return res.json({ success: true, message: 'Handshake completed!' });
```

**What It Tests:**
1. Azure AD tenant connectivity
2. Client credentials authentication
3. Token generation

---

### Campaign Progress

#### GET /api/campaigns/:id/progress (Line 876)

**Location:** `server.ts:876-884`

**Purpose:** Real-time delivery progress

**Implementation:**
- Reads from `campaignProgressStore` (in-memory object)
- Returns current status, counts, and logs
- Default response if no progress found

**Data Structure:**
```typescript
{
  campaignId: string;
  status: 'SENDING' | 'SENT' | 'FAILED';
  total: number;
  sent: number;
  failed: number;
  logs: string[];
}
```

---

## Business Logic Flows

### Campaign Delivery Flow

**Trigger:** `triggerCampaignSend(campaignId, campaignData)` - Line 432

**Step-by-Step:**

1. **Initialization** (Lines 437-446)
   - Check if already sending
   - Initialize progress store
   - Add startup log

2. **Subscriber Query** (Lines 448-455)
   - Fetch all Active subscribers
   - Handle database errors

3. **List Filtering** (Lines 457-464)
   - Parse `targetLists` from campaign
   - Filter subscribers by roster match
   - Case-insensitive comparison

4. **Authentication** (Lines 476-487)
   - Attempt Microsoft Graph OAuth2
   - Get access token using client credentials
   - Fall back to simulated mode on failure

5. **Delivery Loop** (Lines 489-561)
   ```typescript
   for (const subscriber of activeSubs) {
     // Generate tracking URLs
     const trackingClickUrl = `${hostUrl}/api/tracking/click?campaignId=${campaignId}&email=${email}&url=${encodedUrl}`;
     const trackingUnsubUrl = `${hostUrl}/api/tracking/unsubscribe?campaignId=${campaignId}&email=${email}`;
     
     // Build personalized HTML
     const emailHtml = buildCampaignEmailHtml(...);
     
     // Send email
     if (useGraphAPI) {
       await sendMicrosoftEmail(...);
     } else {
       // Simulated mode
       await new Promise(resolve => setTimeout(resolve, 600));
     }
     
     // Record delivery event
     await recordCampaignEvent(campaignId, email, name, 'delivered');
     
     // Simulate engagement (simulated mode only)
     if (simulated) {
       await simulateOpenAndClicks();
     }
     
     // Update stats
     await updateCampaignStats(campaignId, progress.sent, progress.total);
   }
   ```

6. **Completion** (Lines 563-568)
   - Set status to 'SENT'
   - Add completion log
   - Randomize open rate (55-85%)
   - Update campaign status in DB

---

### Scheduled Campaign Scheduler

**Function:** `startCampaignScheduler()` - Line 570

**Implementation:**
```typescript
setInterval(async () => {
  const queuedCampaigns = await prisma.campaign.findMany({
    where: { status: 'QUEUED' }
  });
  
  for (const campaign of queuedCampaigns) {
    const scheduledTime = new Date(campaign.scheduledAt.replace(' (UTC)', '') + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - scheduledTime.getTime();
    
    if (diffMs >= -60000) {  // Within 1 minute of scheduled time
      triggerCampaignSend(campaign.id, campaign);
    }
  }
}, 30000);  // Check every 30 seconds
```

**Schedule Format:** `"Jan 20, 2024, 10:00 AM (UTC)"`

---

## Email Delivery Engine

### Microsoft Graph Authentication

**Function:** `getMicrosoftAccessToken()` - Line 243

**Endpoint:**
```
POST https://login.microsoftonline.com/{tenantId}/oauth2/v2.0/token
```

**Parameters:**
- `grant_type`: `client_credentials`
- `client_id`: Azure app client ID
- `client_secret`: Azure app secret
- `scope`: `https://graph.microsoft.com/.default`

**Returns:** Access token (bearer token)

**Error Handling:** Throws error with HTTP status and response text

---

### Email Sending

**Function:** `sendMicrosoftEmail()` - Line 271

**Endpoint:**
```
POST https://graph.microsoft.com/v1.0/users/{senderEmail}/sendMail
```

**Request Body:**
```typescript
{
  message: {
    subject: string;
    body: { contentType: 'HTML', content: string };
    toRecipients: [{ emailAddress: { address: string, name: string } }]
  },
  saveToSentItems: true
}
}
```

**Headers:**
```
Authorization: Bearer {accessToken}
Content-Type: application/json
```

**Implementation Details:**
- Uses `encodeURIComponent` for sender email in URL
- Sets `saveToSentItems: true` for sent mail visibility
- Throws detailed error on failure

---

### Email Template Renderer

**Function:** `renderElementToHtml()` - Line 346

**Supported Element Types:**
1. **text** (Line 353)
   - Properties: `text`, `fontSize`, `color`, `paddingY`, `paddingX`
   - Renders: `<div>` with inline styles
   - Escapes HTML entities

2. **button** (Line 357)
   - Properties: `text`, `url`, `bg`, `color`, `cornerRadius`
   - Wraps URL with tracking: `trackingClickUrl + encodeURIComponent(url)`
   - Renders: `<a>` styled as button

3. **image** (Line 366)
   - Properties: `imageUrl`, `height`, `width`
   - Renders: `<img>` with lazy loading

4. **spacer** (Line 374)
   - Properties: `height`
   - Renders: Empty `<div>` with fixed height

5. **divider** (Line 376)
   - Properties: `color`
   - Renders: `<hr>` with custom color

6. **html** (Line 378)
   - Properties: `htmlScript`
   - Renders: Raw HTML in `<div>`

**Personalization:**
- `{{name}}` replaced via template literal at build time

---

### Full Email Builder

**Function:** `buildCampaignEmailHtml()` - Line 385

**Structure:**
1. **Fallback Template** (Lines 394-407)
   - Used when no elements provided
   - Includes logo, subject, sender name, unsubscribe link

2. **Custom Template** (Lines 410-429)
   - Renders each element via `renderElementToHtml()`
   - Wraps in branded container (blue header: #000066)
   - Includes footer with:
     - Platform branding
     - Unsubscribe link
     - Delivery method notice

**Tracking URLs Injected:**
```typescript
const trackingClickUrl = `${hostUrl}/api/tracking/click?campaignId=${campaignId}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(destinationUrl)}`;
const trackingUnsubUrl = `${hostUrl}/api/tracking/unsubscribe?campaignId=${campaignId}&email=${encodeURIComponent(email)}`;
```

**Default Destination:** `https://www.iginigeria.com`

---

## Tracking System

### Event Recording

**Function:** `recordCampaignEvent()` - Line 183

**Database Write:**
```typescript
await prisma.campaignEvent.create({
  data: {
    campaignId,
    email,
    name,
    eventType,
    url,
    timestamp: new Date()
  }
});
```

**Side Effects:**
- On `unsubscribe`: Updates subscriber status to 'Unsubscribed'

---

### Simulated Engagement (Simulated Mode Only)

**Location:** `server.ts:538-556`

**Probability Model:**
- Open chance: 78%
- Click chance (if opened): 45%
- Unsubscribe chance (if opened, not clicked): 6%

**Delays:**
- Open: 2000-10000ms after delivery
- Click: 3000-11000ms after open
- Unsubscribe: 5000-15000ms after open

**Implementation:**
```typescript
const randomOpenDelay = 2000 + Math.random() * 8000;
const willOpen = Math.random() < 0.78;
const willClick = willOpen && Math.random() < 0.45;
const willUnsub = willOpen && !willClick && Math.random() < 0.06;
```

---

## Caching Implementation

### Cache Helper Functions

**Location:** `server.ts:13-42`

**Usage Pattern:**
```typescript
const data = await fetchCached('key:name', async () => {
  return await prisma.model.findMany();
}, ttl);
```

**Invalidation Points:**
- **Subscribers:** After create (Line 707), update (Line 813), delete (Line 832), bulk import (Line 777), bulk update (Line 1514)
- **Campaigns:** After create (Line 1308), update (Line 1345), delete (Line 1361)
- **Templates:** After create (Line 1556), update (Line 1580), delete (Line 1596)

**Cache Structure:**
```typescript
Map<string, { data: any; expiry: number }>
```

**Expiry Check:** `Date.now() < entry.expiry`

---

## Configuration Variables

**Microsoft Settings Object** (Line 224)
```typescript
let microsoftSettings = {
  tenantId: process.env.MICROSOFT_TENANT_ID || "default...",
  clientId: process.env.MICROSOFT_CLIENT_ID || "default...",
  clientSecret: process.env.MICROSOFT_CLIENT_SECRET || "default...",
  senderEmail: DEFAULT_SENDER_EMAIL  // From MICROSOFT_SENDER_EMAIL env
};
```

**Campaign Progress Store** (Line 240)
```typescript
const campaignProgressStore: Record<string, CampaignProgress> = {};
```

**In-Memory Only:** Not persisted, lost on restart

---

## Default Values & Seeds

**Default Admin User** (Lines 611-626)
```typescript
{
  email: 'admin@igi-smtp.io',
  password: 'admin123',
  name: 'Admin',
  role: 'super-admin',
  mustChangePassword: false,
  allowedModules: ['dashboard', 'campaigns', 'subscribers', 'templates', 'logs', 'users']
}
```

**Created Only If:** User count = 0

---

## Error Handling Patterns

### Standard Response Format

**Success:**
```json
{ "success": true, "data": ... }
```

**Error:**
```json
{ "error": "Error message" }
```

### Status Codes Used

- `200` - Success (GET, PUT, DELETE)
- `201` - Created (POST)
- `400` - Validation error
- `401` - Unauthorized
- `404` - Not found (P2025 Prisma error)
- `409` - Conflict (duplicate)
- `500` - Internal error
- `503` - Database disconnected

### Database Disconnection Handling

**Pattern:**
```typescript
const dbConnected = await isDatabaseConnected();
if (!dbConnected) {
  return res.status(503).json({ error: 'Database not connected' });
}
```

**Graceful Degradation:**
- Analytics endpoints return empty/zero data instead of 503
- Allows UI to load without crashing

---

## Key Implementation Notes

### Password Storage
- **Current:** Plaintext (development)
- **Production:** Should implement bcrypt hashing

### Session Management
- **Current:** Client-side storage
- **No server-side sessions or JWT**

### Rate Limiting
- **Current:** None
- **Production:** Add Nginx/WAF rules

### Email Queue
- **Current:** In-memory array
- **Limitation:** Lost on restart, single-server only
- **Production:** Redis/Bull queue recommended

### Microsoft Graph Fallback
- **Simulated Mode:** Activates when credentials missing or auth fails
- **Success Rate:** 95% (randomized)
- **No Real Emails:** Sent in this mode

---

## Frontend Integration Points

### Primary API Consumer

**File:** `src/App.tsx` - Main application logic

**Key API Calls:**
- Login: `POST /api/auth/login`
- Subscribers: `GET/POST/PUT/DELETE /api/subscribers`
- Campaigns: `GET/POST/PUT/DELETE /api/campaigns`
- Templates: `GET/POST/PUT/DELETE /api/templates`
- Analytics: `GET /api/analytics/*`
- Tracking: Auto-loaded in email HTML
- Microsoft Settings: `GET/POST /api/microsoft-settings`

---

## Testing Endpoints

### Health Check
```bash
curl http://localhost:3000/api/db-status
```

### Create Test Subscriber
```bash
curl -X POST http://localhost:3000/api/subscribers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}'
```

### Send Test Email
```bash
curl -X POST http://localhost:3000/api/campaigns/test \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","subject":"Test"}'
```

### Verify Microsoft Graph
```bash
curl -X POST http://localhost:3000/api/microsoft-settings/verify
```

---

## Dependencies & External Services

### Microsoft Graph API
- **URL:** `https://graph.microsoft.com/v1.0`
- **Auth:** OAuth2 Client Credentials
- **Scope:** `https://graph.microsoft.com/.default`
- **Permission:** `SMTP.Send`

### Required Azure AD App Registration
1. Create app registration
2. Add API permission: `SMTP.Send` (Application permission)
3. Grant admin consent
4. Create client secret
5. Note tenant ID, client ID, client secret

---

## File Reference Summary

**Backend:**
- `server.ts` - All API routes (2407 lines)
- `src/db/database.ts` - Database connection
- `prisma/schema.prisma` - Database schema

**Frontend:**
- `src/App.tsx` - Main app component
- `src/types.ts` - TypeScript definitions
- `src/api/` - API call functions
- `src/components/` - UI components

**Configuration:**
- `.env` - Environment variables
- `package.json` - Dependencies and scripts
- `tsconfig.json` - TypeScript config

---

*Technical Documentation Version: 1.0*
*Platform: IGI SMTP*
*Stack: Node.js, Express, TypeScript, React, Prisma*