# In-Depth Repository Review

**Review date:** 2026-09-30  
**Repository:** PNP-ITMS Personnel and Assignment Information System  
**Review type:** Static source/configuration review with local test and package-audit evidence

## Executive summary

The application has a substantial set of domain and utility tests, and its production frontend builds. The current test run also found two TypeScript errors. This review identified several production risks that need owner attention before the system is treated as release-ready:

1. The login page contains hard-coded development credentials in client code.
2. Any authenticated `view_only` user can reach worksheet mutation routes because the central mutation guard explicitly exempts the whole worksheet API. A worksheet edit can update a matching personnel record.
3. Several SQL migration scripts grant broad `anon` and `authenticated` write policies. Their presence is confirmed in source; whether these policies are active in the live Supabase project was not checked.
4. The Excel import UI reports success without calling a commit API; only preview exists in the current route implementation.
5. Order repository operations can fall back to process memory after some Supabase errors and still return successful results.
6. The root dependency tree has four high and four moderate npm audit findings; the backend tree has two moderate findings.

These issues have different verification levels. The code paths and migration definitions are present locally. The deployed Supabase policy state, activity of the bundled accounts, and exploitability of every dependency advisory remain unverified.

## Review method and limits

The review checked the current frontend, Express middleware/routes/controllers, Supabase migration scripts, repository methods, root and backend package manifests/lockfiles, and the latest local verification results. It also ran:

- `npm.cmd audit --omit=dev --audit-level=high` at the repository root.
- `npm.cmd --prefix backend audit --omit=dev --audit-level=high` for the backend lockfile.

The automated test, build, type-check, stress-test, and login walkthrough results are in [AUTOMATED_TEST_REPORT.md](AUTOMATED_TEST_REPORT.md). This review did not connect to the live Supabase database to inspect installed policies or perform CRUD. It did not test with an authorized account or deploy the application. No application source or dependency files were changed to prepare this review.

## Findings at a glance

| Priority | Finding | Evidence status |
| --- | --- | --- |
| **P1 — High** | Development credentials are embedded in the client | Confirmed in source; whether accounts remain active is unknown |
| **P1 — High** | Worksheet writes bypass the admin role check | Confirmed in request middleware and route flow |
| **P1 — High** | SQL migrations define permissive direct-write policies | Confirmed in migration files; live deployment state unknown |
| **P1 — High** | Excel import UI reports success without persistence | Confirmed; no commit route or API call found |
| **P1 — High** | Some order writes silently fall back to volatile memory | Confirmed for specific order repository operations |
| **P1/P2 — High/Moderate** | Root and backend lockfiles contain audited vulnerable versions | Confirmed by current npm audit; runtime reachability varies |
| **P2 — Medium** | Order controllers accept broad request objects | Confirmed; validation blocks some fields/actions but no full field allowlist exists |
| **P2 — Medium** | TypeScript check fails in assignment overview | Confirmed by current `tsc` output |
| **P2 — Medium** | Personnel deletion has no confirmation or visible failure handling | Confirmed in page/context flow |
| **P2 — Medium** | Document metadata and object storage updates are not transactional | Confirmed dual-write behavior; failure outcomes need reconciliation |
| **P2 — Medium** | Token storage and login/error hardening need review | Confirmed localStorage storage and raw auth errors; broader controls not independently tested |
| **P2 — Medium** | Full record collections are fetched without server pagination | Confirmed in current data-loading/repository path |
| **P2 — Medium** | Route, browser, type-check, and CI coverage is incomplete | Confirmed in scripts and test layout |
| **P3 — Low/Medium** | Backend documentation does not match current worksheet API | Confirmed in README versus route/service code |

---

## P1 findings

### 1. Development credentials are shipped in the frontend

**Impact:** Anyone who can load or inspect the client can retrieve the embedded development account values. If either account is active in the deployed Supabase project, this may provide a working privileged login. Password input masking does not protect a secret embedded in JavaScript.

**Evidence:** `src/pages/LoginPage.tsx` defines the `developmentAccounts` array at line 22. The development-access panel renders account choices by default, and selecting one fills both the email and password fields. No development-only build guard is present around the array or panel.

**Unverified:** The review did not attempt either embedded account. It is unknown whether the accounts exist, remain active, or have production privileges.

**Recommended action:** Treat the values as exposed. Confirm account ownership and environment; disable or rotate any account that has ever been deployed. Remove passwords from client source. If shortcuts are needed locally, use a development-only fixture or a server-side test identity that cannot authenticate against production.

