# Changes Since September 17, 2026

## Summary

Yesterday’s work was committed as `91a0e7a` (`overhaulv1`). It adds the first major Excel integration and promotion-evaluation workflows, expands disposition reporting, adds assignment geography, improves automatic data refresh, and adds supporting database migrations and tests.

## Excel integration

- Added a versioned Excel template registry for training imports, education imports, personnel disposition reports, rank statistics, and PCO/PNCO promotion workbooks.
- Added ExcelJS-based workbook export with protected/generated fields, PAIS metadata, source snapshots, report sheets, and preview support.
- Added `.xlsx` upload preview and validation without database writes.
- Added a two-step import flow: preview first, then explicitly commit a valid, unexpired preview.
- Added personnel ID/badge matching, required-field checks, date/year validation, duplicate/change detection, stale-export warnings, file hashing, and import audit history.
- Added role metadata distinguishing read access from management access and locked calculated/identity fields.
- Added the Excel Integration Workspace page and `/excel-integration` route for template listing, workbook preview/download, uploads, validation results, and import history.
- Added backend endpoints:
  - `GET /api/excel/templates`
  - `GET /api/excel/templates/:templateId`
  - `GET /api/excel/templates/:templateId/preview`
  - `GET /api/excel/templates/:templateId/export`
  - `POST /api/excel/import/preview`
  - `POST /api/excel/import/commit`
  - `GET /api/excel/import/history`
- Added `exceljs` and `multer` dependencies. Uploads are memory-backed, limited to one `.xlsx` file and 10 MB.

## Disposition and authorized strength

- Added disposition statistics calculated from current personnel records, including totals by unit, rank, and unit/rank combination.
- Added separately controlled authorized-strength records so authorized counts do not replace PAIS-derived actual strength.
- Added authorized-strength read and administrator upsert endpoints under `/api/disposition`.
- Added the `authorized_strengths` database migration with uniqueness, date lookup, validation, and service-role RLS policy.
- Added documentation for the new backend endpoints and required migrations.

## Promotion evaluations

- Added server-side promotion evaluation previews using PAIS-derived evidence.
- Added factor/source tracking, warnings for missing or conflicting data, evaluation dates, status workflow (`Draft`, `For Review`, `Approved`, `Rejected`), remarks, and saved evaluation snapshots.
- Added separate handling for externally supplied factors such as interview rating, service reputation, and other qualifications.
- Added PCO and PNCO template mappings, maxima, and promotion-workbook sheet definitions.
- Added the Promotion Evaluation page and `/promotion-evaluation` route, including recalculation, factor review, external inputs, save, and status updates.
- Added promotion evaluation API endpoints:
  - `GET /api/promotion-evaluations/preview/:personnelId`
  - `GET /api/promotion-evaluations`
  - `POST /api/promotion-evaluations`
  - `PUT /api/promotion-evaluations/:id`
- Added the `promotion_evaluations` database migration and repository persistence.
- Promotion point formulas remain intentionally unmapped/pending approval of the governing scoring worksheet or policy.

## Assignments and diversity data

- Added an optional geographic region field to assignments (`Luzon`, `Visayas`, or `Mindanao`).
- Updated assignment create/edit/reset behavior and the assignment form to capture the region.
- Added the `assignments.region` database migration and index.
- Added region-aware diversity-of-assignment inputs to promotion calculations and warnings for missing or invalid assignment data.

## Frontend and data refresh

- Added lazy-loaded routes, navigation entries, page titles, API methods, and TypeScript types for Excel integration and promotion evaluations.
- Improved authenticated data refresh with:
  - 30-second refresh scheduling;
  - exponential backoff up to five minutes after failures;
  - refresh suppression while the browser tab is hidden;
  - refresh on tab visibility return;
  - protection against overlapping refresh requests;
  - explicit manual refresh handling.
- Added promotion evaluation and Excel-related API response types.
- Preserved and extended education export/personnel CSV behavior to accommodate the new data model.

## Backend and repository support

- Registered the new disposition, promotion-evaluation, Excel-template, and Excel-import routes in the server.
- Extended the repository with in-memory fallback stores and Supabase persistence for authorized strength, promotion evaluations, and Excel import audits.
- Added SQL migrations for:
  - assignment regions;
  - authorized strength;
  - Excel import audits;
  - promotion evaluation snapshots.
- Added implementation-plan and requirements documents covering Excel integration, the implementation cycle, and promotion/disposition requirements.
- Added `.gitignore` entries associated with the new workflow.
- Changed the Vite API proxy target from `localhost` to `127.0.0.1` to avoid Windows IPv4/IPv6 restart connection issues.

## Tests and verification

- Added tests for Excel export, import preview, template registry, and promotion evaluation behavior.
- Verification completed on September 18, 2026:
  - `npm.cmd test` — 75 tests passed, 0 failed.
  - `npm.cmd run build` — production build succeeded.

## Files added or changed

The commit changed 41 files, with 3,773 additions and 31 deletions. The main additions/updates are:

- Documentation: `EXCEL_INTEGRATION_IMPLEMENTATION_PLAN.md`, `EXCEL_WORKSPACE_IMPLEMENTATION_CYCLE.md`, `INTERVIEW_FUNCTIONAL_REQUIREMENTS_PROMOTION_DISPOSITION.md`, `backend/README.md`.
- Backend: Excel controllers/routes/services, promotion-evaluation controller/service/route, disposition routes, repository changes, server route registration, and four SQL migrations.
- Frontend: `ExcelIntegrationPage.tsx`, `PromotionEvaluationPage.tsx`, routing/navigation/header changes, assignment region support, auth refresh changes, API methods, types, and export utility updates.
- Tests: `test/excelExport.test.js`, `test/excelImport.test.js`, `test/excelTemplateRegistry.test.js`, `test/promotionEvaluation.test.js`.
- Configuration/dependencies: `.gitignore`, `package.json`, `package-lock.json`, and `vite.config.ts`.
