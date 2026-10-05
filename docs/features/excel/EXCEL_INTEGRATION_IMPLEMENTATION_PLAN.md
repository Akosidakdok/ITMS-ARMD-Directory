# PAIS Excel Integration and Automation Implementation Plan

## Purpose

This plan describes how PAIS can use editable Excel workbooks for controlled data entry, official reporting, import, review, and automation.

Excel should be treated as a controlled interchange and reporting format. PAIS should remain the authoritative system of record.

No implementation work is authorized by this document. This is a review plan only.

## Workbook inventory

| Workbook | Intended system module |
|---|---|
| `src/assets/INITIAL DATA - FORMS.xlsx` | Personnel profiles, disposition, territorial strength, rank profiles, HQ statistics |
| `src/assets/INITIAL DATA - TRAINING AND EDUC.xlsx` | Training and education imports |
| `src/assets/PCO Worksheet Promotion CY 2026 - FINAL -for programming.xlsx` | Seniority, IPER, awards, diversity, service reputation, interviews, promotion ranking |
| `src/assets/STATISTICS_BY RANK - UP.xlsx` | Rank-by-office population statistics |

The workbooks contain merged headers, Excel serial dates, formulas, multiple report variants, manual computation areas, and some `#REF!` cells. They should be treated as templates and business references, not copied directly into the database.

## Design principle

```text
PAIS database
     ↓
Backend report and calculation service
     ↓
Excel template renderer
     ↓
Editable protected workbook
     ↓
Upload and validation service
     ↓
Import preview
     ↓
User approval
     ↓
PAIS database
```

The database remains authoritative. Excel provides controlled editing, review, printing, and exchange with existing administrative workflows.

## Phase 1 — Excel template registry and data mapping

Create a controlled registry defining:

- Workbook type
- Sheet name
- Header row
- Data row
- PAIS table or source
- Importable fields
- Calculated fields
- Required fields
- Validation rules
- User permissions
- Template version

Example training mapping:

```text
Rank              → personnel.rank
Name              → personnelId lookup
Training Title    → training.courseName
Start Date        → training.startDate
End Date          → training.endDate
Hours             → training.hours
Authority Number  → training.orderNumber
```

This prevents the application from depending on fragile cell positions.

## Phase 2 — Excel export

Add export actions for:

- Current personnel disposition
- Statistics by rank
- Territorial strength
- Training records
- Education records
- Promotion evaluation worksheets
- Official reports as of a selected date

Generated workbooks should contain:

- Official title and reporting date
- PAIS-generated data
- Formula cells where appropriate
- Protected calculated cells
- Clearly unlocked editable cells
- Template and version identifiers
- Confidentiality markings
- Source metadata

The generated formats should reproduce the relevant layouts from:

- `STATISTICS_BY RANK - UP.xlsx`
- `Territorial Strength`
- `Statistics UP`
- `Statistics NUP`
- `HQ ITMS`
- Promotion worksheet tabs

## Phase 3 — Excel import with preview and approval

Users should not upload a workbook directly into production records.

Recommended workflow:

```text
Upload Excel
    ↓
Detect workbook and template type
    ↓
Validate headers and rows
    ↓
Match personnel using stable ID or badge number
    ↓
Show preview and errors
    ↓
User approves import
    ↓
Save valid rows to PAIS
    ↓
Create audit record
```

The preview should identify:

- New records
- Updated records
- Duplicate records
- Unmatched personnel
- Invalid dates
- Missing required fields
- Conflicting values
- Rows skipped from import

## Phase 4 — Training and education Excel workflows

Use `INITIAL DATA - TRAINING AND EDUC.xlsx` as the starting reference.

Supported workflows should include:

- Import training records
- Import education records
- Export current training and education data
- Match personnel by badge number or selected PAIS identity
- Validate date ranges and academic years
- Prevent duplicate training records
- Preserve attachments and authority references
- Show rejected rows with reasons

The existing bulk import behavior should be extended rather than replaced.

## Phase 5 — Disposition and statistics workbooks

Automate the report formats from:

- `STATISTICS_BY RANK - UP.xlsx`
- `Territorial Strength`
- `Statistics UP`
- `Statistics NUP`
- `HQ ITMS`
- `Rank Profile`

The system should generate:

- Population by office or unit
- PCO totals
- PNCO totals
- NUP totals
- Exact rank totals
- Male and female totals where permitted
- Grand totals
- Variance against authorized strength
- As-of date
- Detailed personnel listings behind each total

### Authorized versus actual strength

Authorized strength should be stored separately from actual PAIS counts:

```text
Actual Strength     = calculated from PAIS
Authorized Strength = controlled administrative input
Variance            = Actual Strength - Authorized Strength
```

This allows authorized figures to be maintained manually without allowing manual edits to corrupt actual personnel counts.

### Phase 5 implementation status

Implemented in the current repository:

- Added Supabase/in-memory authorized-strength storage with report type, unit, rank, date, and audit identity.
- Added authenticated read and administrator-only bulk update endpoints under `/api/disposition/authorized-strength`.
- Connected disposition exports to authorized-strength values for Rank Profile and HQ ITMS.
- Corrected rank statistics formulas so PCO, PNCO, and grand totals do not double-count subtotal columns.
- Added the migration `backend/scripts/migrate_authorized_strength.sql`.

