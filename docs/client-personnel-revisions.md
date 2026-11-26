# Personnel duties and strength reporting

Retired personnel remain stored and searchable. Current strength excludes Retired (including legacy Optional Retirement and Compulsory Retirement statuses); All personnel includes them. DUTY/DUE RET remains included in current strength. Status changes require an administrator action; no age-based retirement is performed.

The home posting remains in sub_unit / division and station. countedUnit is an optional explicit headcount destination. dutyAssignments stores Main, Detail, Additional, and Technical assistance duties, with optional designation and orderRef. additionalDesignations supplements the primary designation. One personnel ID contributes one headcount, regardless of the number of duties.

Dashboard and Reports share the same division-strength calculation, status scope, and organization mappings. Reports exports follow the displayed scope and advanced filters. ITPMD personnel counted at external units appear under ITPMD Detailed with their credited unit as the child. ARMD's Personnel Holding & Accounting section appears separately as ARMD, PHAS. Missing home/counting units appear under Needs assignment; unrecognized organization mappings appear under Other units / Needs mapping. Both remain in totals. Source code B178 is intentionally not merged with SMD: its different code and name require review.

## Database rollout

1. Run backend/scripts/migrate_personnel_duties.sql in the connected Supabase SQL editor. It only adds columns and comments.
2. Preview the five named corrections with `node backend/scripts/apply_client_personnel_corrections.js`.
3. Apply with `node backend/scripts/apply_client_personnel_corrections.js --apply`. The script requires a live database, rejects missing/ambiguous identities, and fills only empty fields. Rerunning it does not overwrite later edits.
4. Restart the backend to load the updated payload allowlist and validation. No October roster reimport is needed.

Deployment order is schema, backend, frontend. Existing clients can continue reading/writing older fields. New fields are optional for older personnel records. Removing the new UI code does not remove stored duty data or history.

## Order templates

Template drafts now store personnelIds. Legacy personnelId drafts load as a single selection; existing descriptions and shared order fields are retained. Preview, HTML download/print, and paginated PDF use the same selected-personnel rows, including badges, home units, and all designations. A missing selected personnel ID blocks export until removed or reselected. Template drafts remain drafts; official numbering and issuance continue through the existing Orders register.

## Verification

Run `npm run typecheck`, `npm run build`, and `npm test`. The clientPersonnelRevisions test covers corrections, retirement, headcount reconciliation, missing mappings, persistence and validation, legacy drafts, and large multi-person selections. Browser verification should include expanding division/section totals, checking the same scope in Reports exports, saving a NUP duty edit without requiring a badge, and a PDF spanning multiple pages.
