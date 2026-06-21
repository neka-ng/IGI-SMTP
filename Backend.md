# Backend Documentation - IGI SMTP API

Complete API reference for the IGI SMTP platform backend. This document covers all endpoints, request/response formats, authentication, and business logic.

## Base URL

```
http://localhost:3000/api
```

All API endpoints are prefixed with `/api`.

## Authentication

The platform uses simple email/password authentication via `/api/auth/login`. Upon successful login, the server returns user details including role and permissions.

### User Roles

- **super-admin**: Full system access, can manage users
- **admin**: Campaign and subscriber management access

### Password Storage

Current implementation stores passwords in plaintext (development mode). Production deployments should implement bcrypt hashing.

---

## Authentication Endpoints

### POST /api/auth/login

Authenticate user and retrieve account details.

**Request Body:**
```json
{
  "email": "admin@igi-smtp.io",
  "password": "admin123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@igi-smtp.io",
    "name": "Admin",
    "role": "super-admin",
    "mustChangePassword": false,
    "allowedModules": ["dashboard", "campaigns", "subscribers"],
    "createdAt": "2024-01-15T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing email or password
- `401` - Invalid credentials
- `503` - Database not connected

---

### PUT /api/auth/first-login

Complete forced password change on first login.

**Request Body:**
```json
{
  "email": "admin@igi-smtp.io",
  "newPassword": "newSecurePass123"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

**Error Responses:**
- `400` - Invalid input or password too short (min 4 chars)
- `401` - User not found or password already changed
- `404` - User not found
- `503` - Database not connected

---

### GET /api/auth/me

Retrieve current user profile by email (for session recovery after page refresh).

**Query Parameters:**
- `email` (required) - User email address

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@igi-smtp.io",
    "name": "Admin",
    "avatarUrl": null,
    "role": "super-admin",
    "mustChangePassword": false,
    "allowedModules": ["dashboard", "campaigns"],
    "createdById": null,
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
}
```

---

### PUT /api/auth/profile

Update user profile information.

**Request Body:**
```json
{
  "email": "admin@igi-smtp.io",
  "name": "Admin User",
  "avatarUrl": "https://example.com/avatar.jpg"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "admin@igi-smtp.io",
    "name": "Admin User",
    "avatarUrl": "https://example.com/avatar.jpg",
    "role": "super-admin",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T14:30:00.000Z"
  }
}
```

---

### PUT /api/auth/change-password

Change user password (requires current password verification).

**Request Body:**
```json
{
  "email": "admin@igi-smtp.io",
  "currentPassword": "oldPass123",
  "newPassword": "newSecurePass456"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Password changed successfully."
}
```

**Error Responses:**
- `400` - Missing fields or password too short
- `401` - Current password is incorrect
- `404` - User not found
- `503` - Database not connected

---

### POST /api/auth/register

Register new user account (creates admin role).

**Request Body:**
```json
{
  "email": "newuser@example.com",
  "password": "securePass789",
  "name": "New User"
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "newuser@example.com",
    "name": "New User",
    "role": "admin",
    "mustChangePassword": false,
    "allowedModules": [],
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

**Error Responses:**
- `400` - Missing email/password or password too short
- `409` - Account already exists
- `503` - Database not connected

---

### POST /api/auth/users

Create new user (super-admin only).

**Request Body:**
```json
{
  "email": "staff@example.com",
  "name": "Staff Member",
  "password": "tempPass123",
  "allowedModules": ["campaigns", "subscribers"]
}
```

**Success Response (201):**
```json
{
  "success": true,
  "user": {
    "id": "uuid",
    "email": "staff@example.com",
    "name": "Staff Member",
    "role": "admin",
    "mustChangePassword": true,
    "allowedModules": ["campaigns", "subscribers"],
    "createdAt": "2024-01-20T10:00:00.000Z"
  }
}
```

---

## Subscriber Endpoints

### GET /api/subscribers

Retrieve all subscribers.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "John Doe",
    "email": "john@example.com",
    "status": "Active",
    "plan": "Premium",
    "roster": "Newsletter",
    "rosterName": "Newsletter",
    "initials": "JD",
    "dateAdded": "Jan 15, 2024",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

**Features:**
- Results cached for 30 seconds
- Ordered by creation date (newest first)
- Returns 503 if database disconnected

---

### POST /api/subscribers

Create a single subscriber.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "status": "Active",
  "plan": "Premium",
  "roster": "Newsletter",
  "rosterName": "Newsletter"
}
```

**Success Response (201):**
```json
{
  "id": "uuid",
  "name": "John Doe",
  "email": "john@example.com",
  "status": "Active",
  "plan": "Premium",
  "roster": "Newsletter",
  "rosterName": "Newsletter",
  "initials": "JD",
  "dateAdded": "Jan 15, 2024",
  "createdAt": "2024-01-15T10:00:00.000Z"
}
```

**Validation:**
- Email must contain @ and be lowercase
- Name defaults to email prefix if not provided
- Roster defaults to "General"
- Status defaults to "Active"
- Plan defaults to "Free"

---

### POST /api/subscribers/bulk-import

Import multiple subscribers with upsert logic.

**Request Body:**
```json
{
  "subscribers": [
    {
      "name": "John Doe",
      "email": "john@example.com",
      "status": "Active",
      "plan": "Premium",
      "rosterName": "Newsletter"
    },
    {
      "email": "jane@example.com",
      "rosterName": "Notifications"
    }
  ]
}
```

**Success Response (201):**
```json
{
  "total": 2,
  "created": 1,
  "updated": 1,
  "skipped": 0,
  "results": [
    {
      "email": "john@example.com",
      "status": "created",
      "id": "uuid"
    },
    {
      "email": "jane@example.com",
      "status": "updated",
      "id": "uuid"
    }
  ]
}
```

**Import Logic:**
- Validates email format (must contain @)
- Skips invalid emails
- Upserts based on email (unique constraint)
- New records get current date as `dateAdded`
- Updates existing records without changing `dateAdded`

---

### PUT /api/subscribers/:id

Update a subscriber.

**Request Body (any combination):**
```json
{
  "name": "Updated Name",
  "email": "updated@example.com",
  "status": "Dormant",
  "plan": "Free"
}
```

**Success Response (200):**
```json
{
  "id": "uuid",
  "name": "Updated Name",
  "email": "updated@example.com",
  "status": "Dormant",
  "plan": "Free",
  "initials": "UN",
  "dateAdded": "Jan 15, 2024"
}
```

---

### DELETE /api/subscribers/:id

Delete a subscriber.

**Success Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/subscribers/bulk-delete

Delete multiple subscribers by ID.

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2", "uuid3"]
}
```

