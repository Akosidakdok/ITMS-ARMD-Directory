# PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)
# Master Development Cycle, Technical Debt Audit & Strategic Roadmap

**Document Reference:** `ITMS-PAIS-DEV-CYCLE-2026`  
**Current System Baseline:** Version 2.0-rc (Integration & Verification Stage)  
**Effective Date:** September 2026 onwards  
**Custodian:** PNP-ITMS ARMD Development Team / System Engineering  

---

## 1. Executive Summary & Purpose

The **PNP-ITMS Personnel and Assignment Information System (PAIS 2.0)** is the mission-critical administrative platform designed to manage the personnel directory, duty postings, assignment histories, official orders, commendations/awards, educational attainment, specialized IT training, promotion rosters with Time-in-Grade (TIG) tracking, and leave records for the Information Technology Management Service (ITMS) of the Philippine National Police (PNP).

Following the initial development phases (Weeks 1–7) and technical integration (Week 8), this document establishes the **authoritative development cycle, audit findings, loose ends inventory, strategic aims, and operational roadmap** from this point forward.

### Key Scan Takeaways
- **Codebase Stability:** The React 19 / Vite frontend builds cleanly with zero TypeScript errors. The backend unit test suite passes 18/18 tests.
- **Critical Loose Ends Identified:** Incomplete database DDL initialization scripts, asymmetric database error fallbacks in the repository layer, dead legacy MongoDB/Mongoose artifacts, missing API rate limiting, unconfigured cron keep-alive, optimistic UI state desynchronization without rollback, and hardcoded leave balances and signatories.
- **Immediate Path Forward:** Execute **Phase 0 (Technical Remediation)** to resolve all loose ends before commencing formal **Phase 2 (User Acceptance Testing)** and **Phase 3 (Production Deployment)**.

```
+------------------------------------------------------------------------------------+
|                               DEVELOPMENT CYCLE LIFECYCLE                          |
+------------------------------------------------------------------------------------+
|                                                                                    |
|   [ Phase 0 ] Immediate Remediation  --->  [ Phase 1 ] Security & Data Hardening   |
|   - Clean dead MongoDB artifacts           - Rate limiting & brute force shield    |
|   - Unify master Supabase schema           - Audit logging framework               |
|   - Fix repository fallback parity         - Single source of truth for RBAC       |
|   - Add UI optimistic rollback             - Soft-delete data protection           |
|                                                                                    |
|                                       v                                            |
|                                                                                    |
|   [ Phase 2 ] User Acceptance Testing ---> [ Phase 3 ] Production Release          |
|   - Real-world stakeholder trials          - SSL/TLS & CORS lockdown               |
|   - Playwright automated E2E tests         - Verified backup/restore test          |
|   - Data migration validation              - Admin handover & training             |
|                                                                                    |
|                                       v                                            |
|                                                                                    |
|   [ Phase 4 ] PAIS 2.1+ Evolution (Post-Deployment Roadmap)                        |
|   - Dynamic leave balance ledger & accrual engine                                  |
|   - Rank-specific NAPOLCOM/DPRM promotion boards                                   |
|   - Interactive board deliberator & batch order generator                          |
|   - Multi-office configurable template signatories                                 |
+------------------------------------------------------------------------------------+
```

---

## 2. Comprehensive Codebase Scan & Baseline Audit

An exhaustive scan of the repository structure, configuration files, backend architecture, frontend application, and test suites yields the following baseline profile:

### 2.1 Technology Stack Inventory

