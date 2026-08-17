# PNP-ITMS Personnel and Assignment Information System

This repository contains the React/Vite frontend and Express/Supabase backend for the Personnel Management Information System.

## Local setup

1. Install dependencies with `npm install`.
2. Copy `backend/.env.example` to `backend/.env`.
3. Configure the Supabase URL/key and list administrator emails in `AUTH_ADMIN_EMAILS`. Accounts and passwords are managed by Supabase Auth and must not be committed.
4. Start the API with `npm run server`.
5. In another terminal, start the frontend with `npm run dev`.
6. Open `http://localhost:3000` and sign in with a configured account.

## Verification

- `npm test` runs schema, import, authentication, and time-in-grade tests.
- `npm run build` creates the production frontend.
- `GET /api/health` reports API, authentication-configuration, and database status without requiring a session.

## Access control

- Administrators can create, update, and delete records.
- View-only accounts can read records and generate reports but cannot mutate data.
- The API validates Supabase access tokens and enforces administrator permission for every non-read request.

## Deployment checklist

1. Use HTTPS and a reverse proxy in front of the frontend and API.
2. Set a production `CORS_ORIGIN`; never use a wildcard origin.
3. Create user accounts through Supabase Auth, require email confirmation, and review the administrator email allowlist.
4. Configure Supabase Row Level Security and use the least-privileged server key available for the required operations.
5. Run `npm test` and `npm run build` before release.
6. Back up all Supabase tables before migration or release; test restoration in a non-production environment.
7. Confirm login, permissions, personnel linking, orders/awards, leave calendar, reports, templates, printing, and PDF export through user acceptance testing.
8. Monitor API errors and database availability after deployment.

## Backup and recovery

Use Supabase-managed backups or `pg_dump` according to the organization’s database policy. Record the backup time, operator, database version, and restoration test result. Never use the repository purge scripts against production data. Recovery should restore into a separate environment first, verify record counts and linked personnel records, and only then be promoted to production.

## User workflow

Sign in → Dashboard → Select a module → Search/select personnel → View, add, or edit information → Save → Generate a report/document → Print or export PDF. Use the profile tabs to review records linked to one personnel member. Sign out from the sidebar when work is complete.

Detailed project plans are available in [PROJECT_IMPLEMENTATION_UIUX_SDLC_PLAN.md](./PROJECT_IMPLEMENTATION_UIUX_SDLC_PLAN.md). The completion audit is in [SDLC_COMPLETION_AUDIT.md](./SDLC_COMPLETION_AUDIT.md).

The consolidated August 18, 2026 change log, revised plans, verification results, and updated eight-week timeline are in [UPDATED_IMPLEMENTATION_UIUX_SDLC_DOCUMENTATION_2026-08-18.md](./UPDATED_IMPLEMENTATION_UIUX_SDLC_DOCUMENTATION_2026-08-18.md).