**Success Response (200):**
```json
{
  "success": true,
  "deleted": 3
}
```

---

### PUT /api/subscribers/bulk-update

Update multiple subscribers with allowed fields.

**Allowed Fields:** `status`, `plan`, `roster`, `rosterName`

**Request Body:**
```json
{
  "ids": ["uuid1", "uuid2"],
  "updates": {
    "status": "Unsubscribed",
    "rosterName": "Archived"
  }
}
```

**Success Response (200):**
```json
{
  "success": true,
  "modified": 2
}
```

---

### GET /api/subscribers/export

Export all subscribers as JSON.

**Success Response (200):**
- Content-Type: application/json
- Content-Disposition: attachment; filename=subscribers-export.json
- Body: Full subscriber array

---

## Campaign Endpoints

### GET /api/campaigns

Retrieve all campaigns.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "January Newsletter",
    "status": "SENT",
    "recipients": 150,
    "openRate": 65,
    "subjectLine": "Monthly Updates",
    "senderName": "IGI Team",
    "replyTo": null,
    "templateId": null,
    "emailElements": [],
    "targetLists": ["Newsletter", "Premium"],
    "scheduledAt": "Jan 20, 2024, 10:00 AM (UTC)",
    "createdDate": "Jan 15, 2024",
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-20T10:00:00.000Z"
  }
]
```

**Features:**
- Results cached for 30 seconds
- Ordered by creation date (newest first)

---

### POST /api/campaigns

Create a new campaign.

**Request Body:**
```json
{
  "name": "January Newsletter",
  "status": "DRAFT",
  "subjectLine": "Monthly Updates",
  "senderName": "IGI Team",
  "replyTo": "reply@example.com",
  "templateId": null,
  "emailElements": [
    {
      "type": "text",
      "properties": {
        "text": "Hello {{name}}, this is our monthly newsletter.",
        "fontSize": "15px",
        "color": "#171c22"
      }
    },
    {
      "type": "button",
      "properties": {
        "text": "Read More",
        "url": "https://igi-smtp.io",
        "bg": "#4f46e5"
      }
    }
  ],
  "targetLists": ["Newsletter", "Premium"],
  "scheduledAt": "Jan 20, 2024, 10:00 AM (UTC)"
}
```

**Success Response (201):**
Returns full campaign object with parsed JSON fields.

**Auto-Trigger:**
- If `status` is "SENDING", campaign delivery starts immediately

**Status Values:**
- `DRAFT` - Saved but not sending
- `QUEUED` - Scheduled for future delivery
- `SENDING` - Currently being sent
- `SENT` - Delivery completed

---

### PUT /api/campaigns/:id

Update a campaign.

**Request Body:**
```json
{
  "name": "Updated Campaign Name",
  "status": "QUEUED",
  "emailElements": [...],
  "targetLists": ["Newsletter"]
}
```

**Success Response (200):**
Returns updated campaign object.

**Auto-Trigger:**
- If status changed to "SENDING", delivery starts

---

### DELETE /api/campaigns/:id

Delete a campaign.

**Success Response (200):**
```json
{
  "success": true
}
```

---

### POST /api/campaigns/:id/send

Manually trigger campaign delivery.

**Request Body:** (empty)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Campaign retry initiated."
}
```

