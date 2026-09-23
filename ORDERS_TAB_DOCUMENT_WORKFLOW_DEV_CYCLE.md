# Orders Tab Document Workflow - Flexible Generation Development Cycle

Status: Planning only. No application code changes are included in this document.

## 1. Objective

Redesign the Orders tab around two distinct document responsibilities:

1. The system generates an official, unsigned Word order.
2. The user uploads the signed/scanned image of that order after signing.

The generated order must support every controlled purpose code, not only Travel. The selected purpose determines the required fields, personnel roles, narrative content, and document template while sharing one consistent generation engine.

Target flow:

```text
Select series and purpose
        |
        v
Load purpose-specific fields and personnel roles
        |
        v
Review generated order preview
        |
        v
Save order and allocate official order number
        |
        v
Generate and store unsigned DOCX
        |
        v
Download or view generated order
        |
        v
Upload signed/scanned image
        |
        v
View, download, replace, audit, and manage both documents
```

The official order-number format remains:

```text
ITMS-{SERIES}-{PURPOSE}-{YEAR}-{SEQUENCE}
```

Example:

```text
ITMS-SO-TR-2026-0001
```

## 2. Reference document analysis

Reference file:

`Format Example -- Travel Purpose.docx`

The reference is a one-page official Letter Order with the following structure:

### 2.1 Letterhead

- Republic of the Philippines
- National Police Commission
- Philippine National Police
- Information Technology Management Service
- Camp BGen Rafael T. Crame, Quezon City
- Embedded official PNP/ITMS imagery

### 2.2 Order header

- `ITMS`
- Issuance date
- `LETTER ORDERS`
- Official order number
- `SUBJECT: Travel`

The series must control the document heading. For example:

| Series | Generated heading |
|---|---|
| GO | GENERAL ORDERS |
| SO | SPECIAL ORDERS |
| LO | LETTER ORDERS |

The canonical ITMS order number should replace the reference's legacy number format while preserving the visual hierarchy.

### 2.3 Main body

The Travel example contains:

- An authorization statement
- One or more travel destinations
- A travel date range
- The reason or activity for travel
- A list of involved personnel
- A driver entry

### 2.4 Authority and closing section

- `BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:`
- Official signatory block
- Chief of Staff block
- Administrative and Resource Management Division block
- Distribution entry

### 2.5 Document controls and visual rules

- `RESTRICTED` in the header/footer
- A4-style page proportions
- Arial-based typography
- Controlled indentation for personnel lines
- Consistent spacing between header, subject, body, authority, and signatures
- Embedded images must remain in generated documents

### 2.6 Approved project assets

Use the project assets below as the source for generated documents instead of fetching logos from an external service:

| Asset | Role | Current characteristics |
|---|---|---|
| `src/assets/pnp-logo.png` | Left-side PNP emblem | 224 x 313 RGB PNG; current corners are black rather than transparent |
| `resources/ITMS-LOGO.jpg` | Right-side ITMS seal | 218 x 213 RGB JPEG; white background |
| `PNP_ITMS_Letter_Orders_Format_Template.md` | Layout and formatting specification | Defines page setup, typography, tables, spacing, header/footer, and editable fields |

Asset handling requirements:

- Use the PNP logo on the left and the ITMS logo on the right, with a centered text block between them.
- Preserve the logo aspect ratios and visually balance their heights.
- Prepare a print-safe PNP logo variant with transparency or a white background before embedding it in the DOCX. The current PNG is RGB without an alpha channel and may display a black rectangle on a white page.
- Keep the original source assets unchanged unless an approved optimized derivative is added.
- Store the asset/template version in the generated-document manifest so future branding changes do not silently alter regenerated documents.
- Add a visual regression check to confirm that both logos appear correctly, the central lines remain separate, and the header does not clip in DOCX previews and downloaded files.

## 3. Document responsibilities

The system must not treat the generated DOCX and signed scan as one interchangeable file.

| Document | Created by | Format | Purpose |
|---|---|---|---|
| Generated order | System | DOCX | Official unsigned order prepared for printing/signing |
| Signed order | User | JPG, JPEG, PNG, or WEBP | Scanned or photographed copy of the physically wet-signed order |

