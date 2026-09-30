# Automated and Interactive Test Report

**Project:** PNP-ITMS Personnel and Assignment Information System  
**Run date:** 2026-09-30  
**Environment:** Windows, Node.js v24.13.1, npm 11.19.0  
**Report scope:** Local automated checks, targeted stress tests, package audit, and an unauthenticated browser walkthrough.

## Executive summary

The repository's 108-test suite, targeted stress suite, production build, local API smoke checks, and unauthenticated login-page walkthrough passed. The standalone TypeScript check failed with two `TS2322` errors in the assignment overview. The build also reported a 542 kB minified Excel integration chunk.

This run did not validate successful sign-in, authenticated business workflows, live Supabase CRUD, or deployment behavior. The stress tests exercise in-memory repository logic, not HTTP throughput or database capacity. A separate package audit found vulnerable dependency versions; the findings are detailed below.

## Results

| Check | Result | Evidence and interpretation |
| --- | --- | --- |
| `npm.cmd test` | **Passed** | 108 passed; 0 failed, skipped, cancelled, or todo. Duration: 53.6 seconds. |
| `node.exe --test --test-reporter=spec test/ordersAndAssignmentsStress.test.js` | **Passed** | 4 of 4 stress cases passed. Runner duration: 1.05 seconds. Workload and limitations are listed in [Stress-test detail](#stress-test-detail). |
| `npm.cmd run build` | **Passed with warning** | Vite transformed 2,634 modules and completed the production build. The Excel integration chunk is about 542 kB minified, above Vite's 500 kB warning threshold. |
| `npx.cmd tsc --noEmit` | **Failed** | Two `TS2322` errors on line 225 of `src/components/assignments/AssignmentOverview.tsx` (columns 232 and 323). The inferred metric tuple lets `Icon` be a string, number, or component and `value` be a component; those types are not valid React children. |
| Local API smoke check | **Passed** | `/api/health` returned `online` with authentication unconfigured, `/ping` returned `awake`, and unauthenticated `GET /api/personnel` returned HTTP 401. This checked startup, public health routes, and the auth gate only. |
| Interactive browser walkthrough | **Passed for login page** | Login controls, theme state, error feedback, and 390 px layout checks passed in headless Edge. Authenticated pages were not entered. |
| Root production dependency audit | **Findings** | `npm.cmd audit --omit=dev --audit-level=high` reported 8 vulnerabilities: 4 high and 4 moderate. See [Dependency audit](#dependency-audit). |
| Backend production dependency audit | **Findings** | `npm.cmd --prefix backend audit --omit=dev --audit-level=high` reported 2 moderate `uuid` findings through `exceljs`; no high findings were reported for this lockfile. |

## Automated suite coverage

`npm.cmd test` runs Node's built-in test runner against the root `test/` directory. The passing tests cover assignment and order workflows, cross-module links, rank/category rules, personnel import parsing and schemas, personnel counting/display, leave types, promotion synchronization, document generation/storage contracts, and worksheet formulas, exports, and audit behavior.

Most checks exercise utility functions or repository logic in-process. Passing this suite is evidence for those tested cases; it is not evidence that every Express route, authorization combination, browser journey, or live database policy works end to end.

## Stress-test detail

The dedicated stress suite lives in `test/ordersAndAssignmentsStress.test.js` and completed these cases:

| Case | Executed workload | Observed case time | Assertion limits and notes |
| --- | --- | ---: | --- |
| Assignment scaling | 1,000 sequential assignment creates across 100 personnel; then verifies record count and unique IDs. | 70 ms | The three create batches must remain below 2 s, 5 s, and 8 s respectively. |
| Order scaling | 500 sequential order creates across 20 personnel; then verifies unique order numbers. | 77 ms | The test title mentions 1,000 orders, but the implementation creates 100 plus 400, for 500 total. Each batch has a 3 s / 6 s limit. |
| DOCX generation | Generates orders involving 1, 5, 20, and 50 personnel. | 501 ms | Each generated file must exceed 2,000 bytes, include a SHA-256 source hash and the correct personnel count, and complete within 2.5 s. |
| Concurrent repository operations | 200 promises: 50 assignment creates, 50 order creates, 50 assignment reads, and 50 personnel reads. | 18 ms | Confirms all resolve and the personnel record remains readable. It does not assert behavior across multiple server processes or database transactions. |

The timings are from a local Node run and should be treated as a small synthetic baseline, not a capacity estimate. The repository is in-memory during these tests; there was no concurrent traffic against Express, Supabase, object storage, or a production-like dataset.

## Local API smoke check

The health/auth check used an isolated server process with Supabase configuration blank and verified three routes:

1. `GET /api/health` returned `status: online` and reported authentication unconfigured.
2. `GET /ping` returned `status: awake`.
3. `GET /api/personnel` without a bearer token returned HTTP 401.

The health route is intentionally public. The domain route's 401 confirms the request reached the auth middleware; it does not test token validation, role resolution, or role-specific write permissions.

## Interactive browser walkthrough

The login screen was opened in headless Edge at desktop size and at a 390 × 844 mobile viewport. Browser interactions checked:

- Login heading and email/password controls render; submit starts disabled while the fields are empty.
- Theme toggles light → dark → light and updates the document theme state.
- Development-account panel collapses and expands and displays two choices.
- Password visibility toggles between masked and visible for a synthetic test value.
- A rejected sign-in is shown in the page's accessible alert region.
- The login heading remains visible at 390 px width with no horizontal document overflow.
- No uncaught browser JavaScript exceptions were observed during those interactions.

The completed walkthrough used a loopback-only dummy Supabase URL and dummy keys so it could not reach an external service. An earlier attempt used blank environment variables; the backend loaded values from the local `.env`, and one synthetic invalid login reached configured auth and was rejected. No data-changing API request was made during that attempt; the auth service may have logged the rejected attempt. No credentials are reproduced in this report.

### Security observation

The development-access panel is available in the login page and its account credential values are hard-coded in `src/pages/LoginPage.tsx` at line 22. Client-side source and bundles are inspectable, and hiding a password in an input does not protect a value embedded in JavaScript. Whether the accounts still work in a deployed environment was not tested. Treat them as exposed: confirm they are non-production and inactive, rotate them if they were ever deployed, and remove the credentials from production client code.

### Uncovered manual workflows

No authorized test session was available, so the walkthrough did not enter the dashboard or exercise personnel, assignments, orders, education, promotions, leave, reports, Excel editing/import, file upload, role-specific access, or sign-out. The login-page result must not be read as an end-to-end system pass.

## Dependency audit

The root lockfile audit reported these affected dependency paths and installed versions:

| Package path | Installed version | Audit severity | Context |
| --- | ---: | --- | --- |
| `multer` | 2.0.2 | High | Multiple upload denial-of-service advisories, including malformed multipart fields and resource exhaustion. The API uses Multer for uploaded files; authentication and upload limits reduce some exposure but do not remove the vulnerable package path. |
| `react-router` via `react-router-dom` | 7.18.1 | High | The reported advisory concerns React Router's RSC mode. This repository's Vite SPA configuration does not show RSC mode enabled, so direct reachability was not demonstrated. |
| `nanoid` via `postcss` | 3.3.16 | High | Transitive build-tool dependency; the separate `nanoid` 5.x under `docx` is not the flagged version. |
| `postcss` via Vite | 8.5.22 | Moderate | Advisory relates to source-map processing. Whether the vulnerable path is reachable in this production setup was not tested. |
| `qs` via Express/body-parser | 6.15.3 | Moderate | Audit reports parsing-related denial-of-service conditions; request reachability and configuration-specific impact were not tested. |
| `uuid` via ExcelJS | 8.3.2 | Moderate | Audit reports a buffer-bounds issue for certain UUID APIs. Usage reachability in ExcelJS was not established. |

The root audit reports a compatible `npm audit fix` path for several findings, but its forced remedy for `uuid` proposes downgrading ExcelJS to 3.4.0. Do not apply that forced downgrade without compatibility review. The backend lockfile audit independently reported the two moderate `uuid` advisories only. Audit output identifies affected versions; it does not prove exploitability of each code path.

## Release-relevant follow-up

1. Remove or safely isolate the hard-coded development credentials and verify the associated accounts are inactive outside development.
2. Fix the worksheet write authorization gap and verify equivalent database-level access policies.
3. Make Excel import commit persist server-side before the UI reports success.
4. Resolve the assignment overview type errors and add a type-check command to release/CI checks.
5. Review dependency updates without applying the breaking ExcelJS downgrade suggested by `npm audit --force`.
6. Add authenticated route and browser tests before treating personnel, order, document, or role-based workflows as verified.

## Execution notes

- PowerShell blocked the `npm.ps1`/`npx.ps1` launchers under its local script policy. The same checks ran through `npm.cmd` and `npx.cmd`; no execution policy was changed.
- Vite's build is a transpile/bundle check and does not run TypeScript's semantic type checker.
- No application source or dependency files were changed. The two Markdown reports were expanded while preparing this in-depth report set.
