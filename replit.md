# replit.md

## Overview

This is a multi-tenant SaaS application for NDIS (National Disability Insurance Scheme) provider management. The platform consists of two distinct spaces:

1. **Console Manager** - Platform-level administration for managing tenant companies
2. **Provider App** - Tenant-specific functionality with RBAC and user management (Sprint 1 complete)

The core purpose is to enable platform administrators to create and manage NDIS provider companies (tenants), with strict data isolation between tenants enforced from the database level.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS v4 with custom theme variables
- **Build Tool**: Vite

The frontend follows a pages-based structure with route-specific components. Console pages are isolated under `/console/*` routes with their own layout wrapper that handles authentication state.

### Backend Architecture
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx for development
- **API Pattern**: RESTful endpoints under `/api/*`
- **Authentication**: JWT tokens stored in HTTP-only cookies
- **Password Hashing**: bcrypt

The server runs on port 5000 and serves both the API and the static frontend assets in production. In development, Vite provides HMR through the same server.

### Multi-Tenancy Design
- Console users (platform admins) are completely separate from company users
- All company data is scoped by `companyId` foreign key
- Every mutation operation writes to an immutable `change_log` table for auditing
- Default roles are auto-provisioned when a company is created: CompanyAdmin, Auditor, Reviewer, StaffReadOnly

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between frontend and backend)
- **Migrations**: Drizzle Kit with `db:push` command

Key tables:
- `console_users` - Platform administrators
- `companies` - Tenant organizations
- `company_users` - Users within tenant organizations
- `company_roles` - Role definitions per company
- `change_log` - Immutable audit trail
- `audits` - Audit records with status workflow
- `audit_indicator_responses` - Stores indicator ratings with score_points and score_version
- `evidence_requests` - Evidence requests (standalone, audit-linked, or finding-linked) with public shareable tokens
- `evidence_items` - Uploaded evidence files supporting both internal and external uploads

### Audit Scoring Model (v1)
- Ratings: CONFORMANCE (+2 pts), OBSERVATION (+1 pt), MINOR_NC (0 pts), MAJOR_NC (-2 pts)
- Score calculation: `scorePercent = (scorePointsTotal / maxPoints) * 100` where `maxPoints = indicatorCount * 2`
- Score version stored per response for future model updates
- Comments required (min 10 chars) for non-conformance ratings

### Audit Results Page (formerly Findings Register)
- Shows all indicator responses grouped by rating category
- Overall score summary with percentage and points breakdown
- Rating summary cards (Conformance, Observation, Minor NC, Major NC) with click-to-filter
- Filter by rating type, audit, and status (status filter only for NC ratings)
- Conformance/Observation entries displayed as informational cards
- Non-conformance entries linked to findings with remediation controls (owner, due date, status)
- API endpoint: `GET /api/company/audit-outcomes` with explicit audit ownership validation

### Authentication Flow
- Console Manager uses separate JWT auth with `console_token` cookie
- Company users use separate JWT auth with `company_token` cookie
- Both token types expire after 8 hours
- Bootstrap function creates initial console admin if none exists
- Company users require Company ID + email + password to login
- First login forces password reset (temp password provided at user creation)

### RBAC (Role-Based Access Control)
- Four company roles: CompanyAdmin, Auditor, Reviewer, StaffReadOnly
- CompanyAdmin can manage users within their organization
- requireRole middleware enforces role checks at API level
- Frontend route guards mirror backend RBAC for UX
- All mutations scoped by companyId at both route handler and storage layer (defense in depth)

### Security Features
- Rate limiting on login endpoints (5 attempts per 15 minutes per company/email)
- Password minimum 12 characters for new passwords
- Tenant isolation enforced at database query level with AND clauses
- All security-sensitive actions logged to change_log table

### Public Evidence Upload
- Each evidence request gets a unique public token (64-char hex string via crypto.randomBytes)
- External users can upload files via `/upload/:token` without authentication
- Public uploads automatically update request status to SUBMITTED
- External uploader name/email tracked in evidence_items table
- Filename sanitization prevents directory traversal attacks
- All external submissions logged to change_log with action `EVIDENCE_SUBMITTED_EXTERNAL`

## External Dependencies

### Database
- PostgreSQL via `DATABASE_URL` environment variable
- Connection pooling with `pg` package

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit` - Database ORM and migrations
- `jsonwebtoken` - JWT token generation/verification
- `bcrypt` - Password hashing
- `zod` - Runtime schema validation
- `express-session` / `connect-pg-simple` - Session management (available but JWT preferred)

### Environment Variables Required
- `DATABASE_URL` - PostgreSQL connection string
- `CONSOLE_JWT_SECRET` - Secret for signing console JWT tokens (defaults to dev value)
- `COMPANY_JWT_SECRET` - Secret for signing company JWT tokens (defaults to dev value)

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
- `@replit/vite-plugin-cartographer` - Development tooling
- Custom `vite-plugin-meta-images` - OpenGraph image handling for deployments