| Component | Technology | Version | Purpose & Location |
|---|---|---|---|
| **Frontend Framework** | React + TypeScript | React 19.2.8 / TS 7.0.2 | Single-page administrative client (`/src`) |
| **Build & Tooling** | Vite + Rolldown | Vite 8.1.5 | Fast bundling, hot reload, and production build |
| **CSS Styling** | Tailwind CSS | Tailwind 4.3.3 (`@tailwindcss/vite`) | Responsive utility-first styling (`/src/index.css`) |
| **Icons & Visuals** | Lucide React | 1.25.0 | Administrative iconography |
| **PDF & Export** | jsPDF + AutoTable | jsPDF 4.2.1 / AutoTable 5.0.8 | Document export and formatted reports |
| **Backend Runtime** | Node.js (ESM) | Node v24.x | REST API server (`/backend/server.js`) |
| **API Framework** | Express | Express 5.2.1 | API routing and middleware pipeline |
| **Database & Auth** | Supabase (PostgreSQL) | `@supabase/supabase-js` 2.110.8 | Cloud database and session authentication |
| **Testing Harness** | Node Test Runner | Native `node --test` | Unit and schema regression testing (`/test`) |

### 2.2 Baseline Verification Metrics

| Metric | Status | Details |
|---|---|---|
| **Unit Test Suite** | 18 Passed / 0 Failed | Schema allowlists, CSV/XLSX parser, TIG date logic, Auth roles |
| **Vite Production Build** | Clean (`11.22s`) | 37 assets generated, route-level code splitting compliant |
| **TypeScript Compilation** | Zero Errors | Strict check `tsc --noEmit` exits with code 0 |
| **Git Working Tree** | Clean | Branch `main` up-to-date with remote |

---

## 3. Detailed Loose Ends & Technical Debt Analysis

The deep scan identified several technical, architectural, and operational loose ends that must be addressed to guarantee system stability and security.

### 3.1 Critical Architectural Loose Ends

#### 1. Missing Master Supabase Database Initialization DDL
- **Issue:** The repository contains migration snippets (`migrate_personnel_table.sql`, `migrate_awards_and_leave.sql`, `migrate_education_training_fields.sql`, `create_admin_profiles.sql`, `fix_leave_type_constraint.sql`), but **NO master DDL schema file** exists to instantiate `public.personnel`, `public.orders`, `public.assignments`, `public.promotions`, or `public.leaves` on a fresh Supabase database.
- **Risk:** Inability to perform automated deployments, disaster recovery, or spin up new staging/dev databases without manually inspecting TypeScript models.
- **Remediation:** Create a unified `backend/scripts/00_master_schema.sql` defining all tables, constraints, foreign keys, and indexes in correct dependency order.

#### 2. Asymmetric Database Error Handling in Repository Layer (`backend/store/repository.js`)
- **Issue:** 
  - `createPersonnel`, `updatePersonnel`, and `deletePersonnel` strictly throw errors when Supabase operations fail, preventing phantom updates.
  - In contrast, `createOrder`, `updateOrder`, `deleteOrder`, `createAssignment`, `updateAssignment`, `deleteAssignment`, `createPromotion`, and `deletePromotion` catch Supabase errors and silently fall back to `inMemory*` arrays.
- **Risk:** If a network glitch, RLS violation, or constraint failure occurs on Supabase, the API still returns `200 OK` or `201 Created` to the client. The user believes their order/promotion/assignment was saved, but the record is only in ephemeral Node.js memory and will be permanently lost on server restart.
- **Remediation:** Enforce strict error bubbling across all entities: if Supabase is connected and an operation fails, throw an explicit error rather than silently saving to memory.

#### 3. Table Naming Collision and Cleanup Gaps
- **Issue:**
  - `backend/store/repository.js` queries `public.leaves` (plural).
  - `backend/scripts/migrate_awards_and_leave.sql` lines 69–72 inspects `to_regclass('public.leave')` (singular).
  - `backend/scripts/clear_supabase.js` line 11 purges `'leave'` instead of `'leaves'`, and completely omits `awards` and `admin_profiles`.
- **Risk:** Running maintenance scripts fails silently or leaves residual records in database tables.
- **Remediation:** Standardize canonical naming on `public.leaves`, `public.awards`, and `public.admin_profiles`, and update all maintenance scripts.

