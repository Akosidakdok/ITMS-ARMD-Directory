# IDMIS Terminal Implementation Plan

## Purpose

Plan a secure IDMIS Terminal case monitoring module in PAIS. The request document specifies the navigation path. The three screenshots supply the visible case filters and list fields. This plan records the requirements, implementation, and remaining deployment steps.

The application implementation is in the repository. The SQL migration must be applied to Supabase before the terminal can be used. The base-system recording informed the additional workflow implementation; see [DLOS_CASE_MONITORING_VIDEO_REVIEW.md](DLOS_CASE_MONITORING_VIDEO_REVIEW.md).

## Implementation record

- Authentication uses PAIS Supabase Auth. Every DLOS API request checks an explicit `dlos_user_access` grant. Superadmins manage grants at `/dlos-access`; PAIS admin status alone grants no DLOS access.
- Navigation uses `/dlos` (year), `/dlos/:year` (month), and `/dlos/:year/:month` (Case Monitoring). Grave and Less Grave are filters inside Case Monitoring; the selected type stays in the URL query, and legacy classification routes remain supported. Year and month use the case registration date. The picker lists 2000 through three years ahead, plus any other years with records; direct year entry supports 1900–2100.
- Grave and Less Grave use the same case-monitoring screen and issue separate classification queries. The screenshot filters, wide list, sorting, and server-side pagination are implemented.
- The Actions menu includes all seven recorded actions: Case Details; Refer Case; Case Updates; Change Assigned SHO; Date Receive by SHO; Respondent; Upload Transmittal/PCE. Referral reasons enter the case audit history. Case Details has complaint, complainant, respondent, witness, and attachment tabs. Case Updates has nine structured steps, step-specific fields, respondent-linked implementation orders, document history, and a no-document option. SHO changes record a selected officer, memorandum date, and memorandum file. Uploads accept PDF, JPEG, PNG, or WEBP through private Supabase Storage, up to 10 MB; Transmittal/PCE uploads include a document date.
- New cases use the visible screenshot status `For Updating by DLOS Encoder`. The status filter lists values visible in the recording. An encoder or reviewer can explicitly choose one of those statuses with an audit reason. The recording does not establish permitted transitions, so saving workflow steps does not automatically change case status.
- The recording did not open every milestone form. The unshown forms use a date and document slot as a working implementation; their exact field rules and dropdown values require comparison with the live base system before operational rollout.
- SHO aging counts calendar days from receipt by SHO to resolution, or to the current Asia/Manila date while unresolved. Review aging counts calendar days from resolution by SHO to decision issuance, or to the current Asia/Manila date while undecided. Missing start dates display the screenshot labels instead of zero.
- Case writes and audit events use atomic SQL functions with optimistic version checks. DLOS reads and writes fail closed when Supabase is unavailable. DLOS tables and the document bucket are private.

### Deployment

1. Apply or reapply `backend/scripts/migrate_dlos_case_monitoring.sql` in the target Supabase project using the SQL Editor. It adds the workflow and complaint fields to any existing DLOS tables. Apply in staging first and verify table RLS, function grants, private storage bucket, and migration rerun.
2. Configure the backend's existing Supabase URL and service-role key. The browser must not receive the service-role key.
3. Sign in as a PAIS superadmin, open **IDMIS Terminal Access**, create or grant the required special accounts, and have users sign in again to refresh their navigation entitlement.
4. Verify one viewer, one encoder, one revoked account, one Grave case, one Less Grave case, a dated update, an SHO date, a document upload/download, and year/month filtering before production release.

## Reviewed request and screenshots

The request in `dlos/PAIS NEW FEATURE.docx` names the **DLOS Encoder NSU Terminal** and describes:

```text
DLOS → Authentication → Year Picker → Month Picker → Grave or Less Grave → Case Monitoring
```

Grave and Less Grave each have their own Case Monitoring screen. The user clarified that authentication is required and access is for special accounts only.

The screenshots show these search fields:

- Rank, first name, middle name, and last name.
- DIDM/NSU docket number.
- Presidential confirmation, when applicable.
- Docket number under summary hearing.
- DIDM reference number.
- Unit/Office case from.
- Case status.
- Date field selector and inclusive date range.

The screenshots show these result fields, split across the horizontally wide table:

