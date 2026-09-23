# Orders Tab - Phase 0 Document Contract

Status: In progress

Parent plan: [ORDERS_TAB_DOCUMENT_WORKFLOW_DEV_CYCLE.md](ORDERS_TAB_DOCUMENT_WORKFLOW_DEV_CYCLE.md)

## 1. Phase objective

Establish the approved document contract before changing the Orders implementation.

This phase defines:

- What the generated unsigned order must look like
- What the signed document upload accepts
- How series and purpose affect the generated document
- How personnel appear and participate in an order
- Which repository assets are authoritative
- Which items still require business approval

No application code is changed in Phase 0.

## 2. Authoritative inputs

| Input | Decision |
|---|---|
| `Format Example -- Travel Purpose.docx` | Visual reference for the existing Travel Letter Order |
| `PNP_ITMS_Letter_Orders_Format_Template.md` | Primary layout and formatting specification |
| `src/assets/pnp-logo.png` | Left-side PNP emblem source |
| `resources/ITMS-LOGO.jpg` | Right-side ITMS seal source |
| Shared Personnel data | Source for personnel selectors, IDs, ranks, names, badges, and units |

The Markdown template specification is the primary construction reference. The DOCX is the visual comparison reference.

## 3. Confirmed document contract

### 3.1 Two separate document types

Each order may contain two independently managed documents:

| Document | System behavior |
|---|---|
| Generated order | Server-generated unsigned DOCX using the approved template |
| Signed order | User-uploaded scan or photograph of the physically wet-signed order |

The signed image must never overwrite the generated DOCX.

The signed-document workflow records the physical signing step. It is not an electronic-signature workflow and must not validate digital certificates or embedded signing credentials.

### 3.2 Generated order number

The canonical order number is:

```text
ITMS-{SERIES}-{PURPOSE}-{YEAR}-{SEQUENCE}
```

Example:

```text
ITMS-SO-TR-2026-0001
```

The full canonical number should appear in both locations:

1. The generated document's `NUMBER` line
2. The order metadata and register

The legacy reference value such as `NUMBER 2026-767` must not be generated for new orders.

### 3.3 Series headings

| Series | Code | Generated heading |
|---|---|---|
| General Order | GO | GENERAL ORDERS |
| Special Order | SO | SPECIAL ORDERS |
| Letter Order | LO | LETTER ORDERS |

The selected series controls the heading without changing the common document layout.

### 3.4 Fixed layout elements

These elements are controlled by the system template:

- `RESTRICTED` header
- PNP letterhead
- PNP logo
- ITMS logo
- Institutional heading
- `ITMS` office identifier
- Series heading
- `NUMBER` label
- `SUBJECT` label
- Authority and signature layout
- `OFFICIAL:` label
- `DISTRIBUTION:` label
- `RESTRICTED` footer

### 3.5 Editable/generated fields

These values are supplied by the order and purpose data:

- Issuance date
- Canonical order number
- Subject
- Purpose-specific narrative
- Personnel roster
- Personnel roles
- Travel or purpose-specific details
- Command authority
- Signatory
- Signatory title
- Certifying official
- Distribution code

## 4. Approved template layout baseline

The generated DOCX should use:

- A4 portrait page size
- Arial typography
- 12 pt main body text unless a template element requires a different size
- Borderless three-column letterhead table
- Borderless two-column ITMS/date table
- Proper Word header and footer sections
- Borderless signature/certification table
- Stable tab stops or tables instead of repeated spaces
- Personnel list left indentation of approximately 1.18 inches
- Justified authorization paragraph
- Single-line paragraph spacing consistent with the reference

The bottom margin from the reference should not be reproduced literally if it causes clipping. The implementation should use a real Word footer with safe page margins while preserving the visual position of `RESTRICTED`.

## 5. Repository asset contract

### PNP emblem

Source: `src/assets/pnp-logo.png`

Observed characteristics:

- 224 x 313 pixels
- RGB PNG
- No alpha channel
- Black corner/background pixels

Required action before Phase 5:

- Produce an approved print-safe derivative with transparency or a white background.
- Do not silently modify the original source asset.
- Use the derivative only for DOCX generation if the black background appears as a rectangle on white paper.