#### 4. Foreign Key Constraints & Cascade Protection
- **Issue:** Child tables (`assignments`, `orders`, `awards`, `education`, `training`, `promotions`, `leaves`) reference `personnelId` as loose `TEXT` without foreign key constraints (`REFERENCES personnel(id) ON DELETE CASCADE` or `RESTRICT`).
- **Risk:** When a personnel record is deleted in the Management Center, their historical assignments, awards, training, and leave entries become orphaned rows with broken UI joins.
- **Remediation:** Define explicit foreign keys and cascade rules in the master database schema.

---

### 3.2 High-Priority Technical Debt

#### 5. Dead Legacy MongoDB Artifacts & Dependencies
- **Issue:** The repository includes `mongoose` in both root `package.json` and `backend/package.json`, along with `backend/config/db.js` and 8 unused Mongoose schema files in `backend/models/` (`Personnel.js`, `Assignment.js`, `Order.js`, `Award.js`, `Education.js`, `Leave.js`, `Promotion.js`, `Training.js`). None of these are imported or used.
- **Risk:** Bloated `node_modules`, slower installs, confusion for new maintainers, and unnecessary CVE exposure.
- **Remediation:** Remove `mongoose` dependency, delete `backend/config/db.js` and `backend/models/` folder.

#### 6. Missing API Rate Limiting & Brute Force Protection
- **Issue:** `/api/auth/login` and mutation endpoints have no request throttling or rate limiting middleware.
- **Risk:** Potential credential stuffing or brute force attacks against Supabase Auth accounts.
- **Remediation:** Implement `express-rate-limit` on `/api/auth/login` (e.g., 5 attempts per 15 minutes per IP) and general API rate limiting.

#### 7. Inactive Render Keep-Alive Cron
- **Issue:** `backend/server.js` defines `/api/cron/keep-alive` with a comment stating it is called by Vercel Cron every 14 minutes. However, `vercel.json` does NOT contain a `"crons"` configuration block.
- **Risk:** The free-tier Render backend spins down after 15 minutes of inactivity, subjecting initial users to 50+ second cold-start response delays.
- **Remediation:** Add the proper `"crons"` schedule to `vercel.json` or configure an external health monitor (e.g., UptimeRobot, BetterStack) pinging `/ping`.

---

### 3.3 Medium-Priority UI/UX & Data Integrity Gaps

#### 8. Optimistic State Desynchronization Without Rollback in Frontend
- **Issue:** In `src/context/AuthRoleContext.tsx`, functions like `addPromotion` and `addLeave` immediately mutate local React state (`setPromotionsList`, `setLeaveList`), fire background API requests without `await`, and swallow backend errors in `.catch(console.error)`.
- **Risk:** If the backend rejects the write (e.g., duplicate key, network drop), the UI presents the record as successfully created. When the page is reloaded, the record vanishes.
- **Remediation:** Return promises from all context mutation helpers, await API responses before mutating React state, or implement transactional rollbacks with visible error banners.

#### 9. Hardcoded Demo Values in Business Logic & Views
- **Issue:**
  - `src/components/personnel/LeaveSubTab.tsx`: Vacation and Sick leave balances are hardcoded to `"15.0 Days"`, and Mandatory Leave is hardcoded to `"Complied 2026"`.
  - `src/pages/ReportsPage.tsx`: The leave date filter initializes to `'2026-07-23'` instead of the current system date.
  - `src/components/orders/DocumentTemplatePanel.tsx`: Signatory defaults to a hardcoded name (`PBGEN BENJAMIN H ACORDA`, `Director, ITMS`).
  - `src/utils/timeInGrade.ts`: Promotion eligibility hardcodes `years >= 3` for all personnel, disregarding rank-specific NAPOLCOM/DPRM criteria.
- **Remediation:** Parameterize all dates and signatories; implement dynamic leave balance computations and rank-specific TIG evaluation tables.

