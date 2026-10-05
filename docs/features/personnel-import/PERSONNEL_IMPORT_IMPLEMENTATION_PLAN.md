# Personnel Excel Import Implementation Plan

## Purpose

Update bulk personnel uploads to recognize the headers in [List for OJT Project.xlsx](../../reference-materials/personnel-import/List%20for%20OJT%20Project.xlsx), persist the fields that are not currently supported, and preserve correct behavior across personnel, assignment, dashboard, reporting, export, and related modules.

This document describes the implementation plan. It does not apply the migration or change application code.

## Findings from the sample and current implementation

- The sample's first worksheet is `AlphalistReport_CompleteGenInfo`.
- Its personnel header row is Excel row 8; records begin on row 9. The current parser scans the first 30 rows, so it can find this header row.
- The sample contains 585 data rows. Several contact and identifier columns are blank in this workbook, so populated-value validation also needs synthetic fixtures.
- The sample has merged header groups for Link, Last Name, and Designation. The parser should treat merged ranges as one logical header and avoid reporting merged continuation cells as duplicate columns.
- The current header alias table maps both `Unit` and `Sub Unit` to `sub_unit`. Since `Unit` occurs first in the sample, it wins the duplicate-field check and the actual `Sub Unit` value is ignored. These fields must map separately.
- Some requested headers are not currently recognized, and the backend sanitizer only accepts its explicit allowlist. Adding parser aliases alone would not persist new fields.
- The personnel repository currently selects all columns for general personnel reads. All authenticated roles can read personnel, while only admins can mutate it. New government and account identifiers must not be added to the general personnel response.
- The backend prefers a Supabase service-role credential but can fall back to the anon key. Private-identifier operations must explicitly require the service-role credential and fail closed if it is unavailable.

## Field contract

### Header-to-field mapping

| Workbook header | Handling | Target |
|---|---|---|
| Link | Ignore for this import. The sample's merged Link cells contain no personnel values. | — |
| Account Number | Store as sensitive text to preserve leading zeros and formatting. | `personnel_private.accountNumber` |
| Rank | Existing field. | `rank` |
| Last Name | Existing field; merged cells represent one logical column. | `lastName` |
| First Name | Existing field. | `firstName` |
| Middle Name | Existing field. | `middleName` |
| Qual | Existing field. | `qualifier` |
| Badge Number | Existing field. | `badgeNo` |
| BirthDate | Existing field. | `birthday` |
| Date Entered Service | Existing field; add this exact alias. | `dateOfEntry` |
| Designation | Existing field; merged cells represent one logical column. | `designation` |
| Designation Date | Existing field. | `designationDate` |
| Last Promotion Date | Existing field. | `lastPromotionDate` |
| Source Of Commissionship | New personnel field. | `sourceOfCommissionship` |
| Date Of Officership Or Commission | Existing field; add this exact alias. | `enterInOfficerPositionDate` |
| PStatus | Preserve separately from the app's operational Duty Status. | `pStatus` |
| PStatus Date | New personnel field. | `pStatusDate` |
| Rank Status | New personnel field. | `rankStatus` |
| Unit | New text field. It is distinct from the PAIS unit category. | `unit` |
| Sub Unit | Keep the first value in the legacy field and all values in the new collection. | `sub_unit` and `subUnits` |
| Station | Existing field. | `station` |
| Gender | Existing field. | `gender` |
| Civil Status | New personnel field. | `civilStatus` |
| Religion | New personnel field. | `religion` |
| Email | New personnel contact field; never use it as an application login account. | `email` |
| Phone Number | Existing field. | `contactNumber` |
| TIN | Store as sensitive text. | `personnel_private.tin` |
| Gsis Number | Store as sensitive text. | `personnel_private.gsisNumber` |
| Phil Health No | Store as sensitive text. | `personnel_private.philHealthNo` |
| Pagibig No | Store as sensitive text. | `personnel_private.pagibigNo` |
| Address | Existing field. | `address` |

### Data rules

- Continue requiring Rank, First Name, and Last Name. Keep other fields optional unless a later business rule says otherwise.
- Keep `status` as the application's operational duty status. Import the workbook's PStatus verbatim into `pStatus`; do not silently map it to `Active`, `On Leave`, or another application status.
- Store dates in the existing ISO `YYYY-MM-DD` string format used by personnel date fields. Validate Excel dates and supported text date formats before import.
- Treat account and government identifiers as strings. Do not parse them as numbers, strip leading zeros, or apply numeric formatting.
- Store all imported Sub Unit values in `subUnits: string[]`. Keep the first value in `sub_unit` as the legacy/primary value so existing code continues to work during rollout.
- Auto-split clear separators such as semicolons, pipes, and line breaks. In the preview, require the uploader to choose whether comma or slash is a separator. Do not silently split slash values because the sample contains slash-containing Sub Unit cells.
- Imported Sub Unit affiliations are not formal assignment history. Do not create `AssignmentRecord` rows from these values; the workbook lacks per-assignment dates and position details.

