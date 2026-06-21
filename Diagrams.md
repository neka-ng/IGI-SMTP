# Diagrams.md - Visual Flow Charts & Architecture

This document contains visual diagrams and flow charts for the IGI SMTP Platform. All diagrams use Mermaid syntax for easy rendering in GitHub, Markdown viewers, and documentation tools.

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Email Delivery Flow](#email-delivery-flow)
3. [Campaign Lifecycle](#campaign-lifecycle)
4. [API Authentication Flow](#api-authentication-flow)
5. [Database Schema (ERD)](#database-schema-erd)
6. [Tracking System Flow](#tracking-system-flow)
7. [Deployment Architecture](#deployment-architecture)
8. [Subscriber Import Flow](#subscriber-import-flow)

---

## System Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        A[React Frontend<br/>Vite + Tailwind CSS]
        B[Mobile Browser]
        C[Desktop Browser]
    end

    subgraph "Server Layer"
        D[Express.js Server<br/>Port 3000]
        E[API Routes<br/>/api/*]
        F[Business Logic<br/>Campaign Engine]
        G[Email Renderer<br/>HTML Builder]
    end

    subgraph "Data Layer"
        H[(PostgreSQL<br/>Production)]
        I[(SQLite<br/>Development)]
        J[Prisma ORM]
    end

    subgraph "External Services"
        K[Microsoft Graph API<br/>OAuth2 Client Credentials]
        L[Nginx Reverse Proxy<br/>Port 443]
        M[PM2 Process Manager]
    end

    A --> L
    B --> L
    C --> L
    L --> D
    D --> E
    E --> F
    F --> G
    G --> K
    D --> J
    J --> H
    J --> I
    M --> D

    style A fill:#4f46e5
    style D fill:#000066
    style K fill:#0078d4
    style H fill:#336791
    style L fill:#38b2ac
```

**Description:** High-level system architecture showing the flow from frontend through Nginx reverse proxy to Express backend, with Microsoft Graph API integration for email delivery and dual database support (PostgreSQL for production, SQLite for development).

---

## Email Delivery Flow

```mermaid
flowchart TD
    A[User Creates Campaign] --> B{Status?}
    B -->|DRAFT| C[Save to Database]
    B -->|QUEUED| D[Schedule for Later]
    B -->|SENDING| E[Start Delivery]

    D --> F[Scheduler Checks Every 30s]
    F --> G{Time Reached?}
    G -->|No| F
    G -->|Yes| E

    E --> H[Query Active Subscribers]
    H --> I{Target Lists?}
    I -->|Yes| J[Filter by Roster]
    I -->|No| K[Use All Active]
    J --> L[Generate Tracking URLs]
    K --> L

    L --> M[Build Personalized HTML]
    M --> N[Microsoft Graph Auth]
    N --> O{Auth Success?}

    O -->|Yes| P[Get Access Token]
    P --> Q[Send via Graph API]
    O -->|No| R[Simulated Mode<br/>95% Success Rate]

    Q --> S{Send Success?}
    S -->|Yes| T[Record Delivered Event]
    S -->|No| U[Log Failure]
    R --> T

    T --> V{Simulated Mode?}
    V -->|Yes| W[Random Open/Click<br/>78% Open, 45% Click]
    V -->|No| X[Real User Action]
    W --> Y[Update Campaign Stats]
    X --> Y

    Y --> Z{More Subscribers?}
    Z -->|Yes| L
    Z -->|No| AA[Mark Campaign SENT]
    U --> AA

    AA --> BB[Update Final Stats<br/>Random Open Rate 55-85%]

    style A fill:#4f46e5
    style E fill:#dc2626
    style T fill:#16a34a
    style AA fill:#16a34a
    style R fill:#f59e0b
```

**Description:** Complete email delivery flow from campaign creation through subscriber filtering, Microsoft Graph authentication, email sending with simulated fallback, event tracking, and campaign completion.

---

## Campaign Lifecycle

```mermaid
stateDiagram-v2
    [*] --> DRAFT: User Creates Campaign

    DRAFT --> QUEUED: Schedule for Future
    DRAFT --> SENDING: Send Immediately

    QUEUED --> SENDING: Scheduler Fires<br/>(Every 30s check)

    SENDING --> SENT: All Emails Dispatched
    SENDING --> FAILED: Critical Error

    SENT --> SENDING: Manual Retry

    FAILED --> SENDING: Manual Retry

    SENT --> [*]
    FAILED --> [*]

    note right of DRAFT
        Can edit content
        Add email elements
        Set target lists
    end note

    note right of QUEUED
        Waits for scheduled time
        Checks every 30 seconds
        Within 1 minute tolerance
    end note

    note right of SENDING
        Real-time progress logs
        Throughput monitoring
        Cannot edit
    end note

    note right of SENT
        Analytics available
        Events recorded
        Open rate calculated
    end note
```

**Description:** Campaign state machine showing all possible states (DRAFT, QUEUED, SENDING, SENT, FAILED) and transitions between them.

---

## API Authentication Flow

```mermaid
sequenceDiagram
    actor User
    participant Frontend
    participant API as Express API
    participant DB as PostgreSQL/SQLite

    User->>Frontend: Enter credentials
    Frontend->>API: POST /api/auth/login<br/>{email, password}

    API->>DB: Query User by email & password

    alt Valid Credentials
        DB-->>API: Return user (no password)
        API-->>Frontend: 200 OK<br/>{success: true, user: {...}}
        Frontend->>Frontend: Store user in state
        Frontend->>API: GET /api/auth/me?email=...
        API->>DB: Select user by email
        DB-->>API: User profile
        API-->>Frontend: 200 OK<br/>{user: {...}}
        Frontend->>User: Show dashboard
    else Invalid Credentials
        DB-->>API: No user found
        API-->>Frontend: 401 Unauthorized<br/>{error: "Invalid credentials"}
        Frontend->>User: Show error message
    else Database Disconnected
        API-->>Frontend: 503 Service Unavailable<br/>{error: "Database not connected"}
        Frontend->>User: Show error
    end

    note over User,DB: First Login Flow
    User->>Frontend: Must change password
    Frontend->>API: PUT /api/auth/first-login<br/>{email, newPassword}
    API->>DB: Update password, set mustChangePassword=false
    DB-->>API: Success
    API-->>Frontend: 200 OK
    Frontend->>User: Redirect to dashboard
```

**Description:** Authentication sequence diagram showing login flow, session recovery, and first-time password change.

---

## Database Schema (ERD)

```mermaid
erDiagram
    USER ||--o{ CAMPAIGN : creates
    USER {
        string id PK "UUID primary key"
        string email UK "Unique, lowercase"
        string password "Plaintext (dev)"
        string name "Display name"
        string avatarUrl "Profile image URL"
        string role "admin | super-admin"
        boolean mustChangePassword "Force reset on login"
        string allowedModules "JSON: dashboard, campaigns, etc"
        datetime createdAt "Auto-generated"
        datetime updatedAt "Auto-updated"
    }

    SUBSCRIBER ||--o{ CAMPAIGN_EVENT : "generates events"
    SUBSCRIBER {
        string id PK "UUID primary key"
        string name "Full name"
        string email UK "Unique, lowercase"
        string status "Active | Dormant | Unsubscribed"
        string plan "Free | Premium | Enterprise"
        string roster "List name"
        string rosterName "Alias for roster"
        string initials "JD, AS, etc"
        string dateAdded "Formatted: 'Jan 15, 2024'"
        datetime createdAt "Auto-generated"
        datetime updatedAt "Auto-updated"
    }

    CAMPAIGN ||--|{ CAMPAIGN_EVENT : "tracks"
    CAMPAIGN {
        string id PK "UUID primary key"
        string name "Campaign name"
        string status "DRAFT | QUEUED | SENDING | SENT"
        int recipients "Number of recipients"
        int openRate "Percentage (0-100)"
        string subjectLine "Email subject"
        string senderName "From name"
        string replyTo "Reply-to address"
        string templateId "FK to EmailTemplate"
        string emailElements "JSON: [{type, properties}]"
        string targetLists "JSON: ['Newsletter', 'Premium']"
        string scheduledAt "Formatted: 'Jan 20, 2024, 10:00 AM (UTC)'"
        string createdDate "Formatted: 'Jan 15, 2024'"
        datetime createdAt "Auto-generated"
        datetime updatedAt "Auto-updated"
    }

    EMAIL_TEMPLATE ||--o{ CAMPAIGN : "used by"
    EMAIL_TEMPLATE {
        string id PK "UUID primary key"
        string name "Template name"
        string description "Template description"
        string thumbnailAlt "Alt text for thumbnail"
        string thumbnailUrl "Preview image URL"
        string elements "JSON: [{type, properties}]"
        datetime createdAt "Auto-generated"
        datetime updatedAt "Auto-updated"
    }

    CAMPAIGN_EVENT {
        string id PK "UUID primary key"
        string campaignId FK "References Campaign"
        string email "Subscriber email"
        string name "Subscriber name"
        string eventType "delivered | open | click | unsubscribe"
        string url "Clicked URL (if click event)"
        datetime timestamp "Event time"
    }

    USER ||--o{ USER : "created_by"
    USER {
        string createdById FK "References parent User"
    }
```

**Description:** Entity Relationship Diagram showing all database tables, their fields, data types, primary keys (PK), foreign keys (FK), and relationships between entities.

---

## Tracking System Flow

```mermaid
flowchart LR
    A[Email Sent to<br/>john@example.com] --> B{User Action}

    B -->|Opens Email| C[Tracking Pixel<br/>1x1 Image]
    C --> D[GET /api/tracking/open]
    D --> E[Record 'open' Event]
    E --> F[Update Analytics]

    B -->|Clicks Link| G[Tracking URL<br/>/api/tracking/click?campaignId=...&url=...]
    G --> H[GET /api/tracking/click]
    H --> I[Record 'click' Event]
    I --> J[Redirect to Destination]

    B -->|Clicks Unsubscribe| K[Unsubscribe Link<br/>/api/tracking/unsubscribe?email=...]
    K --> L[GET /api/tracking/unsubscribe]
    L --> M[Record 'unsubscribe' Event]
    M --> N[Update Subscriber Status<br/>→ 'Unsubscribed']
    N --> O[Show Confirmation Page]

    O -->|Resubscribe| P[Resubscribe Link]
    P --> Q[GET /api/tracking/resubscribe]
    Q --> R[Update Status<br/>→ 'Active']
    R --> S[Show Success Page]

    F --> T[Analytics Dashboard]
    J --> T
    N --> T

    style A fill:#4f46e5
    style E fill:#16a34a
    style I fill:#f59e0b
    style M fill:#dc2626
    style R fill:#16a34a
```

**Description:** Tracking system flow showing how opens, clicks, unsubscribes, and resubscribes are tracked through dedicated API endpoints.

---

## Deployment Architecture

```mermaid
graph TB
    subgraph "Internet"
        A[User Browser]
        B[Email Recipients]
    end

    subgraph "VPS Server (Ubuntu 22.04/24.04)"
        subgraph "Network Layer"
            C[UFW Firewall<br/>Ports: 22, 80, 443]
            D[Nginx Web Server<br/>Reverse Proxy]
        end

        subgraph "SSL/TLS Layer"
            E[Let's Encrypt<br/>Certbot Auto-Renewal]
            F[SSL Certificate<br/>Fullchain + Private Key]
        end

        subgraph "Application Layer"
            G[PM2 Process Manager<br/>Auto-restart, Monitoring]
            H[Node.js 20 LTS<br/>dist/server.cjs]
            I[Express App<br/>Port 3000]
        end

        subgraph "Data Layer"
            J[PostgreSQL 14+<br/>Port 5432]
            K[Prisma ORM<br/>Connection Pool]
        end

        subgraph "Storage Layer"
            L[Backup Scripts<br/>Daily Cron 2AM]
            M[Application Files<br/>/var/www/igi-smtp]
        end
    end

    subgraph "External Services"
        N[Microsoft Graph API<br/>graph.microsoft.com]
        O[Azure AD<br/>OAuth2 Provider]
    end

    A -->|HTTPS| C
    C --> D
    D -->|HTTP 80| E
    D -->|HTTPS 443| F
    F --> G
    G --> H
    H --> I
    I --> K
    K --> J
    G -->|SMTP| N
    N -->|OAuth2| O

    L -->|pg_dump| J
    M -->|Code| H

    style A fill:#4f46e5
    style D fill:#38b2ac
    style H fill:#000066
    style J fill:#336791
    style N fill:#0078d4
```

**Description:** Production deployment architecture showing Nginx reverse proxy, PM2 process management, PostgreSQL database, SSL termination, firewall rules, backup strategy, and Microsoft Graph API integration.

---

## Subscriber Import Flow

```mermaid
flowchart TD
    A[Admin Uploads JSON] --> B{File Valid?}
    B -->|No| C[Return Error<br/>400 Bad Request]
    B -->|Yes| D[Parse JSON Array]

    D --> E[Loop Through Subscribers]
    E --> F{Valid Email?<br/>Contains @}

    F -->|No| G[Mark as Skipped<br/>Invalid email]
    F -->|Yes| H[Normalize Data<br/>Lowercase email<br/>Extract name<br/>Set defaults]

    H --> I{Email Exists?}
    I -->|No| J[Create New Subscriber]
    I -->|Yes| K{Overwrite?}

    K -->|Yes| L[Update Existing]
    K -->|No| G

    J --> M{Create Success?}
    L --> N{Update Success?}

    M -->|Yes| O[Mark: Created]
    M -->|No| P[Mark: Skipped<br/>Log error]
    N -->|Yes| Q[Mark: Updated]
    N -->|No| P

    O --> R[Add to Results]
    Q --> R
    G --> R
    P --> R

    R --> S{More Subscribers?}
    S -->|Yes| E
    S -->|No| T[Invalidate Cache]

    T --> U[Return Summary<br/>{total, created,<br/>updated, skipped,<br/>results}]

    style A fill:#4f46e5
    style O fill:#16a34a
    style Q fill:#38b2ac
    style G fill:#f59e0b
    style P fill:#dc2626
    style U fill:#16a34a
```

**Description:** Bulk subscriber import flow showing validation, normalization, upsert logic, cache invalidation, and summary response generation.

---

## Microsoft Graph Authentication Flow

```mermaid
sequenceDiagram
    participant App as IGI SMTP Server
    participant Azure as Azure AD Tenant
    participant Graph as Microsoft Graph API

    App->>App: Load credentials from<br/>microsoftSettings object

    App->>Azure: POST /oauth2/v2.0/token<br/>grant_type=client_credentials<br/>client_id=...<br/>client_secret=...<br/>scope=https://graph.microsoft.com/.default

    alt Valid Credentials
        Azure-->>App: 200 OK<br/>{access_token: "eyJ0...", expires_in: 3599}
        App->>Graph: POST /v1.0/users/{senderEmail}/sendMail<br/>Authorization: Bearer {access_token}<br/>{message: {...}}

        Graph-->>App: 202 Accepted<br/>Email queued for delivery
        App-->>App: Record delivered event
    else Invalid Credentials
        Azure-->>App: 400/401 Error<br/>{error: "invalid_grant", ...}
        App-->>App: Fall back to simulated mode
        App-->>App: Log: "⚠️ Microsoft Graph Authentication handshake failed"
    end

    note over App,Graph: Access token cached in memory<br/>Valid for 1 hour (3600s)
```

**Description:** OAuth2 client credentials flow with Azure AD to obtain Microsoft Graph access token for sending emails.

---

## API Request Flow

```mermaid
flowchart LR
    A[Client Request] --> B{Endpoint Type}

    B -->|Authentication| C[POST /api/auth/login<br/>POST /api/auth/register<br/>PUT /api/auth/profile<br/>PUT /api/auth/change-password]

    B -->|Subscribers| D[GET /api/subscribers<br/>POST /api/subscribers<br/>PUT /api/subscribers/:id<br/>DELETE /api/subscribers/:id<br/>POST /api/subscribers/bulk-import<br/>POST /api/subscribers/bulk-delete<br/>PUT /api/subscribers/bulk-update<br/>GET /api/subscribers/export]

    B -->|Campaigns| E[GET /api/campaigns<br/>POST /api/campaigns<br/>PUT /api/campaigns/:id<br/>DELETE /api/campaigns/:id<br/>POST /api/campaigns/:id/send<br/>POST /api/campaigns/test]

    B -->|Templates| F[GET /api/templates<br/>POST /api/templates<br/>PUT /api/templates/:id<br/>DELETE /api/templates/:id]

    B -->|Tracking| G[GET /api/tracking/click<br/>GET /api/tracking/unsubscribe<br/>GET /api/tracking/resubscribe<br/>POST /api/webhooks]

    B -->|Analytics| H[GET /api/analytics/engagement-trends<br/>GET /api/analytics/deliverability<br/>GET /api/analytics/performance<br/>GET /api/analytics/system-health<br/>GET /api/analytics/hourly-trends<br/>GET /api/events]

    B -->|Microsoft| I[GET /api/microsoft-settings<br/>POST /api/microsoft-settings<br/>POST /api/microsoft-settings/verify]

    B -->|Other| J[GET /api/db-status<br/>GET /api/campaigns/:id/progress<br/>GET /api/campaigns/:id/tracking<br/>POST /api/compose/send]

    C --> K[Database Connected?]
    D --> K
    E --> K
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K

    K -->|Yes| L[Execute Logic]
    K -->|No| M[Return 503 Error]

    L --> N{Request Valid?}
    N -->|No| O[Return 400 Error]
    N -->|Yes| P[Query/Update Database]
    P --> Q{Operation Success?}
    Q -->|No| R[Return 500 Error]
    Q -->|Yes| S[Return 200/201 Response]

    M --> T[Client Receives Error]
    O --> T
    R --> T
    S --> U[Client Receives Data]

    style A fill:#4f46e5
    style S fill:#16a34a
    style U fill:#16a34a
    style M fill:#dc2626
    style O fill:#f59e0b
    style R fill:#dc2626
```

**Description:** Complete API request flow showing endpoint categorization, database connection checks, validation, and response handling.

---

## Template Rendering Process

```mermaid
flowchart TD
    A[Campaign Email Elements] --> B{Element Type?}

    B -->|text| C[Render Text Block<br/>Font, Color, Padding]
    B -->|button| D[Render Button<br/>Text, URL, Colors, Radius<br/>Wrap URL with tracking]
    B -->|image| E[Render Image<br/>URL, Height, Width<br/>Lazy loading]
    B -->|spacer| F[Render Spacer<br/>Vertical height]
    B -->|divider| G[Render Divider<br/>Horizontal rule, color]
    B -->|html| H[Render Custom HTML<br/>Raw HTML snippet]

    C --> I[Wrapped in styled div]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I

    I --> J[Concatenate All Elements]
    J --> K[Wrap in Email Container<br/>Header with brand color #000066<br/>IGI Logo<br/>Footer with unsubscribe link]

    K --> L[Inject Personalization<br/>Replace {{name}} with<br/>subscriber name]

    L --> M[Final HTML Email]
    M --> N[Send via Microsoft Graph API<br/>or Simulated Mode]

    style A fill:#4f46e5
    style M fill:#16a34a
    style N fill:#0078d4
```

**Description:** Email template rendering pipeline showing how structured element arrays are converted to HTML emails with tracking, personalization, and branding.

---

## Data Flow: Campaign Creation to Delivery

```mermaid
flowchart LR
    A[Admin Creates Campaign] --> B[POST /api/campaigns<br/>Status: DRAFT]

    B --> C{Status = SENDING?}
    C -->|No| D[Store in Database]
    C -->|Yes| E[Trigger Immediate Send]

    D --> F[Admin Updates to QUEUED<br/>scheduledAt: "Jan 20, 2024, 10:00 AM (UTC)"]

    F --> G[Scheduler (30s interval)]
    G --> H{Time Reached?}
    H -->|No| G
    H -->|Yes| E

    E --> I[triggerCampaignSend function]
    I --> J[Query Active Subscribers]
    J --> K[Filter by targetLists]
    K --> L[Microsoft Graph Auth]

    L --> M{Send Loop}
    M --> N[Generate HTML per subscriber]
    N --> O[Send Email]
    O --> P[Record Event]
    P --> Q[Update Stats]
    Q --> R{More Subscribers?}
    R -->|Yes| M
    R -->|No| S[Mark SENT<br/>Calculate open rate]

    S --> T[Available in Analytics]

    style A fill:#4f46e5
    style B fill:#f59e0b
    style F fill:#f59e0b
    style E fill:#dc2626
    style S fill:#16a34a
    style T fill:#16a34a
```

**Description:** End-to-end data flow from campaign creation through scheduling to final delivery and analytics availability.

---

## Caching Strategy

```mermaid
flowchart TD
    A[API Request] --> B{Check Cache}

    B -->|Cache Hit| C[Return Cached Data<br/>TTL: 30 seconds]
    B -->|Cache Miss| D[Query Database]

    D --> E[Store in Cache<br/>setCache with TTL]
    E --> F[Return Data]

    C --> G[Client Response]

    subgraph "Cache Operations"
        H[invalidateCache pattern]
        I{Pattern provided?}
        I -->|No| J[Clear all cache<br/>cache.clear()]
        I -->|Yes| K[Delete matching keys<br/>key.startsWith pattern]
    end

    L[Data Modification<br/>CREATE/UPDATE/DELETE] --> H
    H --> M{Cache Cleared}

    subgraph "Cache Keys"
        N[subscribers:all]
        O[campaigns:all]
        P[templates:all]
        Q[subscribers:export]
    end

    style A fill:#4f46e5
    style C fill:#16a34a
    style F fill:#16a34a
    style M fill:#f59e0b
```

**Description:** Caching implementation showing fetch-or-cache pattern, TTL-based expiration, and invalidation triggers on data modifications.

---

## Rendering These Diagrams

### In GitHub / GitLab
Mermaid diagrams render automatically in GitHub README files and GitLab Markdown.

### In VS Code
Install the "Markdown Preview Mermaid Support" extension to view diagrams in preview mode.

### Online
Use the Mermaid Live Editor: https://mermaid.live/

### Export to Images
1. Copy the Mermaid code block
2. Paste into https://mermaid.live/
3. Click "Actions" → "Export as PNG/SVG"

### Embedding in Documentation
The diagrams can be directly added to ReadMe.md, Backend.md, Guideline.md, or Documentation.md files.

---

## Diagram Summary

| Diagram | Purpose | Complexity |
|---------|---------|------------|
| System Architecture | High-level overview of components | Medium |
| Email Delivery Flow | Complete delivery pipeline end-to-end | High |
| Campaign Lifecycle | State machine for campaign statuses | Low |
| API Authentication Flow | Login and session management sequence | Medium |
| Database Schema (ERD) | Complete database structure | High |
| Tracking System Flow | Click, open, unsubscribe tracking | Medium |
| Deployment Architecture | Production VPS setup | Medium |
| Subscriber Import Flow | Bulk import validation and processing | Medium |
| Microsoft Graph Auth | OAuth2 authentication sequence | Medium |
| API Request Flow | Request routing and handling | High |
| Template Rendering | HTML email generation process | Medium |
| Data Flow Campaign | Campaign creation to delivery pipeline | High |
| Caching Strategy | Cache implementation and invalidation | Low |

All diagrams use standard Mermaid syntax compatible with GitHub, GitLab, and most modern documentation viewers.