#### 10. Read-Only Promotion Page
- **Issue:** `src/pages/PromotionPage.tsx` currently provides only a static view of time-in-grade rosters. Users cannot initiate promotion board reviews, batch update ranks, or add promotion records directly from this page without navigating into individual personnel profiles.
- **Remediation:** Add interactive board review filters, qualification batch actions, and promotion entry triggers.

#### 11. Dual Source of Truth for Role-Based Access Control
- **Issue:** Roles are evaluated using both environment variables (`AUTH_SUPERADMIN_EMAILS`, `AUTH_ADMIN_EMAILS`) and Supabase Auth `app_metadata` / `admin_profiles`.
- **Risk:** Role drift where a user added via the database does not receive permissions because the server environment variable was not reloaded.
- **Remediation:** Standardize on Supabase `admin_profiles` as the primary authority, retaining env variables strictly for emergency bootstrap.

---

## 4. Strategic Goals & Operational Aims

The future development cycle is governed by five strategic aims designed to transform PAIS from an integration candidate into an institutional-grade police records system.

```
+------------------------------------------------------------------------------------+
|                             PAIS 2.0 STRATEGIC PILLARS                             |
+------------------------------------------------------------------------------------+
|  AIM 1: DATA INTEGRITY     -> Zero silent drops; guaranteed database persistence   |
|  AIM 2: SECURITY & RBAC    -> Strict least-privilege RLS, audit logs & rate limits |
|  AIM 3: POLICE DOMAIN LOGIC-> Rank-specific NAPOLCOM TIG, dynamic leave ledger     |
|  AIM 4: HIGH AVAILABILITY  -> Sub-second response, cold-start mitigation, caching  |
|  AIM 5: VERIFIABLE QUALITY -> 100% automated regression, browser E2E, signed UAT   |
+------------------------------------------------------------------------------------+
```

### Aim 1: Absolute Data Integrity & Single Source of Truth
- Every administrative action (Create, Update, Delete) must be strictly validated and acknowledged by Supabase PostgreSQL before confirming success to the user.
- Eliminate orphaned records through schema-level foreign key constraints.
- Guarantee that all historical documents, assignments, and leave filings match their linked personnel identity.

### Aim 2: Enterprise Security, Least Privilege & Auditability
- Enforce strict Row Level Security (RLS) on all Supabase tables so that anonymous clients cannot manipulate personnel data.
- Maintain an immutable **Audit Trail** recording who performed what operation, when, and the prior/new values.
- Protect all authentication endpoints against brute force attacks with automated rate limiting.

### Aim 3: Authentic Police Domain Logic Automation
- Upgrade Time-in-Grade calculations from generic demo benchmarks to authentic PNP/NAPOLCOM promotion standards:
  - Patrolman/Patrolwoman to Police Corporal: 2–3 Years
  - Police Corporal to Police Staff Sergeant: 2–3 Years
  - Senior Police Officers & Commissioned Officers: Specific rank-ladder criteria
- Implement real-time leave ledger accounting: standard 15 days VL / 15 days SL annual credit accrual minus approved days taken.

### Aim 4: High Availability, Resilience & Cold-Start Mitigation
- Ensure 99.9% uptime for the backend service.
- Prevent Render container sleep states through automated cron keep-alive.
- Optimize bulk imports and data-heavy reports to process within sub-2-second response times.

### Aim 5: Verifiable Quality Assurance & Release Governance
- Maintain automated end-to-end (E2E) testing covering every core workflow.
- Secure signed stakeholder acceptance from authorized PNP-ITMS personnel before production rollout.
- Guarantee tested database backup and restoration capabilities.

---

## 5. Phased Development Cycle Roadmap

The development cycle is organized into five actionable, sequential phases.

```
2026 TIMELINE:
[ Sep 02 - Sep 06 ] Phase 0: Immediate Loose Ends Remediation
[ Sep 07 - Sep 11 ] Phase 1: Security Hardening & Data Quality
[ Sep 12 - Sep 18 ] Phase 2: UAT Execution & E2E Verification
[ Sep 19 - Sep 25 ] Phase 3: Production Deployment & Handover
[ Sep 26 Onward   ] Phase 4: Continuous Evolution (PAIS 2.1+)
```

