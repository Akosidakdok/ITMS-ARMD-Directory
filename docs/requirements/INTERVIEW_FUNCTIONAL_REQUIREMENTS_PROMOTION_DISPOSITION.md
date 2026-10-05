# Interview-Derived Functional Requirements: Disposition and Promotion Support

This document converts the interview transcript into requirements for the PNP ITMS PAIS system.

The interview identifies two related but separate capabilities:

1. **Personnel disposition statistics** — automatic counts of personnel by unit and rank.
2. **Promotion evaluation support** — a points-based evaluation using awards, diversity of assignments, service reputation, interview rating, seniority, and other qualifications.

The disposition statistics must not be treated as part of the promotion score unless the approved policy later says so.

---

## Part 1 — Functional Requirements Explanation

### 1. Personnel disposition statistics

The system must automatically calculate and display personnel totals for disposition and administrative reporting.

At minimum, users should be able to see:

- The number of personnel in each unit.
- The number of personnel in each rank.
- The number of personnel by unit and rank together, where useful.
- Totals that update when personnel records or assignments change.

These statistics are reporting/disposition information. They are not automatically promotion points.

The existing PAIS personnel fields such as `unitCategory`, `sub_unit`, `division`, `rank`, `rankCategory`, and `status` should be reused where possible. The design should clearly define whether a count is based on a person's current personnel record, current assignment, or both.

### 2. Promotion evaluation

The system must support a promotion evaluation separate from the promotion-history record.

The interview identifies these possible evaluation factors:

- Awards
- Diversity of service assignments
- Service reputation
- Interview rating
- Seniority/current-rank tenure
- Other approved qualifications

Each factor has a corresponding point value. The system should calculate a candidate's total score from an approved scoring configuration rather than embedding unexplained constants in the frontend.

The existing promotion-history module records rank changes and promotion dates. It does not yet represent a complete promotion evaluation. Promotion history and promotion evaluation should therefore be related but separate records or concepts.

### 3. Diversity-of-assignment calculation

The system must calculate how long a personnel member has served in each geographic area:

- Luzon
- Visayas
- Mindanao

The calculation must use assignment `startDate` and `endDate` values. If an assignment is still active and has no end date, the system should calculate through the current date.

The output should include, at minimum:

- Total service duration in Luzon.
- Total service duration in Visayas.
- Total service duration in Mindanao.
- The unit of measurement used by the official policy, such as days, months, or years.
- The source assignment records used in the calculation.

The system must define how overlapping assignments, missing dates, invalid date ranges, and assignments without a geographic region are handled. These cases should produce warnings or review flags rather than silently producing an inaccurate score.

The current assignment model contains dates and organizational fields but does not clearly contain a geographic-region field. A region field or approved region-mapping rule will be needed.

### 4. Awards

The system must allow awards to be recorded against a personnel member and used as an input to promotion evaluation.

The system should be able to show:

- The awards received by a personnel member.
- The number of awards.
- Award types or categories, if the scoring policy distinguishes them.
- The points contributed by awards.
- The source records supporting the award calculation.

The existing PAIS award model already links an award to `personnelId` and stores award details. The implementation should reuse these records instead of duplicating award information inside a promotion evaluation.

### 5. Seniority/current-rank tenure

Seniority for the promotion evaluation is calculated from the date of promotion to the present date. In practical system terms, this is the time the personnel member has held the current rank.

The system should:

- Identify the effective date of the current rank.
- Calculate the elapsed duration through the evaluation date.
- Display the calculation in a human-readable form.
- Convert the duration into points according to the approved scoring rules.

The current PAIS data can derive this from promotion history, `promotionDate`, `rankTo`, and the personnel record's `lastPromotionDate`. The system must resolve which source is authoritative when these values disagree.

### 6. PAIS data and externally entered information

Some promotion inputs can come from PAIS, including:

- Personnel identity and current rank.
- Promotion history and dates.
- Assignment history and dates.
- Award records.

Some inputs may remain external or manually entered, including:

- Interview rating.
- Service reputation assessment.
- Other qualifications not yet represented in PAIS.

The system should provide a controlled input area for external factors, identify who entered or approved them, and preserve an audit trail. External values must not be presented as if they were automatically sourced from PAIS.

### 7. Excel reference files

The interviewee agreed to provide a sanitized sample worksheet with names and confidential information removed. That worksheet should be treated as a reference for:

- Field names.
- Existing computation rules.
- Point values.
- Expected worksheet layout.
- Special cases and manual adjustments.

The supplied reference workbooks now provide track-specific maxima, but they contain different point distributions for PCO and PNCO tracks and some formula/source mappings still need confirmation. The system must therefore identify the track and display the reference maxima without silently inventing formulas.

### 8. Roles and auditability

Because promotion evaluation can affect personnel decisions, the system should record:

- Evaluation subject.
- Evaluation period or evaluation date.
- Factor values.
- Points per factor.
- Total score.
- Data source for each factor.
- Evaluator and approving user.
- Evaluation status, such as Draft, For Review, Approved, or Rejected.
- Created and updated timestamps.

Users should be able to distinguish calculated values from manually entered or approved values.

### 9. Acceptance criteria

The feature is functionally acceptable when:

1. A user can view personnel counts by unit and rank for disposition reporting.
2. Disposition counts are visibly separate from promotion scoring.
3. A promotion evaluation can be created for a personnel member.
4. Awards are automatically read from the personnel member's PAIS award records.
5. Diversity duration is calculated from assignment dates and approved region data.
6. Current-rank seniority is calculated from the authoritative promotion date through the evaluation date.
7. Interview rating and other external factors can be entered separately from PAIS-derived factors.
8. Each factor displays its value, points, and source.
9. The total score is reproducible from the saved evaluation data.
10. Missing, conflicting, or invalid source data is flagged for review.
11. Evaluation records can be audited after approval.
12. The system does not invent point values or scoring rules that have not been approved.