**Behavior:**
- Resets campaign progress
- Changes status to "SENDING"
- Initiates delivery process

---

### POST /api/campaigns/test

Send test email to verify configuration.

**Request Body:**
```json
{
  "email": "test@example.com",
  "subject": "Test Subject",
  "html": "<p>Test content</p>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "method": "simulated",
  "message": "Test email simulated for test@example.com — configure Microsoft 365 credentials for real delivery"
}
```

**Delivery Methods:**
- `simulated` - No Microsoft Graph configured, simulates delivery (95% success)
- `microsoft_graph` - Sent via Microsoft Graph API
- `microsoft_graph_failed` - Graph API attempt failed (returns error details)

---

## Email Template Endpoints

### GET /api/templates

Retrieve all email templates.

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "name": "Welcome Email",
    "description": "New user welcome template",
    "thumbnailAlt": "Welcome Template",
    "thumbnailUrl": "https://example.com/thumb.jpg",
    "elements": [
      {
        "type": "text",
        "properties": { "text": "Welcome!" }
      }
    ],
    "createdAt": "2024-01-15T10:00:00.000Z",
    "updatedAt": "2024-01-15T10:00:00.000Z"
  }
]
```

---

### POST /api/templates

Create a new template.

**Request Body:**
```json
{
  "name": "Welcome Email",
  "description": "New user welcome template",
  "thumbnailAlt": "Welcome",
  "thumbnailUrl": "https://example.com/thumb.jpg",
  "elements": [
    {
      "type": "text",
      "properties": {
        "text": "Welcome to our platform!",
        "fontSize": "18px"
      }
    }
  ]
}
```

**Success Response (201):**
Returns full template object with parsed elements array.

---

### PUT /api/templates/:id

Update a template.

**Request Body:** (same as POST, excluding name/description optional)

**Success Response (200):**
Returns updated template object.

---

### DELETE /api/templates/:id

Delete a template.

**Success Response (200):**
```json
{
  "success": true
}
```

---

## Tracking Endpoints

### GET /api/tracking/click

Track link clicks in emails.

**Query Parameters:**
- `campaignId` (required) - Campaign identifier
- `email` (required) - Subscriber email
- `url` (required) - Destination URL to redirect to

**Response:**
- `302` Redirect to the provided URL
- Records click event in database

---

### GET /api/tracking/unsubscribe

Handle unsubscribe requests from emails.

**Query Parameters:**
- `campaignId` (optional) - Campaign identifier
- `email` (required) - Subscriber email

**Success Response (200):**
Returns HTML confirmation page:
```html
<!DOCTYPE html>
<html>
  <!-- Unsubscribe confirmation page with IGI branding -->
  <div class="card">
    <h1>Unsubscribe Confirmed</h1>
    <p>Hello <strong>Subscriber Name</strong>, your email has been removed.</p>
    <a href="/api/tracking/resubscribe?email=user@example.com">Resubscribe</a>
  </div>
</html>
```

**Side Effects:**
- Records unsubscribe event
- Updates subscriber status to "Unsubscribed"

---

### GET /api/tracking/resubscribe

Allow subscribers to re-activate their account.

**Query Parameters:**
- `email` (required) - Subscriber email

**Success Response (200):**
Returns HTML page:
```html
<!DOCTYPE html>
<html>
  <div class="card">
    <h1>✓ Re-activated</h1>
    <p>Your email <strong>user@example.com</strong> is now <strong>Active</strong>.</p>
  </div>