- Docket number; DIDM/NSU docket number; DIDM reference number.
- Name or names; unit; case source; case status.
- Complaint and forwarded-to-DLOD dates.
- Name of SHO; received-by-SHO and resolved-by-SHO dates.
- Case aging for SHO and review/approval stages.
- Encoder details and an Actions menu.

Visible sample values include `IAS`, `For Updating by DLOS Encoder`, `Case not yet receive by SHO`, and `Decision Not Yet Issued`. These are examples from screenshots, not an approved complete set of statuses or source values.

## Findings from the current PAIS implementation

- `src/App.tsx` defines lazy-loaded routes under the authenticated application. It also has a route loader map for direct links and refreshes.
- `src/components/layout/Sidebar.tsx` defines the main navigation. It currently has no DLOS item.
- `src/services/api.ts` uses the shared `apiFetch` helper to attach the PAIS session token.
- `backend/server.js` authenticates `/api/*` routes, then applies `requireAdminForMutation`. Authenticated users can currently read all mounted APIs; only admins and superadmins can mutate them.
- `backend/middleware/auth.js` recognizes `view_only`, `admin`, and `superadmin`. It has no DLOS-specific access entitlement.
- `backend/store/repository.js` uses Supabase as the persistent store and falls back to in-memory records when Supabase is unavailable. New DLOS records must not appear successfully saved when they exist only in process memory.
- There is no DLOS page, API, model, or migration in the repository. Existing case or discipline workflows do not provide a suitable DLOS source of truth.

## Requirements and assumptions

### Confirmed scope

1. A user must authenticate before entering the IDMIS terminal.
2. Only explicitly authorized special accounts may access DLOS.
3. The path has year and month selection followed by Grave or Less Grave selection.
4. Each classification has a Case Monitoring screen.
5. The filters and result fields listed above must be represented.

### Working assumptions for planning

- Reuse the existing Supabase Auth sign-in and PAIS token. Add a separate DLOS entitlement check after sign-in; do not create a second password store.
- Do not automatically grant DLOS access to every PAIS admin, superadmin, or view-only user. Access must be explicitly assigned.
- Use shared case-list and detail components for Grave and Less Grave. Keep classification in each record and route so the screens remain distinct while validation and display stay consistent.
- Treat the actions menu as access to view and maintain a case record. Define its exact actions and allowed status transitions during requirements confirmation.
- Keep non-DLOS PAIS navigation and records outside this feature's scope.
- Do not expose DLOS records through existing general-purpose APIs.

## Original planning decisions

These decisions informed the design. The implementation record above states the choices confirmed during development. Any future status transitions still need their own policy specification.

| Decision | Why it matters | Proposed default if stakeholders approve |
|---|---|---|
| Canonical product and breadcrumb wording: DLOS, DLOD, or both | Request title and screenshot breadcrumb use different labels. | Use `IDMIS Terminal` in the module; retain DLOD only where it is the official office or date-field label. |
| What makes an account a special account, and who grants/revokes access | Current PAIS roles do not provide DLOS-only access. | Maintain explicit DLOS entitlements by Supabase user ID; superadmin grants and revokes them. |
| DLOS permissions after access: view, encode/edit, review/approve, administer accounts | The screenshot shows an encoder and review/approval aging, but no role matrix. | Define `viewer`, `encoder`, and `reviewer` capabilities; grant each explicitly. Keep account administration superadmin-only. |
| Official date used to group a case into year and month | The screen also has multiple case dates and a selectable date filter. | Use an explicitly named case filing/registration date. Do not infer the grouping date from whichever date happens to be present. |
| Meaning and source of each name filter | Screenshot has rank/name filters, multiple names, and a separate Name of SHO column. | Filter involved personnel and SHO separately or expose an explicit person role selector; do not silently conflate the two. |
| Complete field definitions and requiredness | Screenshots do not show forms or validation. | Approve a field dictionary and sample blank/nonblank records before migration. |
| Presidential confirmation values and applicability | Screenshot shows a selector but not its options or meaning. | Confirm the controlled values; support not applicable separately from unknown. |
| Case status values and permitted transitions | One screenshot value is not a complete workflow. | Approve a status state machine, including correction, completion, reopening, and cancellation behavior. |
| Aging rules for SHO and review/approval | No units, business calendar, pause rules, or start/stop conditions are shown. | Store source dates; calculate age on the server under an approved calendar and stage rule. Display unavailable when required dates or state are missing. |
| Docket identifier uniqueness and duplicate handling | Dockets may repeat across year, classification, or source. | Preserve identifiers as text; add a uniqueness rule only after source data is profiled and the scope is approved. |
| Existing-data source and initial load | Request does not identify a workbook, legacy database, or import process. | Decide whether initial records are hand-entered or migrated; require a mapped sample and reconciliation before bulk loading. |
| Export, print, notifications, and attachments | Not specified in the request or screenshots. | Exclude from the first release unless separately approved. |