---

### Phase 0: Immediate Loose Ends Remediation (Current Focus)
**Target Completion:** End of Week 8 (September 6, 2026)  
**Primary Objective:** Eliminate technical debt, dead code, and data inconsistency risks.

| Item | Task Description | Affected Files | Expected Deliverable |
|---|---|---|---|
| **0.1** | **Purge Dead MongoDB Artifacts**<br>Uninstall `mongoose` dependency, remove `backend/config/db.js`, delete `backend/models/*.js`. | `package.json`<br>`backend/package.json`<br>`backend/config/db.js`<br>`backend/models/` | Clean dependency tree; zero references to unused MongoDB libraries. |
| **0.2** | **Consolidate Master Supabase DDL**<br>Create a unified idempotent script creating all tables (`personnel`, `orders`, `assignments`, `awards`, `education`, `training`, `promotions`, `leaves`, `admin_profiles`) with foreign keys, checks, and indexes. | `backend/scripts/00_master_schema.sql` | One-click database provisioning script for clean or restored instances. |
| **0.3** | **Enforce Backend Error Parity**<br>Refactor `repository.js` so that `orders`, `assignments`, `promotions`, `education`, `training`, and `leaves` throw on Supabase error rather than silently saving to memory. | `backend/store/repository.js` | Zero silent database drops; consistent error bubbling to API controllers. |
| **0.4** | **Fix Table Naming in Scripts**<br>Standardize references to `public.leaves` in `migrate_awards_and_leave.sql` and `clear_supabase.js`. | `backend/scripts/migrate_awards_and_leave.sql`<br>`backend/scripts/clear_supabase.js` | Maintenance scripts accurately target active database tables. |
| **0.5** | **Frontend Mutation Rollback**<br>Update `AuthRoleContext.tsx` so that `addPromotion`, `addLeave`, `deleteEducation`, and `deleteTraining` await API responses, handle rejections gracefully, and roll back state on failure. | `src/context/AuthRoleContext.tsx` | UI accurately reflects backend reality; users receive visible error toasts if writes fail. |
| **0.6** | **Activate Vercel Keep-Alive Cron**<br>Add `"crons"` schedule to `vercel.json` targeting `/api/cron/keep-alive` every 14 minutes. | `vercel.json` | Render free-tier instance stays active, eliminating 50s cold-start delays. |

---

### Phase 1: Security Hardening & Data Quality
**Target Completion:** Mid Week 9 (September 11, 2026)  
**Primary Objective:** Fortify application security, implement audit trails, and ensure data protection.

| Item | Task Description | Affected Files | Expected Deliverable |
|---|---|---|---|
| **1.1** | **API Rate Limiting & Throttling**<br>Install `express-rate-limit` and apply strict limits to `/api/auth/login` (5 req / 15 min) and write endpoints (100 req / 15 min). | `backend/server.js`<br>`backend/package.json` | Protection against credential brute-forcing and denial-of-service attempts. |
| **1.2** | **Audit Logging Architecture**<br>Create `public.audit_logs` table in Supabase and an Express middleware capturing user ID, IP address, endpoint, action, and JSON payload delta. | `backend/middleware/auditLogger.js`<br>`backend/scripts/01_audit_log_schema.sql` | Immutable audit log satisfying government IT compliance requirements. |
| **1.3** | **Security Headers & CORS Lockdown**<br>Install `helmet` to set HSTS, CSP, X-Frame-Options, and X-Content-Type-Options. Restrict CORS strictly to designated production domains. | `backend/server.js` | Hardened HTTP response headers passing vulnerability scanners. |
| **1.4** | **Soft-Delete (Archival) Mechanism**<br>Add `archived_at` and `archived_by` columns to `personnel`, `orders`, and `assignments` so records can be deactivated without destroying history. | `backend/store/repository.js`<br>`src/types/pais.ts` | Data protection preventing permanent accidental loss of personnel records. |
| **1.5** | **Dynamic Date & Filter Standardization**<br>Replace hardcoded dates in `ReportsPage.tsx` and template signatories with dynamic parameters and office configurations. | `src/pages/ReportsPage.tsx`<br>`src/components/orders/DocumentTemplatePanel.tsx` | Context-aware reports and flexible document generation. |

