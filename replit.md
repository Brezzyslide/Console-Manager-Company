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

### Audit Scoring Model (v1.1 - Updated Jan 2026)
- Ratings: CONFORMITY_BEST_PRACTICE (3 pts), CONFORMITY (2 pts), MINOR_NC (1 pt), MAJOR_NC (0 pts)
- Score calculation: `scorePercent = (scorePointsTotal / maxPoints) * 100` where `maxPoints = indicatorCount * 3`
- Score version stored per response for future model updates
- Comments required (min 10 chars) only for MINOR_NC and MAJOR_NC ratings

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
- Document type can be selected during upload (POLICY, PROCEDURE, TRAINING_RECORD, etc.)
- Contextual tips shown based on selected document type
- Filename sanitization prevents directory traversal attacks
- All external submissions logged to change_log with action `EVIDENCE_SUBMITTED_EXTERNAL`

### Document Review Checklist System
- 12 document types: POLICY, PROCEDURE, TRAINING_RECORD, RISK_ASSESSMENT, CARE_PLAN, QUALIFICATION, WWCC, SERVICE_AGREEMENT, INCIDENT_REPORT, COMPLAINT_RECORD, CONSENT_FORM, OTHER
- Checklist templates stored in `document_checklist_templates` with version control
- Checklist items grouped by section: HYGIENE, IMPLEMENTATION, CRITICAL
- Critical items flagged for special attention during review
- Response options: YES, NO, PARTLY, NA
- Document Quality Score (DQS) calculated as percentage: (YES + 0.5*PARTLY) / applicable items
- Critical failures tracked separately
- Reviews stored in `document_reviews` with JSONB responses
- Review decisions: ACCEPT or REJECT
- Seed data provides 6-10 checklist items per document type

Key tables:
- `document_checklist_templates` - Template definitions with document type and version
- `document_checklist_items` - Individual checklist items with section and isCritical flag
- `document_reviews` - Completed reviews with DQS score and decision

API endpoints:
- `GET /api/company/document-checklists/templates` - List all active templates
- `GET /api/company/document-checklists/templates/:documentType` - Get template with items
- `POST /api/company/document-reviews` - Submit a document review (returns review + suggested finding if applicable)
- `GET /api/company/document-reviews/:evidenceItemId` - Get review for evidence item

### Suggested Finding System
- Non-binding suggestions generated after document reviews based on DQS score and critical failures
- Suggestion types: OBSERVATION, MINOR_NC, MAJOR_NC, NONE
- Suggestion logic:
  - Critical failures (any) → suggests MAJOR_NC (HIGH severity)
  - DQS < 50% → suggests MINOR_NC (MEDIUM severity)
  - DQS 50-74% → suggests OBSERVATION (LOW severity)
  - DQS >= 75% with no critical failures → no suggestion
- Suggestions are displayed as a banner on EvidenceDetailPage for audit-linked evidence requests
- Auditors can: confirm as suggested type, override to different type, or dismiss with reason
- Confirming MINOR_NC or MAJOR_NC creates a formal finding in the findings table
- Confirming OBSERVATION just notes it (observations are not in findings table)
- Dismissing records reason and who dismissed it
- All actions logged to change_log for audit trail

Key table:
- `suggested_findings` - Stores suggestions with status (PENDING, CONFIRMED, DISMISSED), links to document review and finding if confirmed

API endpoints:
- `GET /api/company/suggested-findings` - Get pending suggestions (optional auditId filter)
- `GET /api/company/suggested-findings/indicator/:indicatorResponseId` - Get suggestions for an indicator
- `GET /api/company/suggested-findings/:id` - Get specific suggestion
- `POST /api/company/suggested-findings/:id/confirm` - Confirm and create finding
- `POST /api/company/suggested-findings/:id/dismiss` - Dismiss suggestion

### Audit Report Generation
- Professional PDF reports following DNV industry standards
- AI-powered executive summary generation using Replit AI Integrations (OpenAI)
- Auditor edit/override capability for AI-generated summaries
- Interview and site visit tracking for comprehensive audit documentation
- PDF download with cover page, table of contents, scoring summary, and detailed sections