## Recommended architecture

```text
PAIS sign-in
    ↓
DLOS entitlement check
    ↓
Year picker → Month picker → Grave / Less Grave
    ↓
Filtered case list → Case details and permitted actions
    ↓
Authenticated DLOS API → DLOS repository → Supabase tables
```

### Authentication and account access

- Keep the existing PAIS authentication as the identity provider. After a successful sign-in, require a DLOS-specific entitlement before showing the terminal.
- Add DLOS access information to the authenticated session response. Keep DLOS capability separate from the PAIS-wide `role` field.
- Add backend middleware for every `/api/dlos` request. Check the current user's entitlement on the server; hiding a navigation item is not access control.
- Require an explicit account grant for all DLOS reads and writes. Do not let the current global rule, where all authenticated accounts can read mounted APIs, determine DLOS access.
- Keep role capabilities narrow: viewers can read; encoders can create and edit permitted fields; reviewers can perform approved review transitions; only superadmins can grant or revoke DLOS access unless the organization assigns that duty elsewhere.
- Deny DLOS access cleanly for an authenticated but unentitled user. Show an access-denied page with a route back to the PAIS dashboard. Keep unauthenticated users on the normal PAIS sign-in flow.
- Record who granted/revoked access and when. Avoid exposing the DLOS access roster through normal PAIS account reads.

### Frontend

- Add a DLOS navigation item in `src/components/layout/Sidebar.tsx`, visible only after the user's DLOS entitlement is known and granted.
- Add lazy-loaded DLOS routes in `src/App.tsx` and register their loaders so direct links and reloads work.
- Preserve year and month in route parameters, with selected classification in the URL query. Suggested route shape:

  ```text
  /dlos
  /dlos/:year
  /dlos/:year/:month
  ```

- Open Case Monitoring directly after month selection. Show prominent Grave and Less Grave filters inside the page; persist the selected type in the URL and query only that classification.
- Present clear back navigation and breadcrumbs at each step. Limit month choices to valid months; show a useful empty state when a year or month has no records.
- Keep shared filters, table, case-detail, and editor components. Keep `classification` explicit in the selected filter, API query, and record.
- Implement the screenshot's filters with labels and keyboard support. Provide Search and Clear actions; do not refetch on every keystroke unless the final interaction design calls for it.
- Keep the wide table usable on small screens with horizontal scrolling, a persistent identifying column where practical, and accessible row actions. Offer page sizes such as 10, 25, and 50; keep pagination server-side.
- Provide loading, empty, error, save, and permission-denied states. Do not show an aging value as zero when it cannot be calculated.
- Fetch case lists when a DLOS route is opened. Do not load sensitive case records into the global `AuthRoleContext` at application startup.

### Data model

Use Supabase/PostgreSQL as the authoritative store. Keep docket numbers and other official identifiers as text so punctuation and leading zeros survive.

#### `dlos_cases`

Candidate fields; finalize names, types, requiredness, and controlled values in the approved field dictionary:

| Field group | Candidate fields |
|---|---|
| Identity and grouping | `id`, `classification` (`grave` or `less_grave`), approved `caseDate`, created/updated timestamps |
| Dockets and references | `docketNumber`, `didmNsuDocketNumber`, `didmReferenceNumber`, `summaryHearingDocketNumber` |
| Case attributes | presidential confirmation value, `unitOfficeCaseFrom`, `caseSource`, `caseStatus` |
| Case dates | `complaintDate`, `forwardedToDlodDate` |
| SHO tracking | SHO personnel link if available, SHO display-name snapshot, `receivedByShoDate`, `resolvedByShoDate` |
| Review/decision | approved review stage, `decisionIssuedDate`, and any other confirmed decision dates |
| Provenance | `encodedByUserId`, encoder display-name snapshot, source system/record reference, created/updated user IDs |
| Lifecycle | `archivedAt` and `archivedByUserId` if archival is approved |

`caseDate` is a placeholder for the approved year/month grouping date; it is not a proposed synonym for complaint date. If one case can have multiple involved people, store them in a related table rather than packing names into one string.