An order may have a generated document without a signed document. A signed document must be linked to the same order and must never replace the generated source file.

The signed upload is evidence of the physical signing step. This is not an electronic-signature workflow: the system does not validate digital certificates or create a signature.

## 4. Controlled catalogs

### 4.1 Series

| Code | Description | Document heading |
|---|---|---|
| GO | General Order | GENERAL ORDERS |
| SO | Special Order | SPECIAL ORDERS |
| LO | Letter Order | LETTER ORDERS |

### 4.2 Purpose codes

| Code | Description |
|---|---|
| DES | Designation |
| TDS | Termination of Designation |
| DO | Detail |
| DOX | Extension of Detail |
| TR | Travel |
| RA | Sub-unit Reassignment |
| UA | Unit Reassignment |
| CSC | Combination of Service |
| LV | Leave |
| AW | Award |
| CCS | Change of Civil Status |
| AO | Assignment Order |
| PR | Promotion |
| PA | Appointment |
| RG | Resignation |
| LP | Longevity Pay |
| RCA | Replacement Clothing Allowance |
| SP | Specialist Pay |
| AWOL | Absent Without Leave |
| CN | Change Name |
| CHAPS | Change in Appointed Status |

The catalogs must be shared by:

- New order creation
- Generated-document templates
- Filters
- Detail views
- Reports
- Validation
- Backend order-number generation

## 5. Flexible purpose model

### 5.1 Avoid a separate form implementation for every purpose

The frontend and backend should use a purpose-definition registry instead of hard-coding a completely separate order form for each purpose.

Recommended definition shape:

```ts
interface OrderPurposeDefinition {
  code: OrderPurposeCode;
  label: string;
  subjectLabel: string;
  templateKey: string;
  requiredFields: PurposeFieldDefinition[];
  optionalFields: PurposeFieldDefinition[];
  personnelRoles: PersonnelRoleDefinition[];
  buildNarrative: (data: OrderTemplateData) => string;
}
```

Each field definition should contain:

```ts
interface PurposeFieldDefinition {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'date' | 'date-range' | 'select' | 'personnel' | 'unit' | 'number';
  required: boolean;
  options?: Array<{ value: string; label: string }>;
  helpText?: string;
}
```

This allows a new purpose to be added by registering:

- Its label
- Its required fields
- Its personnel roles
- Its narrative builder
- Its DOCX template key

without rewriting the complete Orders page.

### 5.2 Common order fields

Every generated order should use the same common data contract:

```ts
interface CommonOrderTemplateData {
  orderNumber: string;
  series: OrderSeries;
  purposeCode: OrderPurposeCode;
  purposeLabel: string;
  documentHeading: string;
  subject: string;
  issuedDate: string;
  effectiveDate?: string;
  signatory: string;
  signatoryTitle: string;
  authorityText?: string;
  distribution?: string;
  restrictionLabel?: string;
}
```

### 5.3 Purpose-specific data

Purpose-specific values should be stored in a validated `purposeData` object rather than adding dozens of nullable columns to `orders`.

Example Travel data:

```json
{
  "destinations": [
    "380 Bonifacio Avenue, Jesus Dela Pena, Marikina City",
    "15 Saint Anne St., Provident Village, Tanong, Marikina City"
  ],
  "travelStartDate": "2026-08-20",
  "travelEndDate": "2026-08-24",
  "activity": "TWG post-qualification to the winning bidder",
  "driverPersonnelId": "personnel-001"
}
```

The backend must validate `purposeData` against the selected purpose definition before generating the document.

## 6. Personnel involvement model

Personnel must be represented as role-based relationships, not only as an unstructured list of IDs.

Recommended structure:

```ts
interface OrderPersonnelInvolvement {
  personnelId: string;
  role:
    | 'affected'
    | 'recipient'
    | 'driver'
    | 'recommending'
    | 'relieved'
    | 'replacement'
    | 'appointing'
    | 'witness'
    | 'other';
  sequence: number;
  remarks?: string;
}
```

The existing `personnelIds` field should remain available as a compatibility projection, but new records should use `personnelInvolvement` as the authoritative relationship.

### 6.1 Personnel data source

The Orders tab must continue using the shared Personnel tab data source:

- Personnel selectors read from `personnelList`.
- Stored relationships use stable personnel IDs.
- Names, ranks, badge numbers, and units are resolved from the same records.
- Generated documents should store a generation snapshot of displayed personnel values so historical documents remain accurate if a personnel record later changes.

Recommended generation snapshot:

```ts
interface OrderPersonnelSnapshot {
  personnelId: string;
  role: string;
  rank: string;
  fullName: string;
  badgeNo?: string;
  unit?: string;
  designation?: string;
}
```

### 6.2 Purpose-specific personnel roles

| Purpose | Required or common personnel involvement |
|---|---|
| DES | Personnel being designated; optional recommending authority |
| TDS | Personnel whose designation is terminated |
| DO | Personnel being detailed; receiving unit |
| DOX | Personnel whose detail is extended |
| TR | Travelling personnel; driver |
| RA | Personnel being moved between sub-units |
| UA | Personnel being moved between units |
| CSC | Personnel whose service records are combined |
| LV | Personnel applying for or receiving leave |
| AW | Award recipient; recommending personnel if applicable |
| CCS | Personnel whose civil status changes |
| AO | Personnel being assigned |
| PR | Personnel being promoted; approving authority if applicable |
| PA | Appointee; appointing or recommending authority |
| RG | Personnel resigning |
| LP | Personnel receiving longevity pay |
| RCA | Personnel receiving clothing allowance |
| SP | Personnel receiving specialist pay |
| AWOL | Personnel recorded as absent without leave |
| CN | Personnel changing name |
| CHAPS | Personnel whose appointed status changes |

The UI should show role-specific personnel selectors. For example, Travel should have:

- Travelling personnel multi-select
- Driver selector
- Optional additional personnel role

Reassignment should have:

- Affected personnel multi-select
- Source unit
- Destination unit
- Optional receiving authority

## 7. Purpose template matrix

The generation engine should use one shared layout system with purpose-specific content blocks.

| Purpose group | Purpose codes | Required template data |
|---|---|---|
| Personnel status | DES, TDS, CHAPS | Personnel, current status, new status, effective date, authority |
| Detail and assignment | DO, DOX, AO | Personnel, source unit, receiving unit, location, effective period |
| Movement | RA, UA | Personnel, previous unit, new unit, effective date, reason |
| Travel | TR | Travelling personnel, destinations, dates, activity, driver |
| Leave | LV | Personnel, leave type, dates, approving authority |
| Recognition | AW | Recipient, award title, citation, authority date |
| Service records | CSC, CCS, CN | Personnel, previous value, new value, supporting details |
| Career action | PR, PA | Personnel, previous rank/status, new rank/status, effective date |
| Separation | RG, AWOL | Personnel, event date, reason, authority |
| Benefits and allowances | LP, RCA, SP | Personnel, benefit type, eligibility basis, effective date |

Each purpose group may initially share a layout while using a different narrative block. Later, a purpose can receive a dedicated template without changing the order API.

## 8. Generated DOCX architecture

### 8.1 Template-driven generation

Use the reference Travel document as the visual baseline and create versioned master templates.

Recommended approach:

1. Store a clean master DOCX for each layout family.
2. Add stable placeholders for common fields.
3. Add repeatable placeholders for personnel rows.
4. Preserve letterhead, logos, header, footer, margins, and styles.
5. Render purpose-specific narrative and sections into the template.
6. Record the template key and version used for generation.

The first master template should be built from the rules in `PNP_ITMS_Letter_Orders_Format_Template.md` and should explicitly embed:

- `src/assets/pnp-logo.png` or its approved print-safe derivative
- `resources/ITMS-LOGO.jpg`
- The restricted header and footer
- The borderless three-column letterhead table
- The two-column ITMS/date line
- The borderless signature/certification table

The template specification should be treated as the source of truth for layout decisions. The original Travel DOCX remains a visual reference, while the clean master template should use stable tables, styles, and placeholders instead of repeated spaces or manual tab characters.

Example placeholders:

```text
{{DOCUMENT_HEADING}}
{{ISSUED_DATE}}
{{ORDER_NUMBER}}
{{SUBJECT}}
{{NARRATIVE}}
{{PERSONNEL_LIST}}
{{SIGNATORY}}
{{SIGNATORY_TITLE}}
{{DISTRIBUTION}}
```