---

### Phase 2: User Acceptance Testing (UAT) & Production Readiness
**Target Completion:** End of Week 9 (September 18, 2026)  
**Primary Objective:** Validate user experience, edge cases, and operational readiness with actual stakeholders.

| Item | Task Description | Methodology & Evidence |
|---|---|---|
| **2.1** | **Formal Stakeholder UAT Sessions**<br>Conduct guided walk-throughs with ITMS ARMD officers: personnel registration, order issuance, leave filing, TIG review, and report generation. | Signed UAT sign-off matrix with documented pass/fail acceptance criteria. |
| **2.2** | **Automated Browser E2E Test Suite**<br>Configure Playwright testing core user journeys: Login -> Create Personnel -> Issue Order -> File Leave -> Generate PDF Export. | Automated E2E CI report passing across Chromium, Firefox, and WebKit. |
| **2.3** | **Disaster Recovery & Backup Restoration Drill**<br>Execute a full Supabase backup export, restore into a secondary staging database, and verify record counts and relationships. | Documented Disaster Recovery Verification Report confirming zero data loss. |
| **2.4** | **Accessibility & Cross-Device Audit**<br>Test responsive rendering across standard desktop monitors, tablets, and mobile displays; verify high-contrast readability and keyboard navigation. | WCAG 2.1 AA accessibility audit log. |

---

### Phase 3: Production Deployment, Training & Handover
**Target Completion:** Week 10 (September 25, 2026)  
**Primary Objective:** Deliver a live, production-grade system with trained administrators and handover documentation.

| Item | Task Description | Deployment Checklist Gate |
|---|---|---|
| **3.1** | **Production Infrastructure Provisioning**<br>Configure official PNP-ITMS host or approved cloud deployment, enforce custom domain SSL/TLS certificate, and set production environment variables. | Production URL active with valid HTTPS certificate. |
| **3.2** | **Production Supabase RLS & Key Rotation**<br>Apply final Row Level Security policies; generate and store production service keys in encrypted key vaults; rotate initial staging secrets. | RLS verified: direct anon access blocked; service role operational. |
| **3.3** | **Administrator & User Orientation**<br>Conduct hands-on training sessions for ARMD record handlers and system superadmins; distribute printed Quick Reference Guides. | Training attendance sheet and distributed user manual. |
| **3.4** | **System Handover & Operational Sign-off**<br>Formally hand over repository access, credentials, backup schedules, and maintenance runbooks to ITMS designated custodians. | Signed Project Acceptance & Handover Certificate. |

---

### Phase 4: PAIS 2.1+ Continuous Evolution (Post-Deployment)
**Target Completion:** Q4 2026 & Ongoing  
**Primary Objective:** Expand domain capabilities, predictive analytics, and automated personnel board operations.