#### `dlos_case_personnel`

Use a join table when one case can name multiple people. Store `caseId`, nullable PAIS `personnelId`, a role such as complainant/respondent/SHO only if confirmed, and a name/rank snapshot. The snapshot preserves the wording shown on historical cases when a PAIS profile is later renamed. Do not automatically link a name to a PAIS person based only on a fuzzy text match.

#### `dlos_case_events`

Keep an append-only case event history for creation, material field corrections, status transitions, SHO date changes, review/decision events, archival, and access-relevant actions. Store case ID, event type, changed fields or before/after values as approved, actor user ID, timestamp, and optional reason. Avoid logging full sensitive case content or credentials.

#### `dlos_user_access`

Store explicit DLOS account entitlement and capability by authenticated Supabase user ID, status, grantor, grant time, and revocation metadata. If the database team prefers Supabase `app_metadata`, document and secure the grant path there instead; do not accept a role supplied by the browser.

#### Database controls

- Add idempotent SQL in `backend/scripts/migrate_dlos_case_monitoring.sql`.
- Add indexes for the approved grouping date and classification, status, each searchable docket/reference field, unit, and date filters. Add only indexes supported by the actual list query.
- Enable RLS and block direct client access to DLOS tables. Keep data access behind the authenticated backend and its configured server credential.
- Apply foreign keys only after verifying the deployed `personnel.id` type and deletion behavior. Preserve case history if a linked personnel profile is removed or merged.
- Avoid hard deletion for operational cases. Prefer archival with event history, subject to the approved retention rule.
- Add a migration verification section for columns, indexes, RLS, grants, and foreign keys. Apply first in staging and reconcile sample rows before production.

### Backend API and validation

Add `backend/routes/dlosRoutes.js`, `backend/controllers/dlosController.js`, DLOS validation helpers under `backend/schemas/`, and DLOS repository methods following the existing Supabase repository pattern. Mount the router in `backend/server.js` with DLOS entitlement middleware before its handlers.

Proposed API contract:

| Method | Route | Purpose |
|---|---|---|
| `GET` | `/api/dlos/options` | Return available years and months, derived from authorized DLOS records. |
| `GET` | `/api/dlos/cases` | Search cases by year, month, classification, screenshot filters, sort, page, and page size. |
| `GET` | `/api/dlos/cases/:id` | Read one case with associated names and current event summary. |
| `GET` | `/api/dlos/cases/:id/history` | Read permitted case history. |
| `POST` | `/api/dlos/cases` | Create a case with server-derived encoder identity and initial event. |
| `PATCH` | `/api/dlos/cases/:id` | Update allowed fields and add a history event. |
| `POST` | `/api/dlos/cases/:id/actions` | Apply an approved status/workflow action with transition validation. |

Implementation rules:

- Validate every query and body on the server. Reject invalid classification, date ranges, status transitions, oversized text, unsupported sort fields, and excessive page sizes.
- Build SQL filters from an allowlist. Use parameterized Supabase filters and deterministic ordering; never interpolate user strings into SQL.
- Apply all active filters together. Treat date bounds as inclusive date-only values under the approved business timezone.
- Return paginated data plus `total` and normalized filter metadata. Keep search and filter logic on the server so pagination totals remain correct.
- Set encoder identity from `req.user`; never trust `encodedBy` from the request body.
- Enforce capability per operation in the backend. A valid PAIS token alone is insufficient for DLOS access.
- Validate state transitions centrally and write the record update plus event atomically where possible. If a database transaction/RPC is needed, add a narrowly scoped function in the migration.
- Fail closed when Supabase is unavailable. Return a service error for DLOS reads/writes rather than returning an empty list or acknowledging an in-memory-only save.
- Return consistent `{ success, data, message }` envelopes and clear 400/401/403/404/409/503 status codes.

### Search and display contract

Map visible controls to canonical fields after the field dictionary is approved:

| Screenshot control/column | Planned data behavior |
|---|---|
| Rank and first/middle/last name | Search the approved person role(s); support several names per case. Keep SHO filtering distinct if needed. |
| DIDM/NSU docket number | Exact or prefix search on stored text; final matching behavior to confirm. |
| Presidential confirmation | Filter by the approved controlled value; allow a separate not-applicable value. |
| Summary hearing docket number | Search its dedicated text field. |
| DIDM reference number | Search its dedicated text field. |
| Unit/Office case from | Use approved option list or text search; decide whether the source is historical free text or a controlled directory. |
| Case status | Filter by approved status values. |
| Filter date by / range | Select among approved date fields; inclusive start and end dates. Clarify handling of missing dates. |
| Docket numbers and references | Render each as text without numeric conversion. |
| Name/s | Render all linked name snapshots, with a details affordance when the list is long. |
| Case date details | Show complaint and forwarded-to-DLOD labels and dates. |
| Name of SHO / SHO date details | Display assigned SHO and received/resolved dates from separate fields. |
| Case aging | Show stage-specific result from the approved server calculation and its as-of date. |
| Encoder details | Show source/encoder provenance plus created/updated metadata allowed for that user. |
| Actions | Show only actions the user's DLOS capability permits and the current state allows. |

## Implementation sequence

### Phase 0 — Confirm field, workflow, and access rules

1. Review the screenshots with the DLOS users and capture a sample completed case and a blank case form.
2. Approve the field dictionary, official grouping date, classification values, name roles, controlled lists, date semantics, and duplicate policy.
3. Approve account grant/revoke process and viewer/encoder/reviewer permissions. Verify that unentitled PAIS users must not read DLOS records.
4. Define status transitions, required fields per transition, corrections, archival, SHO/review aging, and the approved calendar/timezone.
5. Decide whether to load existing records; obtain an authorized sanitized sample and define reconciliation totals.

**Gate:** Signed-off requirements include complete example records, role matrix, status table, year/month date rule, and aging examples with expected results.

### Phase 1 — Secure database and API foundation

1. Add the idempotent migration, DLOS tables, indexes, RLS, and scoped transaction/RPC functions if needed.
2. Add explicit DLOS access storage or a verified protected metadata mechanism and an auditable grant/revoke path.
3. Add route middleware, capability checks, input validation, repository methods, and fail-closed Supabase behavior.
4. Add endpoint contracts for access, available years/months, filtered list, details/history, create, edit, and workflow actions.
5. Apply the migration in staging; inspect policy/grant state and verify that a PAIS account without DLOS access receives 403 on every DLOS API route.

**Gate:** DLOS data is unavailable to unentitled users even with a valid PAIS token; authorized read/write capabilities match the role matrix; failed database writes leave no partial case/event.

### Phase 2 — Navigation and year/month/classification flow

1. Add DLOS route loaders and nested routes in `src/App.tsx`.
2. Add the entitlement-aware navigation entry in `Sidebar.tsx` and an access-denied route guard.
3. Implement Year Picker, Month Picker, and Grave/Less Grave selection from server-returned availability.
4. Preserve selection in the URL; support browser back, refresh, and direct links.
5. Add empty, loading, unavailable, and denied states.

**Gate:** Only entitled accounts enter DLOS; each navigation step is recoverable from URL and browser history; no invalid year/month/classification reaches a case list.

### Phase 3 — Case Monitoring lists and filters

1. Add DLOS types in `src/types/dlos.ts` and a dedicated client in `src/services/dlosApi.ts` using `apiFetch`.
2. Implement the Grave and Less Grave Case Monitoring screens using a shared page shell.
3. Add all approved screenshot filters, Search, Clear, result count, sort, and server-side pagination.
4. Display the approved columns with responsive horizontal scrolling and accessible names/actions.
5. Keep filters in the URL query string where appropriate so a user can share or reopen a filtered view subject to DLOS access.

**Gate:** Each screenshot field filters the intended data; intersections, empty results, pagination, sorting, and date boundaries are correct; no case data leaks into general PAIS state or endpoints.

### Phase 4 — Case details, encoding, and status actions

1. Implement case details and create/edit forms from the approved field dictionary.
2. Support multiple case names through linked personnel snapshots and optional confirmed PAIS-person links.
3. Add Actions menu entries according to role and state: view, edit, assign/update SHO, submit for review, record decision, or archive only where approved.
4. Validate transitions on the server; record every material action in `dlos_case_events`.
5. Display event history, source system, encoder identity, and created/updated timestamps.
6. Implement aging after the expected-value examples are approved; calculate it server-side and expose a clear as-of date.

**Gate:** Create/edit/action flows preserve all fields and name snapshots; invalid transitions fail with no partial update; history identifies actor, action, and time; aging matches all approved examples.

### Phase 5 — Initial data load and rollout