### 10. Open decisions before implementation

The following must be confirmed before the scoring engine is finalized:

- Confirmation that the supplied CY 2026 reference workbook is the approved source. Its visible maxima are PCO: Seniority 25, IPER/ratings 5, Awards 10, Diversity 25, Service Reputation 25, Interview 10; PNCO: Seniority 30, ratings 5, Awards 10, Diversity 20, Service Reputation 20, Interview 15.
- Whether points are linear, tiered, capped, or weighted.
- Whether awards are counted by number, category, level, or recency.
- The exact definition of service reputation and who may enter it.
- The format and scale of interview ratings.
- The official unit for diversity duration and rounding rules.
- How geographic region is assigned to each unit/station.
- How overlapping assignments are treated.
- The authoritative source for current-rank seniority.
- Whether an evaluation is a snapshot or recalculates when source records change.
- Who may create, edit, review, approve, and reopen an evaluation.

---

## Part 2 — Implementation Prompt

Copy and use the following prompt when implementing this feature in the PAIS repository:

> Implement the interview-derived Disposition Statistics and Promotion Evaluation capability in the existing PNP ITMS PAIS codebase.
>
> First inspect the current personnel, assignment, promotion, award, dashboard, reporting, authentication, Supabase repository, and database migration implementations. Reuse existing types, API patterns, role checks, repository methods, and UI components where appropriate. Do not replace working modules or introduce duplicate sources of truth.
>
> ### Scope
>
> Implement two separate features:
>
> 1. **Disposition Statistics**
>    - Add or extend reporting so authorized users can view automatic personnel counts by unit and rank.
>    - Support combined unit/rank breakdowns where useful.
>    - Define and document whether counts use current personnel records, current assignments, or both.
>    - Respect the existing status and organizational fields.
>    - Recalculate after relevant personnel or assignment changes.
>    - Keep this reporting separate from promotion scoring.
>
> 2. **Promotion Evaluation**
>    - Add a promotion-evaluation domain model and persistence layer separate from promotion history.
>    - Support configurable factors for awards, diversity, service reputation, interview rating, seniority/current-rank tenure, and other approved qualifications.
>    - Store the factor value, calculated or entered points, source, evaluator, status, evaluation date, and audit timestamps.
>    - Calculate a reproducible total score from saved factor results.
>    - Do not hard-code final point values until an approved scoring worksheet or policy is available. If configuration is necessary, create an explicit scoring configuration structure with safe placeholders and clear TODO/open-policy handling.
>
> ### Diversity calculation
>
> - Extend the assignment model or create an approved mapping mechanism to identify Luzon, Visayas, or Mindanao.
> - Calculate duration from `startDate` through `endDate`; use the evaluation date for active assignments without an end date.
> - Use a documented date convention and return the raw duration plus the display duration.
> - Detect and flag missing regions, missing dates, invalid ranges, and overlapping assignments.
> - Do not silently treat unknown locations as one of the three regions.
> - Add unit tests for normal, active, invalid, overlapping, and boundary-date assignments.
>
> ### Awards and seniority
>
> - Read awards through the existing personnel-linked award records.
> - Display award count/details and the resulting award points or pending-policy state.
> - Derive current-rank tenure from the authoritative promotion record and document the fallback when personnel `lastPromotionDate` disagrees.
> - Calculate tenure through the selected evaluation date, not always only through the browser's current date.
>
> ### External inputs
>
> - Add controlled fields for interview rating, service reputation, and other qualifications that are not automatically available from PAIS.
> - Label these fields as externally entered or manually reviewed.
> - Capture the entering user, timestamp, remarks, and approval status.
> - Prevent external values from being mistaken for PAIS-derived values.
>
> ### API and database
>
> - Add the necessary Supabase migration(s), indexes, RLS policies, backend repository methods, controllers, and routes.
> - Follow the existing authenticated API and admin mutation rules.
> - Ensure GET endpoints work for permitted read-only users and mutation endpoints require the appropriate administrator role.
> - Prefer server-side calculation or a shared calculation module so scores cannot differ between browsers.
> - Return calculation warnings and source references in the API response.
> - Keep the implementation compatible with the existing frontend fallback behavior, but do not use in-memory fallback as authoritative production data.
>
> ### Frontend
>
> - Add a disposition statistics view or extend the existing dashboard/reporting view.
> - Add a promotion evaluation view linked to a selected personnel member.
> - Show a clear factor-by-factor breakdown: factor, input/value, source, points, warnings, and total.
> - Distinguish calculated PAIS data from manual/external data visually.
> - Provide Draft, For Review, Approved, and Rejected states if supported by the confirmed authorization policy.
> - Use existing loading, error, modal, table, notification, and role-based UI patterns.
> - Do not expose confidential data in exports or logs.
>
> ### Validation and testing
>
> Add or update tests for:
>
> - Counts by unit.
> - Counts by rank.
> - Combined disposition counts.
> - Award aggregation.
> - Seniority/current-rank tenure.
> - Regional diversity duration.
> - Invalid and overlapping assignment handling.
> - Missing-source warnings.
> - Score calculation and reproducibility.
> - Authorization and mutation restrictions.
> - Saving, editing, approving, and retrieving evaluations.
>
> Run the complete test suite and production build. Report any pre-existing failures separately from failures introduced by this implementation.
>
> Before finalizing scoring behavior, compare the implementation against the sanitized sample worksheet when it becomes available. Treat the worksheet and approved policy as the source of truth for factors, formulas, point values, rounding, and exceptions. If they conflict with this prompt, stop and document the conflict instead of silently choosing a formula.