The exact DOCX generation library should be selected during implementation. The preferred solution is a server-side Open XML/template engine that supports text replacement, repeating personnel rows, and preservation of embedded images.

### 8.2 Generated document metadata

Every generated document should record:

```ts
interface GeneratedDocumentManifest {
  templateKey: string;
  templateVersion: string;
  generatedAt: string;
  generatedBy: string;
  orderNumber: string;
  personnelSnapshot: OrderPersonnelSnapshot[];
  sourceDataHash?: string;
}
```

### 8.3 Regeneration rules

- Draft and For Approval orders may be regenerated.
- Regeneration must not allocate a new order number.
- Each regeneration increments the generated-document version.
- The prior generated file remains traceable.
- Signed, Released, Archived, and Revoked orders cannot be regenerated unless restored or explicitly handled by an administrative correction process.

## 9. Data-model changes

### 9.1 Order record

Add or formalize:

```ts
interface OrderRecord {
  id: string;
  orderNumber: string;
  series: OrderSeries;
  purposeCode: OrderPurposeCode;
  purposeLabel: string;
  subject: string;
  issuedDate: string;
  effectiveDate?: string;
  documentStatus: OrderDocumentStatus;
  personnelIds?: string[];
  personnelInvolvement?: OrderPersonnelInvolvement[];
  purposeData?: Record<string, unknown>;
  signatory?: string;
  signatoryTitle?: string;
  generatedDocument?: GeneratedDocumentMetadata;
  signedDocument?: SignedDocumentMetadata;
}
```

### 9.2 Generated document metadata

```ts
interface GeneratedDocumentMetadata {
  fileName: string;
  fileMimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  fileSize?: number;
  storagePath: string;
  version: number;
  templateKey: string;
  templateVersion: string;
  generatedAt: string;
  generatedBy?: string;
}
```

### 9.3 Signed document metadata

```ts
interface SignedDocumentMetadata {
  fileName: string;
  fileMimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileSize: number;
  storagePath: string;
  version: number;
  uploadedAt: string;
  uploadedBy?: string;
}
```

Existing generic DOCX fields should be retained temporarily for backward compatibility and migrated into `generatedDocument` where possible.

## 10. Development phases

### Phase 0 - Confirm the document contract

Status: **In progress**

Phase 0 decision record: [ORDERS_TAB_PHASE_0_DOCUMENT_CONTRACT.md](ORDERS_TAB_PHASE_0_DOCUMENT_CONTRACT.md)

Tasks:

- Confirm the final series heading for GO, SO, and LO.
- Confirm whether the canonical ITMS number appears in the `NUMBER` line, document metadata, or both.
- Confirm the authority and distribution blocks for each series.
- Confirm the initial supported image types and file-size limit.
- Confirm which purpose templates must be available in the first release.

Deliverable:

- Approved template and field contract

Phase 0 implementation note:

- No application code is changed during this phase.
- The phase must be closed after the authority, distribution, signed-image, and first-release-template approval points are confirmed.

### Phase 1 - Shared catalogs and purpose registry

Status: **Implemented - catalog foundation**

Implementation files:

- `shared/orderCatalog.json`
- `src/constants/orders.ts`
- `backend/utils/orderCatalog.js`
- `backend/utils/orderNumber.js`
- `src/types/pais.ts`
- `test/ordersCatalog.test.js`

Tasks:

- Centralize series, purpose, status, field, and personnel-role definitions.
- Build the purpose-definition registry.
- Add required and optional field definitions for every purpose code.
- Add role definitions for personnel involved in each purpose.
- Add purpose-specific validation rules.
- Add tests proving every catalog purpose has a registered definition.

Deliverables:

- One source of truth for purpose behavior
- Dynamic purpose-aware form configuration
- Shared frontend/backend validation contract

Phase 1 completion note:

- The shared catalog now defines all series, statuses, purpose codes, template keys, narrative keys, required fields, and personnel roles.
- The backend validates purpose payloads when the new `purposeData` or `personnelInvolvement` payloads are supplied.
- Existing legacy orders remain compatible while later phases adopt the new payload fields in the UI.
- Dynamic form rendering, generated DOCX output, and signed-image upload remain scheduled for later phases.