Key tables:
- `audit_interviews` - Tracks participant, staff, and stakeholder interviews with method (FACE_TO_FACE, PHONE, VIDEO, FOCUS_GROUP)
- `audit_site_visits` - Records site observations, participants witnessed, safety items checked
- `audit_sites` - Multi-location site tracking with primary site flag

Audit form fields:
- Entity Being Audited (name, ABN, address) - separate from the certification body
- Audit Purpose: INITIAL_CERTIFICATION, RECERTIFICATION, SURVEILLANCE, SCOPE_EXTENSION, TRANSFER_AUDIT, SPECIAL_AUDIT
- Certification Body details (organization, lead auditor name, email)

Report page features:
- Executive Summary tab with AI generation, regeneration, and manual editing
- Overview tab showing audit details and score summary (conformance counts, percentage score)
- Interviews tab listing all conducted interviews
- Site Visits tab showing all location observations
- All indicator responses displayed with ratings and comments
- Download PDF button generates professional report document

PDF Report structure:
- Cover page with entity details, certification body, audit period
- Table of contents with section listings
- Executive summary with AI-generated or manually edited content
- Scoring summary (conformance/observation/NC counts and percentage)
- Detailed scoring table with points breakdown
- Grouped indicator responses by rating category
- Findings section with severity, status, due dates
- Interview summary grouped by type (participant/staff/stakeholder)
- Site visit observations with safety checklist results

API endpoints:
- `GET /api/company/audits/:auditId/report-data` - Get comprehensive report data (requires CompanyAdmin/Auditor role)
- `GET /api/company/audits/:auditId/download-pdf` - Generate and download PDF report (requires CompanyAdmin/Auditor role)
- `POST /api/company/audits/:auditId/generate-executive-summary` - AI-generate executive summary
- `PUT /api/company/audits/:auditId/executive-summary` - Save edited executive summary
- `GET/POST/DELETE /api/company/audits/:auditId/interviews` - Interview CRUD
- `GET/POST/DELETE /api/company/audits/:auditId/site-visits` - Site visit CRUD

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
- `AI_INTEGRATIONS_OPENAI_API_KEY` - OpenAI API key (managed by Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` - OpenAI base URL (managed by Replit AI Integrations)

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal` - Error overlay in development
- `@replit/vite-plugin-cartographer` - Development tooling
- Custom `vite-plugin-meta-images` - OpenGraph image handling for deployments

## Future Enhancement Roadmap

### AI-Powered Enhancements

**1. Smart Evidence Analysis**
- AI reviews uploaded documents and automatically suggests which checklist items they satisfy
- OCR + AI to extract key dates, signatures, and compliance indicators from PDFs
- Auto-flag expired certifications (WWCC, first aid, qualifications)

**2. Predictive Compliance Risk Scoring**
- Analyze patterns across audits to predict which areas are likely to fail next time
- "Your policy documents have a 73% rejection rate - consider updating templates"
- Dashboard showing compliance risk trends over time

**3. Automated Finding Recommendations**
- After document review, AI suggests the exact finding text based on what failed
- Pre-populate corrective action recommendations based on similar past findings
- Suggest due dates based on severity and typical remediation timeframes

**4. Interview Assistant**
- AI generates suggested interview questions based on the audit scope and indicators
- Real-time transcription during interviews with automatic key observation extraction
- Post-interview summary generation

### Workflow Automation

**5. Smart Notifications & Escalations**
- Automated reminders when evidence requests are overdue
- Escalation workflows when findings aren't addressed by due date
- Weekly compliance digest emails to stakeholders

**6. Continuous Monitoring**
- Integration with HR systems to flag when staff certifications expire
- Connect to incident management to auto-generate findings from serious incidents
- Policy version tracking with renewal reminders

### Additional Ideas (To Be Prioritized)
- Mobile app for on-site auditors
- Integration with NDIS Commission portal
- Benchmarking against industry averages
- Template marketplace for audit templates
- White-label option for consulting firms