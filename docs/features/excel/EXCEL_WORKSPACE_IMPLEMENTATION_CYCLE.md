# Excel Workspace Implementation Cycle

## Objective

Create a dedicated PAIS Excel Workspace that behaves as an in-house controlled spreadsheet desk: users can generate workbooks from approved PAIS data, edit only authorized fields, preview changes, and approve imports back into PAIS.

The Excel files remain an interchange/reporting layer. PAIS remains the authoritative system of record.

## Phase 1 — Excel Integration workspace foundation

- Add a dedicated **Excel Integration** navigation tab.
- Load the versioned template registry from the backend.
- Allow authorized users to select a workbook type, reporting date, and status filter.
- Provide export actions through the authenticated export endpoint.
- Expose the existing training/education preview-and-approval workflow in the workspace.
- Show template version, sheets, purpose, and validation rules.

## Phase 2 — Reference-layout renderer and edit policy

- Reproduce the approved layouts from the supplied workbooks.
- Define explicit locked and unlocked cells for each workbook type.
- Keep PAIS-derived values and formulas locked.
- Unlock only approved manual fields such as remarks, interview scores, service reputation, and authorized strength.
- Add worksheet protection and visible edit instructions.

## Phase 3 — Editable round-trip and change review

- Upload edited workbooks from the Excel Integration tab.
- Compare workbook values against the exported snapshot.
- Display additions, updates, conflicts, invalid values, and unchanged rows.
- Require approval before writing records to PAIS.

## Phase 4 — Operational controls

- Add durable import history and audit records.
- Store workbook hash, template version, uploader, approver, and commit results.
- Add stale-export detection when PAIS data changes after workbook generation.
- Add authorized-strength maintenance and promotion-factor approval controls.

## Phase 1 acceptance criteria

- The Excel Integration tab is reachable after authentication.
- Template definitions load from the backend without exposing source workbooks.
- Export downloads contain the selected date and template version.
- Training and education imports can be previewed and committed through the tab.
- Users receive clear errors when the backend is unavailable or validation fails.

## Phase 2 acceptance criteria

- Generated reports use the reference workbook header positions for supported layouts.
- Training and education exports use the reference column order.
- PAIS identity, calculated totals, variances, and source values remain locked.
- Approved manual fields are explicitly listed in the hidden PAIS Metadata sheet and unlocked when data rows exist.
- Every generated worksheet is protected and carries template/version metadata.

## Phase 3 acceptance criteria

- Every export receives a temporary snapshot identity.
- Re-uploaded workbooks report changed, added, and unchanged rows when the snapshot is available.
- The Excel Integration tab displays the change summary before approval.
- Changed rows show the field, previous value, and uploaded value in a review table.
- Validation errors continue to block commit.
- Snapshot retention is temporary until Phase 4 adds durable audit/history storage.

## Phase 4 progress

- Added the migration for durable Excel import audit history.
- Added preview and commit audit records with uploader, approver, counts, template version, export ID, and source fingerprint.
- Added stale-export detection that blocks commits when PAIS source data changed after export.
- Added an authenticated import-history endpoint.

The migration in `backend/scripts/migrate_excel_import_audits.sql` must be applied in Supabase before audit records become durable. Until then, the backend safely falls back to memory and does not block normal exports/import previews.

## Phase 5 and Phase 6 progress

- Disposition/statistics exports now separate PAIS-calculated actual strength from controlled authorized strength.
- Rank, category, PCO, PNCO, NUP, and variance formulas are generated in the reference-oriented reports.
- Promotion exports now generate factor worksheets for seniority, awards, diversity, IPER/other qualifications, service reputation, and interview rating.
- Promotion scoring remains pending policy approval; the workbooks expose source values and maximums without inventing scores.