### Phase 2 - Flexible personnel involvement

Status: **Implemented - relationship foundation**

Implementation files:

- `src/pages/OrdersPage.tsx`
- `src/types/pais.ts`
- `backend/controllers/ordersController.js`
- `backend/utils/orderCatalog.js`
- `backend/scripts/migrate_orders_personnel_involvement.sql`

Tasks:

- Add role-based personnel relationships.
- Continue sourcing selectors from the Personnel tab's shared data.
- Support multi-personnel selection where applicable.
- Support special roles such as driver, recipient, affected personnel, source unit, and receiving unit.
- Store personnel snapshots during generation.
- Preserve `personnelIds` as a compatibility projection.

Deliverables:

- Purpose-specific personnel selectors
- Accurate personnel names and roles in generated documents
- Historical document fidelity after personnel data changes

Phase 2 completion note:

- Orders now submit role-based personnel involvement while preserving `personnelIds` for compatibility.
- The backend resolves personnel IDs from the shared Personnel data source and rejects unknown references.
- Order saves capture rank, name, badge, unit, designation, role, and display sequence snapshots.
- The current order form supports role assignment for selected personnel using the selected purpose definition.
- Purpose-specific `purposeData` fields and final DOCX rendering remain scheduled for later phases.

### Phase 3 - Order schema and migrations

Status: **Implemented - document metadata foundation**

Implementation files:

- `src/types/pais.ts`
- `backend/services/orderDocumentStorage.js`
- `backend/scripts/migrate_orders_document_schema.sql`

Tasks:

- Add `purposeData` JSON/JSONB storage.
- Add role-based personnel relationship storage.
- Add generated-document metadata.
- Add signed-document metadata.
- Add template and generation manifest fields.
- Migrate existing DOCX metadata to generated-document fields where possible.
- Preserve legacy file fields during transition.

Deliverables:

- Database model supporting two document types
- Backward-compatible migration

Phase 3 completion note:

- Generated DOCX metadata and signed-scan metadata are now separate typed structures.
- Existing generic DOCX storage fields remain available during migration.
- Existing DOCX records are backfilled into `generatedDocument` and are not treated as signed scans.
- New generated and signed storage path builders are available for later document-generation and signed-upload phases.
- Actual DOCX generation and signed-image upload remain scheduled for Phases 5 and 7.

### Phase 4 - Automated order numbering

Status: **Implemented and verified**

Implementation files:

- `backend/scripts/migrate_orders_phase2.sql`
- `backend/utils/orderNumber.js`
- `backend/store/repository.js`
- `src/pages/OrdersPage.tsx`
- `test/orderNumber.test.js`

Tasks:

- Keep the existing database-backed sequence allocation.
- Generate numbers only on official save.
- Display a non-consuming preview before save.
- Ensure series, purpose, and year are included in the final number.
- Preserve the number during regeneration.
- Add concurrency and duplicate-number tests.

Deliverables:

- Server-authoritative numbers such as `ITMS-SO-TR-2026-0001`

Phase 4 completion note:

- Supabase sequence allocation is atomic by year and series.
- In-memory fallback allocation remains deterministic for offline development.
- Existing order numbers cannot be changed during edits.
- Series, purpose, and issued year are locked after number allocation.
- The frontend shows a non-consuming preview before save.

### Phase 5 - Reference-based DOCX generation

Tasks:

- Prepare versioned master templates based on the reference document.
- Implement the clean master template from `PNP_ITMS_Letter_Orders_Format_Template.md`.
- Embed the approved PNP and ITMS assets from the repository.
- Resolve the PNP logo's non-transparent black background before final embedding.
- Preserve letterhead, logos, restricted header/footer, margins, and typography.
- Implement common placeholder replacement.
- Implement repeatable personnel rendering.
- Implement purpose-specific narrative builders.
- Implement series-specific document headings.
- Store generated DOCX files privately.
- Store the template version and personnel snapshot.

Initial generation target:

- Travel
- Designation
- Assignment
- Detail
- Reassignment
- Leave
- Award
- Promotion

