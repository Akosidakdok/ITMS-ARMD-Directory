# DLOS Case Monitoring: base-system video review

Source: `dlos/case monitoring features.mp4` (2:46). Reviewed against the PAIS IDMIS Terminal case monitoring module in this repository. Timestamps refer to the recording. The recording demonstrates screens and open forms; it does not show successful submissions or backend behavior.

## Scope visible in the recording

| Time | Feature | Observed behavior |
|---|---|---|
| 00:00–00:54 | Search and list | Search by rank, first/middle/last name, DIDM/NSU docket, presidential confirmation (`Yes`/`No`), summary-hearing docket, DIDM reference, originating unit/office, case status, and selected date range. The date selector has exactly five visible choices: Date Signed by DA, Date Complaint, Date Forwarded, Date Received by SHO, Date Resolved by SHO. The result table includes docket IDs, names, case dates, unit, case source, status, SHO and SHO dates, case aging, encoder, and Actions. |
| 00:46–00:50 | Status filter | A longer, numbered workflow list is visible. Examples include `For Investigation`, `1 Under Summary Hearing`, `2 For Designation of Summary Hearing Officer`, `3 For Acceptance of Summary Hearing Officer`, `4 For Submission of ROI`, `4 Forwarded to IAS`, `6 Case Resolved`, `7 Submitted Resolution of IG/IAS / CDAC`, `8 Decision`, `9 For Presidential Confirmation`, `10 Proof of Service From Receipt of Decision`, `11 Motion for Reconsideration (MR)`, `12 Resolution`, `13 Proof of Service of MR`, `14 Certificate of Finality`, and `15 Implementation`. The recording does not establish the complete authoritative set or transition rules. |
| 01:00–01:20 | Case Details | A tabbed case view: Complaint Details, Complainant, Respondent, Witness, Attachments. Complaint Details shows DLOD and DIDM docket numbers, reference number, source and initial complaint, occurrence date/time and place, details, and an edit action. Other tabs were not fully loaded or inspected. |
| 01:20–01:22 | Refer Case | The Actions menu contains **Refer Case** between Case Details and Case Updates. Opening it shows a required-looking `Reason Referring the Case` text area and Refer Case button. The result of submission is not shown. |
| 01:26–02:12 | Case Updates | A docket-specific, scrollable sequence of nine named steps, each with Details and uploaded-file state: Submission of ROI from SHO; Resolution of IG, IAS / CDAC; Decision; Resolution of Decision (marked for 3rd level officers only); Proof of Service From Receipt of Decision; Resolution of Motion for Reconsideration (MR); Proof of Service of MR; Certificate of Finality; Implementation. These are structured step forms, not a generic dated note feed. |
| 01:32–01:38 | Early update forms | ROI form: ROI report date, ROI file, date DLOD/DLOS received the ROI, SHO memo/transmittal file. Resolution form: resolution date and file. Decision form: administrative liability and penalty setup, DA decision date and document, Disciplinary Authority selector. Several forms also offer View Attachments and a checkbox for having no document to upload. |
| 01:42–02:00 | Later update forms | Proof of Service of Decision: proof type, received date, proof file. MR Resolution: MR filing date, DA resolution date, resolution selector, MR/resolution file. Certificate of Finality: finality date and certificate file. Some intermediate forms were not opened in the recording. |
| 02:02–02:12 | Implementation | Opens a respondent table with each person's status and an **Upload Implementation Order** action. The upload form itself did not load in the recording. |
| 02:16–02:24 | Change Assigned SHO | Amendment form searches for a new SHO and captures memorandum date and file, with a memorandum preview area. |
| 02:28–02:30 | Date Receive by SHO | Single date entry modal. |
| 02:34–02:36 | Respondent | Manage Respondents shows rank, name, unit, and status, and starts adding one through Search PNP Personnel. The add/edit form was not opened. |
| 02:40–02:42 | Upload Transmittal/PCE | Captures a document date and file. UI label allows PDF, JPG, PNG up to **40 MB** and says the file uploaded during Receive Case stays on record. This is an on-screen limit, not verified server enforcement. |

The demonstrated Actions menu therefore has **seven** entries: Case Details, Refer Case, Case Updates, Change Assigned SHO, Date Receive by SHO, Respondent, and Upload Transmittal/PCE.

## Differences found before the follow-up implementation

This gap list records the state reviewed from the video. The implementation plan tracks changes made afterward.

| Priority | Difference | Current implementation | Work needed for base-system parity |
|---|---|---|---|
| 1 | Structured case updates | `DlosCaseDialog` edits general case fields and stores dated notes. | Model the nine named milestones, their dates, selectors, file types, conditional steps, attachment history, and respondent-linked implementation orders. Specify how each completed step affects case status. |
| 1 | Refer Case | No menu item or API action. | Add referral reason, permission, persisted referral event, and the resulting case state once the business rule is confirmed. |
| 1 | Case details | One flat case form; people have only `involved`, `complainant`, or `respondent` roles. | Add the visible complaint fields, separate tabs or equivalent sections for complainant/respondent/witness/attachments, and witness data. |
| 2 | Change Assigned SHO | Saves a typed SHO name only. | Search/select a person and capture memorandum date, file, and history. |
| 2 | Respondent | Inline person edits, with optional personnel linking. | Show rank, unit, and respondent status; support the PNP personnel search and respondent-specific workflow data. |
| 2 | Upload Transmittal/PCE | Saves a type and file without document date; 10 MB limit. | Add document date and preserve prior uploads. Reconcile the video label of 40 MB with the user's earlier explicit choice of 10 MB before changing the limit. |
| 2 | Filters and statuses | Confirmation has four different enum values; date fields differ; case status is free text/default. | Match the visible Yes/No filter and five date choices; define the official status catalog and permitted transitions before enforcing them. |
| 3 | Layout | The main list contains most fields but has a separate registration date and flat date columns. | Group case-date, SHO-date, and aging information for scanability while retaining the PAIS design system. |

## Boundary of this evidence

- The year/month and Grave/Less Grave navigation are from the user's request, **not** demonstrated in this recording.
- The recording does not confirm required fields, available dropdown values for the step forms, submission outcomes, role permissions, or all status transitions.
- The user's confirmed case registration date for year/month and calendar-day aging rules remain the design inputs. The video does not contradict them.
- The 40 MB file limit is visible only on the base-system upload form; the user previously chose a 10 MB limit for the new terminal. Treat that discrepancy as a product decision, not an automatic code change.