Apply the new migration in Supabase before maintaining production authorized-strength values.

## Phase 6 — Promotion workbook automation

Use the PCO promotion workbook as several controlled source modules rather than one opaque upload:

- Seniority
- IPER or rating periods
- Awards
- Diversity of assignment
- Service reputation
- Interview rating
- Final ranking
- BMI and other board checks

Each factor should be stored separately and connected to a personnel member.

The final score should be calculated from approved factor records:

```text
Final Score =
  Seniority
+ IPER or rating
+ Awards
+ Diversity
+ Service Reputation
+ Interview
+ Other approved factors
```

The workbooks show different scoring distributions for PCO and PNCO tracks. The system should select a scoring configuration based on the promotion track.

Promotion exports should show:

- PAIS-derived values
- Manually entered values
- Calculated points
- Maximum points
- Warnings
- Total score
- Ranking
- Approval status

### Phase 6 implementation status

Implemented in the current repository:

- Promotion exports now create the configured factor worksheets instead of a single summary sheet.
- Seniority, awards, diversity, service reputation, interview rating, and other-qualification values are placed in their corresponding worksheets.
- PCO and PNCO evaluations remain separated by promotion track.
- Evaluation metadata, source status, maximum points, remarks, and pending-policy notices are included in the generated workbook.
- Calculated identity and source fields remain protected; configured manual factor fields remain editable according to the template policy.

Automatic promotion points remain disabled until the approved scoring worksheet and source-mapping policy are formally supplied.

## Phase 7 — Editable Excel control model

Exported workbooks should use protected and editable cells:

- PAIS-derived cells: locked
- Calculated cells: locked
- Manual assessment cells: unlocked
- Remarks: unlocked
- Interview scores: unlocked for authorized evaluators
- Administrative strength values: unlocked for authorized users
- Formula cells: protected
- Worksheet structure: protected

When an edited workbook is returned, the system should only accept edits to approved editable cells.

## Phase 8 — Audit, versioning, and conflict handling

Every imported workbook should record:

- Uploaded filename
- Template version
- Uploaded by
- Upload date
- Import status
- Number of inserted rows
- Number of updated rows
- Number of rejected rows
- Original file hash
- Approval user
- Approval date

If the underlying PAIS data changed after export, the system should warn:

```text
This workbook was generated from an older version of the data.
Review differences before importing.
```

## Technical approach

Use a backend Excel service with a library such as ExcelJS for template rendering, formatting, worksheet protection, formulas, and controlled parsing.

Calculations and validation should run on the backend so that scores, totals, and import behavior do not differ between browsers.

The service should expose endpoints similar to:

```text
GET  /api/excel/templates
GET  /api/excel/templates/:templateId/export
POST /api/excel/import/preview
POST /api/excel/import/commit
GET  /api/excel/imports/:id
```

All endpoints must use the existing authentication, role checks, audit logging, and Supabase persistence patterns.

## Recommended rollout order

1. Training and education export/import
2. Disposition and statistics export
3. Authorized-strength maintenance
4. Promotion factor worksheets
5. Promotion scoring and ranking
6. Full editable workbook round-trip
7. Audit, versioning, and approval controls

## Alternatives considered

### Option A — Controlled template export/import — Recommended

PAIS generates protected workbooks, users edit approved cells, and imports go through validation and approval.

Advantages:

- Strong control
- Preserves existing Excel workflows
- Supports official report formats
- Reduces accidental data corruption
- Allows audit and version tracking

### Option B — Web spreadsheet editor plus Excel export

Users edit data inside PAIS using an Excel-like grid, then export to Excel.

Advantages:

- Better validation while editing
- Immediate database updates
- Easier permissions and audit tracking

Tradeoff:

- May not reproduce complex existing Excel layouts exactly

### Option C — Excel as the primary source of truth

Users maintain the workbooks and PAIS periodically imports them.

This is not recommended because it creates synchronization conflicts, weakens auditability, and makes formulas and manual changes difficult to control.

## Decisions required before implementation

- Which workbook layouts must be reproduced exactly?
- Which worksheets are reports only and which are editable inputs?
- Which fields may be manually edited?
- Should authorized strength be maintained separately from PAIS personnel data?
- Which identity key should be used for imports: personnel ID, badge number, or both?
- Who may upload, preview, approve, and commit imports?
- Which Excel formulas are officially approved?
- Which workbook version is the authoritative promotion policy?
- Should edited workbooks create draft changes or update records immediately after approval?
- Should confidential fields be excluded from exports by default?

## Final recommendation

Implement controlled export first, followed by preview-based import. Begin with training, education, and statistics because their data structures are more stable. Then implement the promotion workbook as separate factor worksheets with versioned scoring configurations.

Do not attempt to make every existing workbook directly editable in one step. Normalize the data mappings first, remove formula errors, establish permission boundaries, and then reproduce the approved formats through versioned templates.