The remaining purpose codes should use the same registry and may initially use a shared administrative template until their dedicated content is approved.

Phase 5 implementation note:

- Added the server-side `docx` generator in `backend/services/orderDocxGenerator.js`.
- The generator produces an A4 unsigned order with the PNP/ITMS side-logo letterhead and centered separated text lines, restricted header/footer, series heading, canonical order number, subject, purpose narrative, personnel snapshot, signature block, and distribution block.
- Travel has a purpose-specific narrative; all other purposes use the shared registry-backed administrative narrative until dedicated wording is approved.
- The generator embeds the approved transparent PNP derivative at `src/assets/pnp-logo-transparent.png` and the repository ITMS logo at `resources/ITMS-LOGO.jpg`, with independently sized side columns.
- Added private versioned storage and metadata attachment through `POST /api/orders/:id/generated-document/regenerate`.
- Added generated-document retrieval and preview endpoints at `GET /api/orders/:id/generated-document` and `GET /api/orders/:id/generated-document/preview`.
- Added frontend API helpers for the Phase 6 flow.
- Automated coverage confirms the generated package is a valid DOCX and contains the order number, purpose, and personnel content.
- The Phase 6 UI still needs to call the generator during the new multi-step order flow; the legacy DOCX upload UI remains available until that phase.

### Phase 6 - New order creation flow

Tasks:

- Remove DOCX upload as a creation requirement.
- Start the form with series and purpose selection.
- Dynamically load common and purpose-specific fields.
- Dynamically load personnel roles.
- Show a read-only order-number preview.
- Add a generated-document preview before save where practical.
- Save metadata and generate the official DOCX through the backend.
- Show the final order number after save.

Suggested steps:

```text
Step 1: Series and purpose
Step 2: Common order details
Step 3: Purpose-specific details
Step 4: Personnel involvement
Step 5: Review and generate
```

Phase 6 implementation note:

- Replaced the three-step creation form with a four-step guided flow: classification, common details, purpose details, and personnel/review.
- The new flow begins with series and purpose selection and no longer requires a DOCX upload to create an order.
- Purpose fields are rendered from the shared catalog, including required validation, leave-type options, and unit suggestions with custom text entry.
- Personnel roles continue to come from the selected purpose definition and are captured in the order payload.
- Saving through the connected backend now allocates the official order number, persists `purposeData`, and generates the unsigned DOCX automatically.
- The generated order is opened in the existing details view after save so the user can view or download the result.
- The old DOCX upload path remains available only for legacy edit compatibility until Phase 7/9 replace the signed-document workflow and remove obsolete DOCX-only controls.

### Phase 7 - Signed image workflow

Tasks:

- Replace DOCX upload middleware with image validation.
- Treat uploaded files as scans or photographs of physically wet-signed orders.
- Preserve the original signed scan as an auditable source file.
- Do not add electronic-signature or certificate validation requirements.
- Accept JPEG, PNG, and WEBP signed scans.
- Validate extension, MIME type, and file signature.
- Store signed images separately from generated DOCX files.
- Support upload, replacement, viewing, downloading, and removal.
- Require a signed document before allowing the Signed status transition.

Phase 7 implementation note:

- Added a separate signed-scan upload endpoint at `POST /api/orders/:id/signed-file`.
- The endpoint accepts only JPEG, PNG, and WEBP files, validates the extension, MIME type, and image signature, and limits uploads to 25 MB.
- Signed scans are stored separately under versioned `signed/{year}/{series}/{orderNumber}/...` paths and recorded in `signedDocument` metadata.
- Added signed-scan retrieval/download and removal endpoints at `GET /api/orders/:id/signed-file` and `DELETE /api/orders/:id/signed-file`.
- The Orders details view now presents generated unsigned DOCX and signed scan as separate document sections, with view, download, replace, and remove controls for signed scans.
- The backend and UI block the `For Approval` to `Signed` transition until a signed scan exists.
- Legacy DOCX endpoints remain temporarily available for old records and will be removed or relabeled during Phase 9 migration.

Suggested storage paths:

```text
generated/{year}/{series}/{orderNumber}/v{version}/order.docx
signed/{year}/{series}/{orderNumber}/v{version}/signed-order.png
```

### Phase 8 - Orders tab UI and controls