### 2. Worksheet mutation routes bypass administrator authorization

**Impact:** A signed-in `view_only` user can send a direct request to worksheet mutation endpoints. The frontend's read-only controls do not protect the API. Some mapped cell edits call `db.updatePersonnel`, so this path can change underlying personnel data as well as the in-memory worksheet override and audit entry.

**Evidence:** `backend/server.js` applies `authenticateRequest` and `requireAdminForMutation` to `/api`. In `backend/middleware/auth.js`, `requireAdminForMutation` allows any request whose base or original URL starts with `/api/worksheets`, without checking the user's role. `backend/routes/worksheetRoutes.js` exposes `PUT /:sheetId/cell` and `POST /:sheetId/batch`; neither adds a stricter route-level role check. `backend/services/worksheetDataService.js` calls `db.updatePersonnel` for cells mapped to personnel fields.

**Recommended action:** Remove the worksheet-path exception from the global mutation guard or add explicit administrator middleware to each mutating route. Keep worksheet reads and import preview available as intended. Add HTTP-level tests proving unauthenticated, `view_only`, admin, and superadmin behavior, including a mapped personnel cell.

### 3. Migration scripts grant broad database write policies

**Impact:** If these policies are applied to production and an untrusted caller has the project URL and anon key, direct Supabase requests can bypass Express role checks. The orders policies allow anon/authenticated reads, inserts, updates, and deletes; assignment and promotion migrations also grant broad writes. Worksheet policies use `FOR ALL` without a role target, which defaults to `PUBLIC`, and include `WITH CHECK (true)`.

**Evidence:**

- `backend/scripts/migrate_orders_phase1.sql` creates read/insert/update/delete policies for `anon, authenticated`; update/delete use unrestricted row predicates, with only required-field checks on some writes.
- `backend/scripts/migrate_pais_2_fields.sql` grants `anon, authenticated` full assignment access with true row checks.
- `backend/scripts/migrate_promotions_table.sql` grants `anon, authenticated` broad update and delete access.
- `backend/scripts/migrate_worksheet_module.sql` creates `FOR ALL` policies with `USING (true)` and `WITH CHECK (true)` in addition to service-role policies.

These scripts often use `IF NOT EXISTS`; rerunning them does not replace a previously created policy with a safer definition. PostgreSQL combines permissive policies with OR semantics, so adding a restrictive policy later does not necessarily neutralize an existing permissive one.

**Unverified:** No live `pg_policies`, table grants, exposed keys, or deployed schema was inspected. This is a confirmed migration risk, not a claim about the current production database state.

**Recommended action:** Audit the live policies and grants table by table. Drop broad legacy policies, limit direct access to the minimum required roles, and prefer service-role-only database writes through the authenticated backend. Add deployment verification SQL and role tests to the release checklist.

### 4. Excel import UI reports success without committing records

**Impact:** An operator can select a workbook, review a preview, click Import, and receive a success message even though no rows were written. This risks silent data loss and misleading operational records.

**Evidence:** `src/components/spreadsheet/ExcelImportModal.tsx` calls `smartPreviewExcelImportApi` during file selection. `handleCommitImport` only builds a success string from preview counts, waits, calls the success callback, and closes; it does not call a persistence function. `src/services/api.ts` defines the preview request only. `backend/routes/worksheetRoutes.js` implements `POST /import/preview` but has no commit route. In contrast, `backend/README.md` documents `import-preview` and `import-commit`, using paths that do not match the implemented preview route.

**Recommended action:** Until persistence is implemented, disable the Import action or relabel it as preview-only. For a real import, revalidate on the server at commit time, perform a transactional/upsert write, return actual created/updated/rejected counts, and show success only after the server confirms persistence. Add route and UI tests that read the records back after import.

### 5. Some order operations return volatile-memory success after Supabase errors

**Impact:** When the repository considers Supabase connected but a database read/insert/update/delete in these methods returns an error, the order may be served or mutated in the process-local arrays instead. The API can return success for those fallback create/update/delete operations while the change is absent from PostgreSQL and will disappear on process restart. Reads can mix database and fallback-memory state. Order-number sequence generation can still throw before the insert fallback is reached.

**Evidence:** In `backend/store/repository.js`, `getOrders`, `getOrderById`, `createOrder`, `updateOrder`, and `deleteOrder` catch database errors and then use `inMemoryOrders`. Create/update/delete methods can return the in-memory result as normal. This finding is specific to these order paths; other repository methods, including personnel writes, generally throw on Supabase write errors. `/api/health` always sets the API-level `status` to `online` but separately includes an `activeAdapter`/Supabase status. Clients that only inspect `status` can mistake a reachable API for persistent storage availability.