</html>
```

**Side Effects:**
- Sets subscriber status to "Active"

---

### POST /api/webhooks (or /api/webhooks/events)

Receive webhook events from external email providers.

**Request Body (supports array or single object):**
```json
[
  {
    "email": "user@example.com",
    "campaignId": "campaign-uuid",
    "eventType": "open",
    "url": null
  },
  {
    "email": "user2@example.com",
    "campaignId": "campaign-uuid",
    "eventType": "click",
    "url": "https://example.com/link"
  }
]
```

**Alternative Event Field Names Supported:**
- `eventType` / `event` / `event`
- `recipient` / `address` / `rcpt` (for email)
- `campaignId` / `campaign_id` / `campaign`

**Success Response (200):**
```json
{
  "success": true,
  "processed": 2
}
```

**Event Types (auto-normalized):**
- `delivered` (also: "send", "success")
- `open` (also: "opened")
- `click` (also: "clicked", "link")
- `unsubscribe` (also: "optout", "bounce", "dropped")

---

## Campaign Tracking & Analytics

### GET /api/campaigns/:id/tracking

Retrieve detailed tracking metrics for a campaign.

**Success Response (200):**
```json
{
  "campaignId": "campaign-uuid",
  "metrics": {
    "delivered": 150,
    "opens": 95,
    "clicks": 45,
    "unsubscribes": 3,
    "openRate": 63,
    "clickRate": 30
  },
  "lists": {
    "deliveredList": [
      {
        "name": "John Doe",
        "email": "john@example.com",
        "timestamp": "2024-01-20T10:05:00.000Z"
      }
    ],
    "openedList": [...],
    "clickedList": [
      {
        "name": "Jane Doe",
        "email": "jane@example.com",
        "timestamp": "2024-01-20T10:06:00.000Z",
        "url": "https://example.com"
      }
    ],
    "unsubscribedList": [...]
  },
  "eventsTimeline": [
    {
      "id": "uuid",
      "campaignId": "campaign-uuid",
      "email": "john@example.com",
      "name": "John Doe",
      "eventType": "delivered",
      "url": null,
      "timestamp": "2024-01-20T10:05:00.000Z"
    }
  ]
}
```

---

### GET /api/campaigns/:id/progress

Get real-time delivery progress for a sending campaign.

**Success Response (200):**
```json
{
  "campaignId": "campaign-uuid",
  "status": "SENDING",
  "total": 1000,
  "sent": 450,
  "failed": 12,
  "logs": [
    "[10:05:23] 🚀 Initiated live delivery stream for \"January Newsletter\"",
    "[10:05:24] 👥 Mapped 1000 active target recipients.",
    "[10:05:25] ✉️ Route analysis for John Doe <john@example.com>..."
  ]
}
```

**Status Values:**
- `SENDING` - Currently dispatching
- `SENT` - Completed
- `FAILED` - Error occurred
- `QUEUED` - Waiting for schedule

---

### GET /api/analytics/engagement-trends

Get 7-day engagement trends.

**Success Response (200):**
```json
[
  {
    "date": "Jan 15",
    "opens": 45,
    "clicks": 20,
    "delivered": 100
  },
  {
    "date": "Jan 16",
    "opens": 62,
    "clicks": 31,
    "delivered": 120
  }
]
```

---

### GET /api/analytics/deliverability

Get 10-day deliverability metrics.

**Success Response (200):**
```json
[
  {
    "day": "Day 1",
    "deliverability": 98
  },
  {
    "day": "Day 2",
    "deliverability": 97
  }
]
```

---

### GET /api/analytics/performance

Get overall platform performance metrics.

**Success Response (200):**
```json
{
  "sends": 5000,
  "delivered": 4850,
  "opens": 2800,
  "clicks": 1200,
  "bounce": 150,
  "bounceRate": 3.0,
  "spam": 5,
  "spamRate": 0.1,
  "openRate": 56.0,
  "clickRate": 24.0
}
```

---

### GET /api/analytics/system-health

Get system health and infrastructure status.

**Success Response (200):**
```json
{
  "throughput": 2.45,
  "queueDepth": 3,
  "totalEvents": 15420,
  "uptime": 86432,
  "dbConnected": true,
  "nodes": {
    "ipReputation": {
      "status": "healthy",
      "score": 96
    },
    "spfDkim": {
      "status": "verified",
      "lastCheck": "2024-01-20T10:00:00.000Z"
    },
    "smtpRelay": {
      "status": "operational",
      "latency": "32ms"
    },
    "queue": {
      "status": "normal",
      "depth": 3
    }
  }
}
```

---

### GET /api/analytics/hourly-trends

Get 24-hour hourly delivery patterns.

**Success Response (200):**
```json
[
  {
    "hour": "00:00",
    "sent": 120,
    "opened": 72,
    "clicked": 36
  },
  {
    "hour": "01:00",
    "sent": 80,
    "opened": 48,
    "clicked": 24
  }
]
```

---

### GET /api/events

Retrieve all campaign events (delivery log).

**Success Response (200):**
```json
[
  {
    "id": "uuid",
    "campaignId": "campaign-uuid",
    "email": "john@example.com",
    "name": "John Doe",
    "eventType": "delivered",
    "url": null,
    "timestamp": "2024-01-20T10:05:00.000Z"
  }
]
```

---

## Microsoft Graph API Integration

### GET /api/microsoft-settings

Get current Microsoft Graph configuration (with masked secret).

**Success Response (200):**
```json
{
  "tenantId": "326c2814-b19b-48a2-b62b-49a70b07eee2",
  "clientId": "6d6b74cb-210b-46eb-bb03-f509edb88797",
  "senderEmail": "admin@igi-smtp.io",
  "clientSecretMasked": "rrx8Q...vaTz"
}
```

---

### POST /api/microsoft-settings

Update Microsoft Graph credentials.

**Request Body:**
```json
{
  "tenantId": "your-tenant-id",
  "clientId": "your-client-id",
  "clientSecret": "your-client-secret",
  "senderEmail": "sender@yourdomain.com"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Microsoft SMTP configuration saved."
}
```

**Important Notes:**
- Credentials stored in server memory only
- Changes require server restart for full effect
- `senderEmail` can only be updated via env var `MICROSOFT_SENDER_EMAIL`
- Secret is masked in GET responses

---

### POST /api/microsoft-settings/verify

Test Microsoft Graph API connection.

**Request Body:** (empty)

**Success Response (200):**
```json
{
  "success": true,
  "message": "Handshake completed!"
}
```

**Error Response (400):**
```json
{
  "success": false,
  "error": "Auth failed with HTTP 401: ..."
}
```

---

## Database Status

### GET /api/db-status

Check database connection status.

**Success Response (200):**
```json
{
  "connected": true,
  "mode": "SQLite",
  "hasUri": true
}
```

**When Disconnected:**
```json
{
  "connected": false,
  "mode": "Disconnected",
  "hasUri": false
}
```

---

## Compose Endpoint

### POST /api/compose/send

Send custom email via Microsoft Graph API.

**Request Body:**
```json
{
  "subject": "Custom Message",
  "receivers": [
    {
      "email": "recipient@example.com",
      "name": "Recipient Name"
    }
  ],
  "htmlContent": "<h1>Hello!</h1><p>Custom email content.</p>"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "sentCount": 2,
  "failedCount": 0,
  "errors": [],
  "composeCampaignId": "COMPOSE-1705741200000"
}
```

**Partial Failure Response:**
```json
{
  "success": true,
  "sentCount": 1,
  "failedCount": 1,
  "errors": [
    {
      "email": "invalid@example",
      "message": "HTTP 400: ..."
    }
  ],
  "composeCampaignId": "COMPOSE-1705741200000"
}
```

**Side Effects:**
- Records delivery events for tracking
- Events grouped under unique compose campaign ID

---

## Business Logic

### Campaign Delivery Process

1. **Validation** - Checks database connection and subscriber list
2. **Filtering** - Applies target list/roster filters
3. **Authentication** - Fetches Microsoft Graph access token (OAuth2)
4. **Delivery Loop** - For each subscriber:
   - Generates personalized HTML with tracking links
   - Sends via Microsoft Graph API
   - Records delivery event
   - Updates campaign statistics
5. **Progress Tracking** - Real-time logs via `/api/campaigns/:id/progress`
6. **Scheduled Sends** - Runs every 30 seconds, checks for due campaigns

### Simulated Mode

If Microsoft Graph credentials are not configured:
- Uses mock delivery with 95% success rate
- Random delays between 600-800ms per email
- Simulates open/click events probabilistically:
  - 78% chance of open
  - 45% chance of click (if opened)
  - 6% chance of unsubscribe (if opened but not clicked)

### Email Template Rendering

HTML emails are generated from structured element arrays:

**Supported Element Types:**
- `text` - Rich text with styling
- `button` - Call-to-action buttons with URLs
- `image` - Embedded images with dimensions
- `spacer` - Vertical spacing
- `divider` - Horizontal rule
- `html` - Custom HTML snippets

**Personalization:**
- `{{name}}` - Subscriber's name
- Tracking URLs automatically injected for clicks and unsubscribes

---

## Caching Strategy

**In-Memory Cache:**
- TTL: 30 seconds
- Keys: `subscribers:all`, `campaigns:all`, `templates:all`, `subscribers:export`
- Automatic invalidation on create/update/delete operations

**Cache Helper Functions:**
- `getCached<T>(key)` - Retrieve from cache
- `setCache(key, data, ttl)` - Store in cache
- `invalidateCache(pattern?)` - Clear matching keys
- `fetchCached<T>(key, fetcher, ttl)` - Fetch with caching

---

## Error Handling

**Standard HTTP Status Codes:**
- `200` - Success
- `201` - Created
- `400` - Bad request (validation errors)
- `401` - Unauthorized
- `404` - Not found
- `409` - Conflict (duplicate)
- `500` - Internal server error
- `503` - Service unavailable (database disconnected)

**Error Response Format:**
```json
{
  "error": "Descriptive error message"
}
```

**Database Connection Failures:**
- Returns 503 for all data operations
- Analytics endpoints return empty/zero data instead of errors
- Allows UI to function in read-only mode

---

## Rate Limiting

Currently no built-in rate limiting. For production:
- Implement at reverse proxy level (Nginx)
- Recommended: 100 requests/minute per IP
- Email sending endpoints: limit to prevent abuse

---

## Webhook Integration

The platform accepts webhook events from external ESPs (Email Service Providers).

**Standard Webhook Payload:**
```json
{
  "event": "delivered",
  "email": "user@example.com",
  "campaign_id": "uuid",
  "timestamp": "2024-01-20T10:05:00.000Z"
}
```

**Accepted Event Formats:**
Multiple field name variations supported for compatibility:
- Email: `email`, `recipient`, `address`, `rcpt`
- Event: `eventType`, `event`, `event`
- Campaign: `campaignId`, `campaign_id`, `campaign`

---

## Database Models (Prisma Schema)

### User
```prisma
model User {
  id                String    @id @default(uuid())
  email             String    @unique
  password          String
  name              String?
  avatarUrl         String?
  role              String    @default("admin")
  mustChangePassword Boolean  @default(false)
  allowedModules    String    @default("[]")
  createdById       String?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

### Subscriber
```prisma
model Subscriber {
  id          String   @id @default(uuid())
  name        String
  email       String   @unique
  status      String   @default("Active")
  plan        String   @default("Free")
  roster      String   @default("General")
  rosterName  String   @default("General")
  initials    String
  dateAdded   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### Campaign
```prisma
model Campaign {
  id           String   @id @default(uuid())
  name         String
  status       String   @default("DRAFT")
  recipients   Int      @default(0)
  openRate     Int?
  subjectLine  String?
  senderName   String?
  replyTo      String?
  templateId   String?
  emailElements String @default("[]")
  targetLists  String  @default("[]")
  scheduledAt  String?
  createdDate  String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### CampaignEvent
```prisma
model CampaignEvent {
  id          String   @id @default(uuid())
  campaignId  String
  email       String
  name        String
  eventType   String
  url         String?
  timestamp   DateTime @default(now())
}
```

### EmailTemplate
```prisma
model EmailTemplate {
  id           String   @id @default(uuid())
  name         String
  description  String?
  thumbnailAlt String?
  thumbnailUrl String?
  elements     String   @default("[]")
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

---

## Development Tips

### Testing Microsoft Graph Locally

Without Azure credentials, the platform runs in **simulated mode**:
- Test campaigns show 95% success rate
- Open/click events generated randomly
- No actual emails sent

### Local Testing Endpoints

```bash
# Health check
curl http://localhost:3000/api/db-status

# Create test subscriber
curl -X POST http://localhost:3000/api/subscribers \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User","email":"test@example.com"}'

# Send test email
curl -X POST http://localhost:3000/api/campaigns/test \
  -H "Content-Type: application/json" \
  -d '{"email":"recipient@example.com","subject":"Test"}'
```

---

## Performance Considerations

- **Caching:** 30-second TTL reduces database load
- **Connection Pooling:** Prisma manages connection pooling
- **Batch Operations:** Bulk import/update reduces round trips
- **Async Operations:** Non-blocking email delivery
- **Indexing:** Database indexes on email (unique), created_at