Replace the current single-document area with two clearly separated sections.

#### Generated order section

- Generated status
- Template and version
- View DOCX preview
- Download DOCX
- Regenerate while editable

#### Signed order section

- Signed scan status
- Upload signed scan
- View image
- Download image
- Replace scan
- Remove scan where permitted

The UI must make the distinction visible:

```text
Generated order: Available
Signed order: Not uploaded
```

Phase 8 implementation note:

- The Orders register now treats generated orders and signed scans as separate document states.
- Dashboard summaries distinguish generated orders, signed scans, and editable orders missing a signed scan.
- Administrative order filters support generated, signed, both, missing signed, missing generated, and missing both states.
- Register rows display separate Generated and Signed scan badges instead of a generic DOCX label.
- Order details provide separate generated-DOCX and signed-scan actions; legacy source DOCX controls only appear for records that still contain legacy file metadata.
- The Signed workflow action is visibly disabled until a signed scan exists, with backend enforcement retained as the authoritative rule.

### Phase 9 - Workflow, CRUD, and audit integration

Rules:

- Draft: editable and regeneratable.
- For Approval: controlled edits and regeneration allowed by authorized users.
- Signed: signed scan required; documents become locked.
- Released: view/download only.
- Archived: retained for audit.
- Revoked: retained and restorable according to the recovery workflow.

Audit events should include:

- Generated document created
- Generated document regenerated
- Signed scan uploaded
- Signed scan replaced
- Signed scan removed
- Status changed
- Document viewed or downloaded where required by policy

### Phase 10 - Backward compatibility and cleanup

Tasks:

- Map old DOCX uploads to generated-document metadata.
- Keep old file endpoints temporarily with clear compatibility behavior.
- Remove DOCX-only labels and validation from the new order flow.
- Update filters from generic `has document` to:
  - Has generated order
  - Has signed order
  - Missing signed order
- Update dashboard counts and register columns.
- Remove obsolete local HTML-only generation once server DOCX generation is available.
- Keep the asset paths and template specification documented so deployment does not omit required branding files.

Phase 10 implementation note:

- The active order creation and edit flow no longer offers DOCX upload, replacement, or removal.
- Legacy DOCX records remain readable through the compatibility endpoint and are clearly marked read-only in the details view.
- Added `backend/scripts/reconcile_orders_legacy_documents.sql` for a non-destructive reconciliation pass that maps remaining legacy DOCX metadata into `generatedDocument` and reports any incorrectly classified signed DOCX records.
- New records use only generated DOCX and signed-image controls; legacy columns are retained until the final compatibility-removal release.

## 11. API design

### Order creation and generation

```text
POST /api/orders
```

The endpoint should:

1. Validate common fields.
2. Validate the purpose definition.
3. Validate purpose-specific data.
4. Validate personnel roles and IDs.
5. Allocate the official order number.
6. Create the order record.
7. Generate and store the DOCX.
8. Return the order and generated-document metadata.

### Generated document endpoints

```text
GET  /api/orders/:id/generated-document
GET  /api/orders/:id/generated-document/preview
POST /api/orders/:id/generated-document/regenerate
```

### Signed document endpoints

```text
POST   /api/orders/:id/signed-document
GET    /api/orders/:id/signed-document
DELETE /api/orders/:id/signed-document
```

### Status endpoints

```text
POST /api/orders/:id/status
GET  /api/orders/:id/history
```

The backend, not only the frontend, must enforce required personnel roles, document requirements, and locked-state rules.

## 12. Database migration

Add or formalize:

```sql
series TEXT;
purpose_code TEXT;
purpose_label TEXT;
purpose_data JSONB;
personnel_involvement JSONB;
document_status TEXT DEFAULT 'Draft';
generated_document JSONB;
signed_document JSONB;
template_key TEXT;
template_version TEXT;
created_by TEXT;
updated_by TEXT;
```

If normalized document tables are preferred, use:

```sql
order_generated_documents (...);
order_signed_documents (...);
order_personnel_involvement (...);
order_document_versions (...);
```

Add indexes for:

- Order number
- Series
- Purpose code
- Document status
- Issued date
- Effective date
- Generated-document availability
- Signed-document availability

