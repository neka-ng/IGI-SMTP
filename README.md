# IGI SMTP Platform

An enterprise-grade email marketing and SMTP gateway platform built with modern web technologies. Designed for high-performance bulk email delivery, subscriber management, and comprehensive analytics.

## Platform Overview

IGI SMTP is a full-featured email marketing solution that enables organizations to:
- Create and manage email campaigns with visual email builders
- Send bulk emails via Microsoft 365 Graph API (enterprise-grade delivery)
- Track email opens, clicks, and unsubscribes in real-time
- Manage subscriber lists with import/export capabilities
- View detailed analytics and deliverability metrics
- Schedule campaigns for automated delivery
- Monitor system health and performance

## Key Features

### 1. Campaign Management
- Create campaigns with custom subject lines and sender names
- Visual email template builder with drag-and-drop elements
- Target specific subscriber lists/rosters
- Schedule campaigns for future delivery
- Retry failed campaigns
- Real-time delivery progress tracking

### 2. Subscriber Management
- Add, edit, and delete subscribers individually
- Bulk import subscribers via JSON
- Organize subscribers into custom lists/rosters
- Track subscriber status (Active, Dormant, Unsubscribed)
- Export subscriber data
- Bulk operations (delete, update status/plan/roster)

### 3. Email Delivery Engine
- Microsoft Graph API integration for reliable delivery
- OAuth2 client credentials authentication
- Automatic failover to simulated mode for testing
- Personalized email content with subscriber data
- HTML email template rendering
- Built-in unsubscribe and click tracking

### 4. Analytics & Tracking
- Open rate tracking with pixel monitoring
- Click tracking for links in emails
- Unsubscribe event recording
- Engagement trends over time
- Hourly delivery patterns
- System health monitoring
- Deliverability metrics

### 5. Template System
- Create reusable email templates
- Support for multiple element types: text, buttons, images, spacers, dividers, custom HTML
- Template thumbnails and descriptions
- Easy template management

## Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Lucide React for icons
- Recharts for data visualization

**Backend:**
- Express.js (Node.js)
- TypeScript with TSX runtime
- Prisma ORM for database operations
- In-memory caching for performance

**Database:**
- SQLite (development)
- PostgreSQL (production ready)
- Prisma migrations supported

**Email Provider:**
- Microsoft Graph API (Office 365 / Exchange Online)
- OAuth2 Client Credentials Flow

## Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Git
- Microsoft 365 account with SMTP relay permissions (for real email delivery)

### Quick Start

1. **Clone the repository:**
```bash
git clone https://github.com/IGINIGERIA/SMTP-V1.git
cd SMTP-V1
```

2. **Install dependencies:**
```bash
npm install
```

3. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL="file:./prisma/dev.db"

# Microsoft Graph API Configuration
MICROSOFT_TENANT_ID=your-tenant-id
MICROSOFT_CLIENT_ID=your-client-id
MICROSOFT_CLIENT_SECRET=your-client-secret
MICROSOFT_SENDER_EMAIL=admin@yourdomain.com

# Application URL (for tracking)
APP_URL=https://your-domain.com
```

4. **Initialize the database:**
```bash
npx prisma migrate dev
# or
npx prisma db push
```

5. **Start development server:**
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

**Default Admin Credentials:**
- Email: `admin@igi-smtp.io`
- Password: `admin123`

> **Important:** Change the default admin password after first login.

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build for production (Vite + esbuild) |
| `npm start` | Start production server |
| `npm run lint` | Run TypeScript type checking |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:push` | Push schema changes to database |
| `npm run db:studio` | Open Prisma Studio (database browser) |
| `npm run db:export` | Export MongoDB data (migration helper) |
| `npm run db:import` | Import MongoDB data (migration helper) |

## Usage Guide

### Getting Started

1. **Login** with your credentials
2. **Change your password** if prompted (first-time login)
3. **Configure Microsoft Graph API** settings in Settings > API Keys
4. **Import subscribers** via CSV/JSON or add manually
5. **Create email templates** or use the visual builder
6. **Build your first campaign** with content and target lists
7. **Send or schedule** your campaign
8. **Monitor delivery** via the Delivery Logs