### ITMS seal

Source: `resources/ITMS-LOGO.jpg`

Observed characteristics:

- 218 x 213 pixels
- RGB JPEG
- White background

Required action before Phase 5:

- Preserve the seal's aspect ratio.
- Balance its visual height against the PNP emblem.
- Confirm that its white background does not create a visible box in the final template.

### Asset versioning

Generated-document manifests must record the template and asset versions used. This prevents a future logo update from changing regenerated historical documents without traceability.

## 6. Purpose and personnel contract

The generator must be purpose-flexible. It must not contain a Travel-only form or Travel-only document model.

Each purpose definition must provide:

- Purpose code and label
- Subject label
- Required fields
- Optional fields
- Narrative builder
- Personnel roles
- Template key
- Validation rules

Personnel selectors must use the shared Personnel tab data and store stable personnel IDs.

Personnel must be role-aware. Examples include:

- Affected personnel
- Travelling personnel
- Driver
- Recipient
- Relieved personnel
- Replacement personnel
- Recommending authority
- Appointing authority
- Witness
- Other involved personnel

Generated documents must store a personnel snapshot containing the rank, name, badge number, unit, role, and display order used at generation time.

## 7. Initial purpose coverage decision

The first release will use one flexible registry for all controlled purpose codes.

The initial high-fidelity templates should cover:

- Travel
- Designation
- Assignment
- Detail
- Reassignment
- Leave
- Award
- Promotion

The remaining codes must still have:

- A registered purpose definition
- Required-field validation
- Personnel-role rules
- A generated document path

They may initially use a shared administrative-order layout with purpose-specific fields and narrative until a dedicated official format is approved.

## 8. Signed image upload baseline

Confirmed business requirement:

- The uploaded signed document is a scan or photograph of a physically wet-signed order.
- The uploaded scan represents the official signed copy associated with the generated order.
- The original scan must be preserved as uploaded, subject to secure storage and versioning.
- The system does not create, verify, or replace the physical signature.

Proposed first-release technical policy:

- Accepted formats: JPEG, PNG, and WEBP
- Maximum size: 25 MB
- Private storage only
- MIME type and file-signature validation required
- View and download through short-lived signed URLs
- Replacement and removal controlled by order status and permissions

The accepted image formats and maximum size remain approval points because the reference materials do not specify them.

## 9. Workflow baseline

Proposed workflow behavior:

| Status | Generated DOCX | Signed image |
|---|---|---|
| Draft | Generate, view, download, regenerate | Upload, replace, remove |
| For Approval | View, download, controlled regeneration | Upload or replace if authorized |
| Signed | View/download only | Required before entering this status |
| Released | View/download only | View/download only |
| Archived | View/download only | View/download only |
| Revoked | Retained for audit | Retained for audit; restore follows existing controls |

## 10. Approval points before Phase 1

The following items require business confirmation before implementation begins:

- [ ] Confirm the 25 MB signed-image limit.
- [ ] Confirm JPEG, PNG, and WEBP as the accepted signed-image formats.
- [ ] Confirm the command-authority text for GO, SO, and LO.
- [ ] Confirm the default signatory and signatory title.
- [ ] Confirm the certifying official block.
- [ ] Confirm the default distribution code, including whether `"C"` is correct for all purposes.
- [x] Confirm that the signed upload is a scan or photograph of a physically wet-signed order.
- [ ] Confirm whether Signed status must always require an uploaded signed image.
- [ ] Confirm the first-release purpose formats that require dedicated templates instead of the shared administrative layout.
- [ ] Approve the print-safe PNP logo derivative.

## 11. Phase 0 exit criteria

Phase 0 is complete when:

- The generated and signed document responsibilities are approved.
- The canonical order-number placement is approved.
- Series headings are approved.
- The common layout and fixed fields are approved.
- The purpose registry contract is approved.
- Personnel roles and snapshot behavior are approved.
- Signed-image file rules are approved.
- Authority, signature, and distribution defaults are approved.
- Logo handling is approved.

After these decisions are confirmed, Phase 1 can begin with the shared catalogs and purpose-definition registry.
