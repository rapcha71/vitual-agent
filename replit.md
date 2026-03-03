# Virtual Agent - Real Estate Property Management Platform

## Overview

Virtual Agent is a real estate property management application designed for the Costa Rican market. The platform enables field agents to register properties for sale by capturing photos of property signs, extracting phone numbers using OCR (Google Cloud Vision), and recording GPS locations. Agents earn bonuses for registering new properties (250 colones), securing management agreements (2,000 colones), and successful sales (100,000 colones). The system includes admin dashboards for property and user management, with data synchronized to Google Sheets for centralized tracking.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight alternative to React Router)
- **State Management**: TanStack React Query for server state
- **UI Components**: Radix UI primitives with shadcn/ui styling system
- **Styling**: Tailwind CSS with CSS custom properties for theming
- **Build Tool**: Vite with React plugin
- **PWA Support**: Service worker for offline capability and installable app

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **Authentication**: Passport.js with local strategy and session-based auth
- **Session Storage**: PostgreSQL-backed sessions via connect-pg-simple
- **Password Hashing**: scrypt with timing-safe comparison
- **WebAuthn**: SimpleWebAuthn for biometric authentication support

### Data Storage
- **Primary Database**: PostgreSQL via Neon serverless
- **ORM**: Drizzle ORM with Zod schema validation
- **Hybrid Storage**: Database for primary data, Google Sheets for backup/reporting
- **Schema Location**: `shared/schema.ts` contains all table definitions

### Key Design Patterns
- **Shared Types**: Schema definitions in `/shared` are used by both client and server
- **API Layer**: RESTful endpoints under `/api/*` prefix
- **Protected Routes**: Client-side route protection via `ProtectedRoute` component
- **Admin Middleware**: Server-side `requireAdmin` middleware for admin-only endpoints
- **Error Boundaries**: React error boundaries for graceful error handling

### Project Structure
```
├── client/           # React frontend
│   ├── src/
│   │   ├── components/ui/  # shadcn/ui components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utilities and API client
│   │   └── pages/          # Route components
│   └── public/       # Static assets and PWA manifest
├── server/           # Express backend
│   ├── routes/       # API route handlers
│   ├── services/     # External service integrations
│   ├── storage/      # Data access layer implementations
│   └── middleware/   # Express middleware
├── shared/           # Shared types and schemas
└── migrations/       # Drizzle database migrations
```

## External Dependencies

### Database
- **Neon PostgreSQL**: Serverless PostgreSQL database (requires `DATABASE_URL` environment variable)
- **Drizzle Kit**: Database migrations via `db:push` command

### Google Cloud Services
- **Google Cloud Vision API**: OCR for extracting phone numbers from property sign photos (requires `GOOGLE_VISION_CREDENTIALS`)
- **Google Sheets API**: Data synchronization and backup (requires `GOOGLE_SHEETS_CREDENTIALS` and `GOOGLE_SHEETS_ID`)
- **Google Maps API**: Location capture and display (requires client-side API key via `@googlemaps/js-api-loader`)

### Authentication Services
- **SimpleWebAuthn**: Browser and server libraries for WebAuthn/passkey authentication
- **Express Session**: Session management with PostgreSQL store

### Required Environment Variables
- `DATABASE_URL`: PostgreSQL connection string
- `SESSION_SECRET`: Secret for session encryption
- `GOOGLE_VISION_CREDENTIALS`: JSON credentials for Vision API
- `GOOGLE_SHEETS_CREDENTIALS`: JSON credentials for Sheets API
- `GOOGLE_SHEETS_ID`: Target spreadsheet ID for data sync

### Payment Integration
- **Stripe**: Payment processing (referenced in error logs, integration pending)
- **Simpe Móvil**: Local Costa Rican mobile payment system for agent payouts (external process)

## Security & Performance (Audit 2026-01-21)

### Security Measures
- **Helmet**: HTTP security headers configured
- **Rate Limiting**: 500 requests/15min general, 10 attempts/15min for auth endpoints
- **CORS**: Environment-specific origin restrictions
- **Password Reset**: Secure code handling (codes not exposed in responses)

### Frontend Stability
- **Error Boundaries**: Global error boundary in App.tsx catches render errors
- **API Client**: 30s timeout, retry with backoff for GET requests, abort signal support
- **Loading States**: Consistent loading/error/empty states across components

### PWA Enhancements
- **Service Worker v2**: Network-first for APIs, stale-while-revalidate for assets
- **Offline Page**: Dedicated offline.html fallback
- **Cache Management**: Automatic old cache cleanup on activation
- **Update Flow**: skipWaiting + clientsClaim for immediate updates

### Performance Optimizations
- **React.memo**: MapComponent and heavy components memoized
- **useCallback/useMemo**: Expensive calculations and callbacks optimized
- **Debounce Hook**: Available at hooks/use-debounce.ts for input optimization
- **Lazy Loading**: Images use loading="lazy" attribute

## Running the Application

### Development
```bash
npm run dev        # Start development server on port 5000
npm run db:push    # Push schema changes to database
```

### Testing Offline Mode
1. Open DevTools > Network tab
2. Set throttling to "Offline"
3. Reload page - should see offline.html

### Simulating Mobile
1. Open DevTools > Toggle Device Toolbar (Ctrl+Shift+M)
2. Select mobile device preset
3. Test touch interactions and responsive layout