**Recommended action:** Fail writes when the configured primary database returns an error. Use explicit offline mode only when no database is configured, return a clear degraded health state, and prevent clients from showing durable-save success for volatile writes. Add tests for Supabase insert/update/delete failures and verify both HTTP status and post-restart persistence behavior.

### 6. Dependency audit reports vulnerable package versions

The current audits produced:

| Lockfile | Audit result | Main affected paths |
| --- | --- | --- |
| Root | 8 findings: 4 high, 4 moderate | `multer@2.0.2`, `react-router@7.18.1`, `nanoid@3.3.16` through PostCSS, `postcss@8.5.22`, `qs@6.15.3`, and `uuid@8.3.2` through ExcelJS |
| Backend | 2 moderate findings | `uuid` through ExcelJS; no high-severity finding was reported by this audit command |

The audit maps Multer to multiple upload denial-of-service advisories. React Router's reported high advisory concerns RSC mode; the current Vite SPA configuration does not show RSC mode enabled. PostCSS and nested nanoid are in the Vite build-tool dependency path. UUID's affected API usage inside ExcelJS was not established. These qualifications affect reachability, not the package-version audit result.

The root audit offers `npm audit fix` for several issues. Its forced UUID fix proposes downgrading ExcelJS to 3.4.0, which can be breaking. Do not run that forced change without checking supported versions and rerunning document/spreadsheet tests. Review the two package lockfiles independently because root and backend dependency trees differ.

**Recommended action:** Upgrade vulnerable packages to patched compatible versions, test upload/document/routing/spreadsheet flows, and add both lockfiles to scheduled CI audit. Record any advisory accepted as not reachable with the technical reason and revisit after dependency changes.

---

## P2 findings

### 7. Order controllers accept broad request objects

**Impact:** Admin users can submit fields beyond the intended editable order form. The repository spreads those properties into records; fields such as `id`, `isDeleted`, `deletedAt`, document metadata, or existing audit properties are not all explicitly rejected. Some sensitive transitions are protected in the repository, but that is not a complete field allowlist.

**Evidence:** `backend/controllers/ordersController.js` spreads `req.body` into the objects passed to `db.createOrder` and `db.updateOrder`. `backend/store/repository.js` then spreads create data into the new record and update data into the existing record. `createdBy` and `updatedBy` are overwritten server-side, and status/order-number checks exist, but other server-managed properties can still pass through.

**Recommended action:** Validate create and update bodies against separate schemas with explicit editable fields. Reject unknown/server-owned keys and derive IDs, audit fields, deletion state, and document metadata only on the server. Test attempts to set protected properties.

### 8. TypeScript's strict check fails while the bundle build passes

**Impact:** The current `npm run build` can succeed while type errors remain. This weakens the value of build-only release checks and can hide future regressions.

**Evidence:** `npx.cmd tsc --noEmit` reports two errors at `src/components/assignments/AssignmentOverview.tsx:225`. The heterogeneous array is inferred as broad unions; `Icon` can be a string or number as well as a component, while `value` can be inferred as a component. Both are rendered as JSX content.

**Recommended action:** Represent metrics as explicitly typed objects or define a tuple type such as label/value/icon with a Lucide component type. Add a `typecheck` package script and run it alongside tests and the build in CI.

### 9. Personnel deletion is immediate and failure feedback is missing

**Impact:** A single menu action triggers a destructive deletion without confirmation. The click handler does not await or catch the returned promise. `deletePersonnel` calls the API before changing local state, so a failed request leaves the record in place but does not show a user-facing error; the rejection may become unhandled.

**Evidence:** `src/pages/PersonnelPage.tsx` invokes `deletePersonnel(person.id)` directly in the row action menu. `src/context/AuthRoleContext.tsx` awaits `deletePersonnelApi` and only then removes the record; there is no catch or rollback UI around that call.

**Recommended action:** Add a confirmation dialog that identifies the selected person, await the mutation, disable repeat submission, and show success/failure feedback. If deletion has linked records, explain the repository's handling before confirmation.

### 10. Order document metadata and object storage are separate writes

**Impact:** Uploading a file and updating its order row cannot be atomic across object storage and Supabase. The code tries to clean up failed uploads and old versions, but cleanup failures are swallowed. A failed old-file deletion can leave orphaned storage; an ambiguous database timeout during metadata attachment can also leave storage and metadata disagreeing.