### Creating a Campaign

1. Navigate to **Campaigns** from the sidebar
2. Click **Create Campaign**
3. Fill in campaign details:
   - Campaign name
   - Subject line
   - Sender name
   - Target subscriber lists
4. Build your email using the visual editor or paste HTML
5. Choose action:
   - **Send Now** - Immediate delivery
   - **Schedule** - Set future delivery date/time
   - **Save as Draft** - Save without sending
6. Monitor delivery progress in real-time

### Managing Subscribers

**Adding Subscribers:**
- Single add: Use the form in Subscribers page
- Bulk import: Click Import, paste JSON array

**JSON Import Format:**
```json
[
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
```

### Tracking & Analytics

The platform automatically tracks:
- **Delivered**: Confirmed email delivery
- **Opens**: Email open events (via tracking pixel)
- **Clicks**: Link clicks within emails
- **Unsubscribes**: Opt-out events

View analytics in:
- **Dashboard** - Overview metrics and trends
- **Delivery Logs** - Detailed event timeline
- **Campaign Tracking** - Per-campaign performance

## Project Structure

```
├── server.ts              # Express backend with all API routes
├── src/
│   ├── api/              # API route modules
│   ├── components/       # React UI components
│   ├── db/               # Database connection and helpers
│   ├── data.ts           # Initial data and constants
│   ├── types.ts          # TypeScript type definitions
│   ├── App.tsx           # Main application component
│   └── main.tsx          # Application entry point
├── prisma/
│   ├── schema.prisma     # Database schema definition
│   └── dev.db            # SQLite database (development)
├── scripts/              # Database migration and export scripts
├── assets/               # Static assets
└── public/               # Public files

```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | Database connection string | Yes | `file:./prisma/dev.db` |
| `MICROSOFT_TENANT_ID` | Azure AD tenant ID | For real emails | - |
| `MICROSOFT_CLIENT_ID` | Azure app client ID | For real emails | - |
| `MICROSOFT_CLIENT_SECRET` | Azure app client secret | For real emails | - |
| `MICROSOFT_SENDER_EMAIL` | Default sender email address | For real emails | `admin@igi-smtp.io` |
| `APP_URL` | Public application URL | Yes | `https://igi-smtp.io` |

## Database Schema

**Key Models:**
- **User** - Admin users with roles and permissions
- **Subscriber** - Email subscribers with status and roster info
- **Campaign** - Email campaigns with content and scheduling
- **CampaignEvent** - Tracking events (delivered, open, click, unsubscribe)
- **EmailTemplate** - Reusable email templates

## Caching

The platform implements smart caching:
- In-memory cache with 30-second TTL
- Automatic cache invalidation on data changes
- Cache keys pattern: `subscribers:all`, `campaigns:all`, `templates:all`

## Security Notes

- Passwords stored in plaintext (demo/development) - implement hashing for production
- Microsoft Graph credentials stored in server memory
- No built-in rate limiting - add nginx/WAF rules for production
- Session management via client-side storage

## Troubleshooting

**Database connection issues:**
- Verify `DATABASE_URL` is correctly set
- Run `npx prisma migrate dev` to create tables
- Check file permissions on `prisma/` directory

**Emails not sending:**
- Verify Microsoft Graph API credentials
- Check tenant admin consent for SMTP.Send permissions
- Review server logs for authentication errors
- Test with `/api/campaigns/test` endpoint

**Tracking not working:**
- Ensure `APP_URL` is correctly configured
- Verify email HTML contains tracking pixels/links
- Check that tracking endpoints are accessible

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with TypeScript
4. Test thoroughly
5. Submit a pull request

## License

Proprietary - IGI Nigeria

## Support

For issues and questions:
- Email: support@igi-smtp.io
- Documentation: See Backend.md for API details
- Deployment: See Guideline.md for VPS hosting instructions