1. If legacy data is supplied, build a separate validated import with preview, duplicate detection, source-row errors, and before/after reconciliation. Do not load an unreviewed spreadsheet directly into production.
2. Back up Supabase before migration and load. Verify counts by year, month, and classification plus sample docket/name/date records.
3. Provision only approved special accounts and validate grant/revoke behavior.
4. Run user acceptance scenarios with DLOS encoders, reviewers, and viewers.
5. Release behind explicit DLOS entitlements; monitor API errors, denied access, database failures, and correction history.

**Gate:** Reconciled records, successful UAT sign-off, verified access roster, tested backup/restore, and support owner identified.

## Likely code and documentation changes

| Area | Expected files |
|---|---|
| App routing | `src/App.tsx` |
| Main navigation | `src/components/layout/Sidebar.tsx` |
| DLOS pages/components | `src/pages/DlosPage.tsx`; `src/components/dlos/` for picker, filters, table, detail, forms, and history |
| DLOS types/client | `src/types/dlos.ts`; `src/services/dlosApi.ts` |
| Backend route wiring | `backend/server.js`; `backend/routes/dlosRoutes.js` |
| Backend behavior | `backend/controllers/dlosController.js`; `backend/schemas/`; DLOS repository methods in `backend/store/` |
| Database | `backend/scripts/migrate_dlos_case_monitoring.sql` |
| Auth capability | `backend/middleware/` and `backend/controllers/` or a dedicated access module; frontend route guard |
| Documentation | This plan and the documentation index; add a field/status specification after Phase 0 decisions. |

Avoid adding DLOS records to `AuthRoleContext`'s initial bulk data load. The terminal should fetch its records only after entitlement and route selection.

## Acceptance criteria

1. Unauthenticated users must sign in before entering DLOS.
2. Authenticated users without explicit DLOS access cannot see the terminal and receive 403 from every `/api/dlos` data or action endpoint, including direct requests. Their PAIS session response may report that DLOS access is unavailable; it contains no case data.
3. Entitled users follow IDMIS Terminal → Year → Month → Case Monitoring; refresh and browser navigation preserve the selected context.
4. Case Monitoring exposes clear Grave and Less Grave filters, and each selection queries only that classification.
5. Every approved screenshot filter is available, labeled, validated, and applied on the server.
6. Lists show all approved docket, reference, name, unit, source, status, date, SHO, aging, and encoder fields with responsive access to wide columns.
7. Pagination totals and selected sort remain correct with active filters.
8. Create and edit actions validate required fields and preserve official identifiers as text.
9. Server derives encoder identity; users cannot impersonate another encoder by changing request data.
10. Approved state transitions and date updates produce an auditable event; invalid transitions do not change the case.
11. Aging uses the approved formula and date convention; missing inputs are shown as unavailable, never as zero.
12. Supabase outage produces a clear error and never reports an in-memory-only DLOS save as successful.
13. DLOS records do not appear in general PAIS APIs, reports, exports, or other modules unless separately approved.
14. Data migration, if in scope, reconciles counts and representative records before release.

## Verification plan for implementation

When this plan is implemented, verify:

- DLOS grants, revocations, direct route access, and API access for unauthenticated, PAIS-only, viewer, encoder, reviewer, admin, and superadmin accounts.
- Year/month availability, empty periods, invalid route parameters, refresh, back/forward navigation, and classification isolation.
- Each filter independently and in combinations; exact/prefix matching; blank values; inclusive range boundaries; date-only timezone handling; pagination and deterministic sort.
- Multiple associated names, missing PAIS match, renamed personnel snapshot, duplicate docket cases, and long text.
- Required field validation, permitted edits, transition guardrails, concurrent edits, event history, archival/restoration if supported, and actor attribution.
- Every approved aging example, including unassigned SHO, not-yet-received, received but unresolved, resolved, decision pending, decision issued, and paused/returned cases if those stages exist.
- Supabase unavailable behavior, partial-write protection, RLS/grant inspection, migration rerun, staging restore, and authorized initial-data reconciliation.
- Responsive use, keyboard-only filtering and actions, accessible table labels, readable dates/statuses, and clear empty/error/denied states.

## Out of scope until separately confirmed

- Automated integration with IAS or another DLOS source system.
- Spreadsheet migration/import tooling beyond a specifically approved initial-load requirement.
- Document generation, external notifications, and exports.
- Changes to existing PAIS personnel, assignment, orders, or promotion workflows.
- New case statuses, aging formulas, role grants, or retention periods not approved by DLOS stakeholders.