## Database and API design

### Personnel table

Add these nullable text columns to `public.personnel`:

- `unit`
- `sourceOfCommissionship`
- `pStatus`
- `pStatusDate`
- `rankStatus`
- `civilStatus`
- `religion`
- `email`

Add `subUnits TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[]`. Backfill existing records with their current `sub_unit` value when `subUnits` is empty. Preserve the existing `sub_unit` column and its meaning as the legacy primary value.

Use text for date additions for consistency with the existing personnel schema; the application validates and normalizes date values to ISO strings.

### Private identifier table

Create `public.personnel_private` with one row per personnel record and these text columns:

- `accountNumber`
- `tin`
- `gsisNumber`
- `philHealthNo`
- `pagibigNo`

Use `personnelId` as the primary key and, after verifying the deployed `personnel.id` type and key constraint, add a foreign key with `ON DELETE CASCADE`. Do not add uniqueness constraints to the identifiers until existing data has been reviewed.

Enable RLS on `personnel_private`, deny direct access to `anon` and `authenticated`, and grant database access only to the backend service role. Add an admin/superadmin-only API endpoint for reading and editing these identifiers. The general personnel list and record endpoints must not include them. Require `SUPABASE_SERVICE_ROLE_KEY` for private-table operations and return a clear service-unavailable response if it is not configured.

### Transactional bulk import

The current frontend sends personnel imports in 250-row requests, while the sample has 585 rows. For this import flow:

1. Raise the personnel bulk request cap to 1,000 rows.
2. Keep the existing 5 MB Express JSON body limit and reject an upload whose serialized request exceeds it.
3. Add a service-role-only PostgreSQL function that inserts the accepted personnel records and their private identifiers in one transaction.
4. Have the bulk endpoint call this function once for the accepted rows. If the database write fails, neither the personnel rows nor their private identifier rows should be left partially inserted.
5. Keep row-level parsing and validation errors in the import response; invalid rows are excluded from the transactional insert and reported with their original worksheet row numbers.

### Migration file

Add an idempotent migration such as `backend/scripts/migrate_personnel_import_v1.sql`. It should:

1. Add the personnel columns and `subUnits` array.
2. Backfill `subUnits` from existing `sub_unit` values without overwriting non-empty arrays.
3. Create and secure `personnel_private`.
4. Create the transactional import function and restrict its execute privilege to the service role.
5. Add a GIN index on `subUnits` if the API performs database-side array filtering.
6. Include verification queries for columns, indexes, RLS state, grants, and function privileges.

Do not alter assignments, orders, promotion, education, training, or leave table schemas for this import. Review deployed `pg_policies` before rollout; the repository does not include a personnel RLS migration, so deployed policy state must be verified rather than assumed.

## Application module impact

| Module | Required updates |
|---|---|
| Import parser and modal | Add exact aliases in `src/utils/personnelCsv.ts`; keep XLSX row detection and date handling correct in `src/utils/personnelXlsx.ts`; update `BulkImportModal.tsx` to preview mappings, ignored columns, private fields, and Sub Unit splitting. |
| Shared types and backend schema | Extend `src/types/pais.ts`, the frontend and backend import allowlists, backend sanitization, controller validation, and repository persistence. Keep frontend/backend allowlists aligned. |
| Personnel directory and profile | Update `PersonnelPage.tsx`, `PersonnelInfoTab.tsx`, and `PersonnelSummaryCard.tsx` to display and edit the new roster fields. Add an admin-only private identifier section loaded through the restricted API. |
| Directory search and filters | Search/filter by `unit` independently from `unitCategory`; match a selected Sub Unit against any value in `subUnits`. Retain `sub_unit`/`division` fallback for older records. |
| Dashboard and personnel counting | Update `DashboardPage.tsx`, `AutomatedPersonnelCounter.tsx`, and `personnelCounting.ts`. Total headcount counts each person once. Per-subunit breakdowns count each person once in each listed Sub Unit, so category subtotals can exceed the unique total. Keep active counts based on operational `status`, not `pStatus`. |
| Assignments | Update Sub Unit options and personnel matching in `AssignmentPage.tsx`, `AssignmentOverview.tsx`, and `AssignmentsSubTab.tsx`. Keep each dated assignment record limited to its existing single Sub Unit. Preserve imported `subUnits` when assignment synchronization updates the legacy primary `sub_unit`. |
| Reports and promotions | Update `ReportsPage.tsx` and `PromotionPage.tsx` filters/grouping to recognize all Sub Units and expose source `unit` separately where useful. Leave promotion eligibility based on the existing `lastPromotionDate` behavior. |
| Orders, leave, education, and training | Keep selectors based on personnel IDs/names and avoid fetching private identifiers. Update only labels or subunit matching where these modules currently display personnel subunit information. |
| Personnel exports | Update `src/utils/personnelExport.ts` to represent multiple Sub Units and source Unit where appropriate. Do not include the new government/account identifiers in standard CSV/PDF exports. |
| Worksheet integration | Review `backend/services/worksheetDataService.js` mappings that display personnel Unit or Sub Unit. Update roster output where applicable; worksheet definitions and unrelated worksheet schemas do not change. |