```
+------------------------------------------------------------------------------------+
|                         PAIS 2.1+ FEATURE ENHANCEMENT SUITE                        |
+------------------------------------------------------------------------------------+
|  1. Dynamic Leave Ledger Engine                                                    |
|     - Real-time leave balance tracking (15.0 VL / 15.0 SL accruals)                |
|     - Mandatory 5-day leave compliance tracker                                     |
|     - Automatic deduction upon leave approval                                      |
|                                                                                    |
|  2. Rank-Specific NAPOLCOM/DPRM TIG Engine                                         |
|     - Differentiated minimum time-in-grade thresholds by rank                      |
|     - Commissioned Officer vs Non-Commissioned Officer eligibility matrices        |
|     - Seniority board ranking generator                                            |
|                                                                                    |
|  3. Interactive Promotion Board Management Module                                  |
|     - Candidate shortlisting and qualification scoring                             |
|     - Promotion board resolution workflow                                          |
|     - Batch Special Order generation                                               |
|                                                                                    |
|  4. Multi-Office Configurable Document Templates                                   |
|     - Configurable signatories (Director, Chief ARMD, Admin Officer)               |
|     - Custom letterheads for PNP directorates and regional ITDs                    |
|     - QR-code document verification stamps                                         |
|                                                                                    |
|  5. Real-Time Activity Feeds & Email Alerts                                        |
|     - Automated leave approval email notifications                                 |
|     - Promotion anniversary reminders (30 days prior to eligibility)               |
|     - Webhook support for external ITMS directory sync                             |
+------------------------------------------------------------------------------------+
```

---

## 6. Quality Assurance & Development Protocols

To maintain software quality and avoid regression during ongoing development, all team members and future contributors must adhere to the following protocols:

### 6.1 Pre-Commit & Pre-Merge Quality Gate

Before any branch is merged into `main` or deployed to staging, it must satisfy the **Four Quality Pillars**:

```bash
# 1. Type Check Validation (Zero Errors Permitted)
npx.cmd tsc --noEmit

# 2. Automated Test Suite (100% Passing)
npm.cmd test

# 3. Production Build Compilation (Zero Warnings)
npm.cmd run build

# 4. Git Hygiene Check
git status  # No uncommitted temporary files or test fixtures
```

### 6.2 Database Migration Protocol
1. **Never perform raw DDL edits in production.** All database changes must be written as reversible SQL migration scripts stored under `backend/scripts/`.
2. Scripts must use idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT EXISTS`, `DROP CONSTRAINT IF EXISTS`).
3. Every migration must be tested against a non-production database first, including a verification query confirming table column definitions and RLS policy status.

### 6.3 Environment Variable & Secret Governance
- **Never commit `.env` or `.env.auth` files to git.**
- Maintain updated `.env.example` files demonstrating required configuration keys without sensitive values.
- On Windows development environments, execute npm commands using `npm.cmd` when PowerShell script execution policies restrict `.ps1` loaders.

---

## 7. Operational Runbook: Common Commands

| Operation | Command | Purpose |
|---|---|---|
| **Install Dependencies** | `npm.cmd ci` | Clean, reproducible dependency installation from lockfile |
| **Run Development Server** | `npm.cmd run dev` | Starts Vite frontend at `http://localhost:3000` |
| **Run API Backend** | `npm.cmd run server` | Starts Express REST API at `http://localhost:5000` |
| **Run Automated Tests** | `npm.cmd test` | Executes native Node.js test runner across all test specs |
| **Validate TypeScript** | `npx.cmd tsc --noEmit` | Compiles TypeScript without emitting to check type safety |
| **Build for Production** | `npm.cmd run build` | Compiles optimized, code-split production bundle to `dist/` |
| **Preview Build** | `npm.cmd run preview` | Previews production build locally |
| **Check Backend Health** | `curl http://localhost:5000/api/health` | Inspects API status, authentication, and Supabase connection |

---

## 8. Document Acceptance & Revision History

| Version | Date | Author / Contributor | Description of Changes |
|---|---|---|---|
| **1.0** | July 20, 2026 | ITMS Development Team | Initial Project SDLC & Delivery Plan |
| **1.5** | August 18, 2026 | ITMS Development Team | Mid-Project Documentation & Auth Refinements |
| **2.0** | September 3, 2026 | ITMS System Architecture | Full Codebase Scan, Loose Ends Audit & Master Development Cycle Roadmap |

*This document serves as the governing development manual and technical specification for all subsequent engineering activities on the PNP-ITMS Personnel and Assignment Information System (PAIS 2.0).*