Preserve existing order records and avoid deleting legacy storage references during migration.

## 13. Security and permissions

- Keep generated and signed files in private storage.
- Use short-lived signed URLs.
- Validate file signatures, not only extensions.
- Enforce image size limits.
- Sanitize filenames and storage paths.
- Do not trust client-supplied order numbers.
- Do not trust client-supplied personnel names for relationships.
- Resolve personnel IDs from the shared personnel source on the server.
- Keep signed and released documents protected from casual replacement.
- Record document replacement and removal in audit history.
- Treat official logos and master templates as application-controlled assets; users must not be able to replace them through order metadata or upload fields.

## 14. Testing plan

### Unit tests

- Series and purpose catalog completeness
- Every purpose has a registered definition
- Required-field validation per purpose
- Personnel-role validation per purpose
- Personnel snapshot generation
- Narrative generation for each purpose group
- Order-number formatting and sequence allocation
- Template selection
- Signed-image file validation

### API tests

- Generate Travel order
- Generate each supported purpose group
- Reject missing purpose-specific fields
- Reject invalid personnel roles
- Reject personnel IDs that do not exist
- Generate unique order numbers under concurrent requests
- Download generated DOCX
- Preview generated DOCX
- Upload valid signed image
- Reject DOCX upload to the signed-image endpoint
- Reject invalid image payloads
- Replace signed image
- Block Signed status without signed scan
- Preserve generated document while replacing signed scan

### UI tests

- Series selection changes heading preview
- Purpose selection changes fields and personnel roles
- Multiple involved personnel can be selected
- Role labels are visible and understandable
- Order-number preview updates correctly
- Generated document and signed document appear separately
- Generated DOCX can be viewed and downloaded
- Signed image can be viewed and downloaded
- Locked orders cannot regenerate or replace protected files
- Missing signed-document warnings are clear

### Visual acceptance

Compare generated Travel documents against the reference for:

- Letterhead position
- Logo rendering
- Subject alignment
- Personnel indentation
- Body spacing
- Signature placement
- Distribution placement
- Restricted header/footer
- Page count and page overflow
- PNP emblem appears on the left without a black background artifact
- ITMS seal appears on the right with balanced size and alignment
- Header/footer and logo assets remain present after DOCX download

## 15. Acceptance criteria

The implementation is complete when:

- Users select a series and purpose before entering purpose-specific details.
- Every controlled purpose has a registered validation and template definition.
- Purpose-specific personnel roles can be selected from the shared Personnel tab data.
- The backend generates a unique canonical order number.
- The system produces an unsigned DOCX based on the approved reference layout.
- The generated DOCX supports Travel and can be extended to other purposes through the registry.
- The generated order can be viewed and downloaded.
- Signed orders are uploaded as scanned images, not DOCX files.
- Signed images can be viewed, downloaded, replaced, and audited.
- The generated DOCX and signed scan remain separate files.
- The Signed status requires a signed scan.
- Existing order records remain accessible after migration.
- Draft, revoke, restore, delete, and locked-state controls continue to work.
- Automated tests and visual comparison checks pass.

## 16. Recommended delivery sequence

1. Approve the flexible purpose and personnel-role contract.
2. Add the purpose-definition registry.
3. Add role-based personnel involvement and snapshots.
4. Migrate the order schema for generated and signed documents.
5. Implement server-side order generation and numbering.
6. Build the Travel template from the reference document.
7. Apply the approved repository logos and letter-order specification.
8. Add shared template support for the remaining purpose groups.
9. Replace DOCX upload with signed-image upload.
10. Update Orders UI for separate generated/signed document controls.
11. Apply workflow rules requiring signed documents.
12. Migrate legacy records and remove obsolete DOCX-only UI.
13. Run automated, API, UI, and visual acceptance testing.

## 17. Key architectural decision

The system should separate four concerns:

```text
Order metadata
    + purpose-specific data
    + personnel relationships
    + generated DOCX document
    + signed scanned document
```

The purpose registry controls validation and content. The template registry controls formatting. Personnel IDs control relationships. The generated and signed files remain independently versioned and auditable.

This allows the Orders tab to support Travel now and additional administrative purposes later without creating a separate workflow or document engine for every purpose.