## Execution sequence

### Phase 1 — Finalize and encode the field contract

- Add a shared, explicit mapping for every listed header.
- Remove the incorrect `unit -> sub_unit` alias while retaining legitimate legacy aliases such as `division -> sub_unit`.
- Ensure duplicate merged header cells cannot claim a field twice.
- Keep unknown columns such as Link visible in the ignored-column preview.

**Gate:** The sample header row maps Unit and Sub Unit to different fields, and no requested field is silently mapped to the wrong property.

### Phase 2 — Add database migration and private-data access path

- Write and review the idempotent SQL migration.
- Verify deployed personnel column types, key constraints, RLS policies, and backend service-role configuration.
- Apply the migration to staging and verify the backfill and privileges.
- Implement the service-role-only transactional import function and admin-only identifier endpoint.

**Gate:** A normal personnel API read contains no government/account identifiers; an admin-only identifier read works; a failed transactional write leaves neither part of the record inserted.

### Phase 3 — Implement parsing, validation, and preview

- Add aliases for `Date Entered Service` and `Date Of Officership Or Commission`.
- Add the new roster and private fields to the appropriate frontend/backend contracts.
- Normalize Excel dates to ISO format and preserve identifier values as text.
- Add Sub Unit splitting controls and show the proposed values before commit.
- Keep the original Excel row numbers in all validation messages.

**Gate:** Previewing the sample finds row 8, maps Unit separately, shows the complete Sub Unit result, and reports optional blank fields without rejecting otherwise valid rows.

### Phase 4 — Update affected modules

- Update personnel profile, directory, search, and edit forms.
- Update dashboard counts, filters, and reports for `unit`, `pStatus`, and `subUnits` without changing operational status semantics.
- Update assignment selectors while keeping assignment history separate from roster affiliations.
- Update exports and worksheets while excluding private identifiers from ordinary exports.

**Gate:** Legacy single-Sub-Unit records continue to work, multi-Sub-Unit records can be found in every relevant filter, and standard exports do not contain private identifiers.

### Phase 5 — Validate and deploy

- Add automated coverage for the sample header layout, merged cells, exact aliases, Excel dates, Unit/Sub Unit separation, multi-value Sub Units, private-field routing, and frontend/backend allowlist alignment.
- Use synthetic fixtures with populated government identifiers because the sample leaves many of those fields blank.
- Apply the SQL migration before deploying code that calls the new columns or function.
- Preview the 585-row sample in staging, review accepted/ignored mappings and row errors, then import it as one transaction.
- Verify inserted row counts, representative Sub Unit arrays, date values, private-table records, and role-based API responses.

## Acceptance criteria

- Every requested header has an explicit mapping or an explicit ignore decision.
- `Unit` never overwrites `Sub Unit`; `unitCategory` remains a separate PAIS classification.
- `PStatus` is preserved verbatim and does not change operational active counts.
- Multiple Sub Units survive parsing, API validation, database storage, editing, filtering, and reports.
- Existing CSV/XLSX aliases and legacy `sub_unit`/`division` records continue to work.
- Account and government identifiers are stored as text, accessible only through the admin-protected path, and absent from general personnel responses and standard exports.
- The personnel and private identifier writes are atomic for the accepted batch.
- The migration is additive and idempotent; rollback is performed by reverting application code while retaining the additive schema and imported data until a separately reviewed data-removal decision is made.
