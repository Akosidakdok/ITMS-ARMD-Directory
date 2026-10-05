# Implementation and Release Tracker

**Last reviewed:** October 5, 2026  
**Purpose:** Track unfinished repository work, policy decisions, and release tasks in one place.

This tracker is based on the code and project documents in the repository. The state of the target Supabase project, formal approvals, and production deployment cannot be confirmed from the repository; record evidence here when those items are checked.

Check an item only after the change is implemented or the external verification is recorded. The older [feature gaps checklist](FEATURE_GAPS_CHECKLIST.md) is dated August 2026 and contains broad ideas; treat it as a source to review, not as an approved backlog.

## 1. Repository implementation work

### P1 — Complete the expanded personnel import

**Status:** Open; reconcile the plan with the fields already supported before coding.

The [personnel import plan](../features/personnel-import/PERSONNEL_IMPORT_IMPLEMENTATION_PLAN.md) describes a larger import change. The current code already supports many personnel fields, so finish only the verified gaps.

- [ ] Compare the plan's field contract with the current CSV/XLSX parser, API allowlists, personnel model, and UI.
- [ ] Add multi-value `subUnits` support through import, storage, editing, search/filtering, reports, and exports; this property is not currently present in the application code.
- [ ] Review sensitive identifier handling. The plan calls for a separate admin-only store; no `personnel_private` implementation is currently present. Confirm which identifiers may be imported and prevent them from leaking into general reads or exports.
- [ ] Add the required additive database migration and transactional import path. The proposed `backend/scripts/migrate_personnel_import_v1.sql` is not present.
- [ ] Add synthetic tests for populated identifiers, dates, merged headers, and multi-sub-unit values.
- [ ] Preview the 585-row source workbook in staging, review mappings and errors, and record the approved import results before any production import.

### P1 — Make Excel audit and promotion evaluation persistence deployable

**Status:** Open; migration files are missing or need to be recovered.

- [ ] Add or recover a version-controlled migration for durable Excel import audit history. The [Excel workspace plan](../features/excel/EXCEL_WORKSPACE_IMPLEMENTATION_CYCLE.md) references `backend/scripts/migrate_excel_import_audits.sql`, but that file is absent; without the table, the documented fallback is in-memory.
- [ ] Add or recover the migration for `promotion_evaluations`; the repository contains evaluation code, but no SQL migration defining that table was found.
- [ ] Verify the migrations' constraints, indexes, and Row Level Security policies against a staging Supabase project.
- [ ] Record which required migrations have been applied to each target environment.

### P2 — Close Orders compatibility work after approval

**Status:** Partly implemented; depends on the document contract approvals below.

- [ ] Compare the Phase 9 audit requirements in the [Orders workflow plan](../features/orders/ORDERS_TAB_DOCUMENT_WORKFLOW_DEV_CYCLE.md) with the current order/document audit behavior; implement any required gaps.
- [ ] Run and review [`reconcile_orders_legacy_documents.sql`](../../backend/scripts/reconcile_orders_legacy_documents.sql) against a safe environment, then record whether legacy DOCX metadata needs correction.
- [ ] Remove legacy DOCX-only compatibility fields/endpoints only after existing records are reconciled and verified accessible through the new generated-document and signed-scan paths.

### P2 — Align assignments with the Orders workflow

**Status:** Code implemented; Supabase migration and environment verification remain open.

- [x] Link assignment postings to stable order IDs while retaining legacy order-reference text.
- [x] Apply posting-related order purposes on release, honor effective dates, and retain history when postings are ended or orders are revoked.
- [x] Show linked postings in both the Orders and Assignments views; preserve order-linked assignment records from deletion.
- [ ] Apply [`migrate_order_assignment_coexistence.sql`](../../backend/scripts/migrate_order_assignment_coexistence.sql) in staging and production.
- [ ] Verify designation, reassignment, detail, extension, termination, future-effective, revoke, and restore flows against the target Supabase schema.

## 2. Decisions and approvals needed

### Promotion scoring policy

**Status:** Waiting for an approved scoring worksheet or governing policy.

- [ ] Approve the scoring source, factor weights, caps, and formulas for PCO and PNCO evaluations.
- [ ] Confirm the rules for awards, service reputation, interview ratings, diversity duration, overlapping assignments, and current-rank seniority.
- [ ] Implement and validate automatic points only after the approved rules are recorded. Current evaluation and workbook flows intentionally avoid inventing scores.

See the [promotion and disposition requirements](../requirements/INTERVIEW_FUNCTIONAL_REQUIREMENTS_PROMOTION_DISPOSITION.md).

### Orders document contract

**Status:** Several Phase 0 items remain unchecked in the [Orders Phase 0 contract](../features/orders/ORDERS_TAB_PHASE_0_DOCUMENT_CONTRACT.md).

- [ ] Confirm the signed-image size limit and accepted formats.
- [ ] Approve command-authority text for GO, SO, and LO.
- [ ] Confirm the default signatory, signatory title, and certifying official block.
- [ ] Confirm the distribution code for each purpose.
- [ ] Confirm whether an uploaded signed scan is mandatory for the Signed status.
- [ ] Approve the first-release purpose formats that need dedicated templates.
- [ ] Approve the print-safe PNP logo derivative.
- [ ] Update the contract and implementation to match the approved decisions.

## 3. Release and environment checks

**Status:** Pending evidence in the [SDLC completion audit](SDLC_COMPLETION_AUDIT.md); target-environment state is not visible in this repository.

- [ ] Complete formal user acceptance testing with authorized users; record issues and sign-off.
- [ ] Review production security, privacy, retention, and access policies.
- [ ] Apply and verify the required Supabase schema migrations and Row Level Security policies in staging and production.
- [ ] Confirm production credentials, HTTPS, CORS origins, and hosting configuration.
- [ ] Back up production data and document a successful restore into a separate environment.
- [ ] Deploy the approved release and record health checks, monitoring ownership, and post-deployment review.

## 4. Backlog triage

- [ ] Review the unchecked items in the August 2026 [feature gaps checklist](FEATURE_GAPS_CHECKLIST.md) and explicitly accept, defer, or discard each relevant item.
- [ ] Keep aspirational ideas such as notifications, SSO, collaboration indicators, and advanced reporting out of the committed backlog until they are approved.
