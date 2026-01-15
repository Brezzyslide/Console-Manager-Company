# replit.md

## Overview

This project is a multi-tenant SaaS application designed for NDIS (National Disability Insurance Scheme) provider management. It features a Console Manager for platform-level tenant administration and a Provider App for tenant-specific functionalities with robust Role-Based Access Control (RBAC). The primary goal is to facilitate the creation and management of NDIS provider companies (tenants) while ensuring strict data isolation. Key capabilities include a comprehensive audit management system with a standard indicators library, AI-powered document review, suggested findings, and professional audit report generation with AI-driven executive summaries. The platform aims to streamline compliance, reduce administrative burden, and improve audit efficiency for NDIS providers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Core Design Principles
The application is structured as a multi-tenant SaaS with strong data isolation. It employs a modern web stack for both frontend and backend, emphasizing scalability, security, and a responsive user experience. Key features like audit scoring, evidence management, and document review are built to be highly configurable and auditable.

### Frontend
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack React Query
- **UI Components**: shadcn/ui with Radix UI
- **Styling**: Tailwind CSS v4
- **Build Tool**: Vite
- **Structure**: Pages-based, with isolated console and provider app layouts and authentication handling.

### Backend
- **Framework**: Express.js with TypeScript
- **Runtime**: Node.js with tsx
- **API Pattern**: RESTful endpoints
- **Authentication**: JWT tokens in HTTP-only cookies (separate for console and company users)
- **Security**: bcrypt for password hashing, rate limiting, and tenant-scoped query enforcement.

### Multi-Tenancy & RBAC
- Separate user bases for Console (platform admins) and Company (tenant users).
- All tenant data is strictly scoped by `companyId` for isolation.
- Role-Based Access Control (RBAC) with predefined roles (CompanyAdmin, Auditor, Reviewer, StaffReadOnly) enforced at both API and frontend levels.

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with Zod schema validation.
- **Key Tables**: `console_users`, `companies`, `company_users`, `company_roles`, `change_log` (immutable audit trail), `audits`, `audit_indicator_responses`, `evidence_requests`, `evidence_items`, `standard_indicators`, `document_checklist_templates`, `document_checklist_items`, `document_reviews`, `suggested_findings`, `audit_interviews`, `audit_site_visits`, `audit_sites`, `finding_activities` (tracks corrective action lifecycle), `finding_closure_evidence` (links evidence to finding closures).

### Key Features
- **Audit Scoring Model**: Standardized rating system (CONFORMITY_BEST_PRACTICE, CONFORMITY, MINOR_NC, MAJOR_NC) with score calculation and versioning.
- **Standard Indicators Library**: Global library of 80+ NDIS compliance indicators categorized by 4 domains (GOV_POLICY, STAFF_PERSONNEL, OPERATIONAL, SITE_ENVIRONMENT). Auditors can select from this library or create custom indicators for templates.
- **Audit Results Page**: Comprehensive display of indicator responses, overall score, and filtering capabilities, linking non-conformances to findings.
- **Public Evidence Upload**: Secure external upload mechanism via unique tokens, automatically updating request status and logging submissions.
- **Document Review Checklist System**: Supports 12 document types with configurable checklist templates. Calculates a Document Quality Score (DQS) and tracks critical failures.
- **Suggested Finding System**: Non-binding suggestions generated post-document review based on DQS and critical failures (OBSERVATION, MINOR_NC, MAJOR_NC). Suggestions can be confirmed, overridden, or dismissed.
- **Audit Report Generation**: Professional PDF reports conforming to DNV standards, including AI-generated (and editable) executive summaries, scoring summaries, detailed responses, interview logs, and site visit observations.
- **Corrective Action Management**: Complete lifecycle tracking for non-conformance findings from identification through resolution. Activity timeline captures status changes, comments, evidence submissions, owner assignments, due dates, and closure details. PDF reports include full corrective action journey for each finding.

## External Dependencies

### Database
- PostgreSQL (via `DATABASE_URL`)

### Key NPM Packages
- `drizzle-orm` / `drizzle-kit`
- `jsonwebtoken`
- `bcrypt`
- `zod`
- `express`

### Environment Variables
- `DATABASE_URL`
- `CONSOLE_JWT_SECRET`
- `COMPANY_JWT_SECRET`
- `AI_INTEGRATIONS_OPENAI_API_KEY` (managed by Replit AI Integrations)
- `AI_INTEGRATIONS_OPENAI_BASE_URL` (managed by Replit AI Integrations)

### Replit-Specific Integrations
- `@replit/vite-plugin-runtime-error-modal`
- `@replit/vite-plugin-cartographer`
- `vite-plugin-meta-images`