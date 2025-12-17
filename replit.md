# replit.md

## Overview

This is a multi-tenant SaaS application for NDIS (National Disability Insurance Scheme) provider management. The platform consists of two distinct spaces:

1. **Console Manager** - Platform-level administration for managing tenant companies
2. **Provider App** - Tenant-specific functionality (planned for future sprints)

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

### Authentication Flow
- Console Manager uses separate JWT auth with `console_token` cookie
- Company users will have their own auth flow (scoped by tenant)
- Token expiry: 8 hours
- Bootstrap function creates initial console admin if none exists

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

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
- `@replit/vite-plugin-cartographer` - Development tooling
- Custom `vite-plugin-meta-images` - OpenGraph image handling for deployments