**Evidence:** `backend/controllers/ordersController.js` uploads the new document, updates order metadata, then removes the old object. Both cleanup paths use `.catch(() => {})`; the old-object deletion failure does not remove the newly uploaded file. This corrects the earlier review wording, which incorrectly attributed new-file deletion to failure of old-file cleanup.

**Recommended action:** Keep the current safe ordering, but log and track cleanup failures. Add an idempotent reconciliation job for metadata pointing to missing files and unreferenced objects. Test upload success, metadata failure, old-file cleanup failure, retry, and ambiguous timeout behavior.

### 11. Authentication needs additional defense-in-depth review

**Impact:** The browser stores the access token in `localStorage`, where injected same-origin JavaScript can read it. The Express code has no visible app-level login rate limiter, and login/global error responses return provider or internal error messages. CORS accepts any origin ending in `.vercel.app`; this is broader than a fixed production allowlist.

**Evidence:** `src/services/api.ts` reads/writes `pais.auth.token` using `window.localStorage`. `backend/server.js` reflects matching `.vercel.app` origins and returns `error.message` from login and global errors. No rate-limit middleware is configured in the server or package manifest reviewed.

**Qualification:** Supabase may apply its own authentication throttling, which was not checked. The broad CORS rule alone does not give another origin access to a user's localStorage token; bearer authorization remains relevant. Treat these as defense-in-depth concerns, not a demonstrated account-takeover path.

**Recommended action:** Assess secure HttpOnly cookie/session options or short-lived tokens, add explicit login throttling and monitoring, keep detailed exceptions in server logs while returning stable public messages, and restrict production CORS to controlled origins.

### 12. Initial authenticated loading fetches full collections

**Impact:** After authentication, the context requests personnel, orders, assignments, education, promotions, training, leave, and awards together. Repository list methods commonly use `select('*')` without a server-side limit; page-level pagination therefore does not bound API payload size or initial memory use.

**Evidence:** `src/context/AuthRoleContext.tsx` calls all collection fetches in one `Promise.all`. Repository list methods return all matching rows unless specific filters apply.

**Recommended action:** Add server-side pagination, sorting, filtering, and limits. Load dashboard summaries first and fetch detailed modules on navigation. Define and measure realistic record-volume targets before release.

### 13. Test coverage and CI checks do not cover key release risks

**Impact:** The 108 passing tests are useful but do not exercise several high-risk boundaries. `npm test` does not run TypeScript checking, and no `.github` CI workflow or root lint/typecheck script was found. The standalone `backend/scripts/test_api.js` is a console smoke script, not an assertion-based route suite.

**Gaps confirmed in the reviewed tree:**

- Authenticated HTTP tests for `view_only`, admin, and superadmin routes.
- Tests proving Excel imports persist data and report failures honestly.
- Tests for order storage/database failure paths and personnel-delete UI errors.
- Browser coverage beyond the login walkthrough recorded in the test report.
- Automated type-checking, linting, and CI enforcement.

**Recommended action:** Add route integration tests using isolated fake services or a disposable Supabase project. Add browser tests for login, personnel/assignment lifecycle, orders/documents, imports, permissions, and error states. Make tests, typecheck, build, and dependency audit CI gates.

### 14. Backend API documentation does not match current worksheet behavior

**Impact:** Operators and developers may call nonexistent endpoints or rely on an inaccurate worksheet count.

**Evidence:** `backend/README.md` describes five worksheets and documents `/api/worksheets/import-preview` and `/api/worksheets/import-commit`. The current route is `POST /api/worksheets/import/preview`; no commit route exists. The worksheet service/test suite loads and verifies 13 worksheets.

**Recommended action:** Update the README to match implemented behavior and clearly label preview-only import. Keep API docs generated or add an OpenAPI source and a test that checks documented routes against registered routes.

---

## Recommended remediation order

1. Remove/revoke the development credentials and validate that no deployed account remains active.
2. Close worksheet role bypass and verify live RLS policies before exposing production data.
3. Correct the Excel import success path and the volatile order-write fallback.
4. Add field allowlists to order writes and protect personnel deletion with confirmation/error handling.
5. Resolve the TypeScript errors and upgrade vulnerable package paths with compatibility testing.
6. Add route/browser/CI coverage, then address document reconciliation, pagination, auth hardening, and README drift.

## Review status

This document records findings and recommendations; it does not mark them fixed. Live database policy state, account validity, production CORS configuration, and deployment runtime settings remain to be verified by the system owner.
