# Stakeholder System Testing Questionnaire

Use this guide to try the PNP-ITMS Personnel and Assignment Information System and record whether it supports your work. Complete it in the approved test environment using test records. Do not enter real personnel or sensitive information unless the project owner has specifically authorized it.

## Session details

| Item | Response |
|---|---|
| Stakeholder / role | |
| Date | |
| Environment / version | |
| Account role used (administrator / view-only) | |
| Browser and device | |
| Facilitator (if any) | |

## How to complete

For each case, try the task yourself where possible. Mark **Pass**, **Fail**, or **N/A**. Describe what actually happened, including any confusing wording, unexpected result, or error. For a failure, note the page/module and steps needed to reproduce it. Do not try destructive actions on live data.

## Test cases

| ID | Task | What to do | Expected result | Result (Pass / Fail / N/A) | Notes / actual result |
|---|---|---|---|---|---|
| UAT-01 | Sign in and orient yourself | Sign in with the account provided. Find the dashboard and identify the main navigation options. | You can sign in, understand where you are, and locate the main modules and sign-out action. | | |
| UAT-02 | Review dashboard | Look over the dashboard summary and open one item or shortcut, if available. | Summary information is understandable, and navigation takes you to the relevant area. | | |
| UAT-03 | Find a personnel record | Search for a provided test person using a name or identifier. Try a partial search and a search with no match. | Matching records are easy to identify; no-match results are clearly explained; changing the search works as expected. | | |
| UAT-04 | Review a personnel profile | Open a test person's profile and review the available information and linked sections/tabs. | The selected person's details are clear, and linked records belong to that person. | | |
| UAT-05 | Add or edit a personnel record (administrator only) | Using an approved test record, add a record or change a non-sensitive test field, save, then reopen it. | The form is understandable, the save is confirmed, and the change remains after reopening. | | |
| UAT-06 | Check required-field validation | In an approved test form, try to save with a required field empty or an invalid value. | The system identifies what needs correction, explains it clearly, and preserves other entered information. | | |
| UAT-07 | Review assignment history | Open a test person's assignments. If permitted, add or edit a test assignment. | Assignment details and dates are understandable, and the correct person’s assignment history is shown. | | |
| UAT-08 | Review or create an order | Open the Orders area. If in scope for your role, prepare a test order from an available template and review its personnel selection and fields. | The order type and fields are clear, selected personnel are correct, and the document preview reflects the entered information. | | |
| UAT-09 | Check order and award profile links | Open the profile of a person associated with an approved test order or award. | The related order or award appears under the correct person's profile and is identifiable. | | |
| UAT-10 | Review education and training | Open the education and training sections for a test person. If permitted, add a test entry. | Entries are readable, clearly associated with the person, and dates/details are presented as expected. | | |
| UAT-11 | Review promotion information | Open a test person's promotion information and any time-in-grade calculation shown. | Promotion details and any calculation are understandable and appear consistent with the information provided. Record any discrepancy for review. | | |
| UAT-12 | Review leave records and calendar | Open leave records and the calendar. Check how leave status and date ranges are displayed. | Leave details and statuses are understandable, and calendar entries correspond to the displayed dates and person. | | |
| UAT-13 | Generate a report | Select a report and any relevant filters, then generate it. Check the title, dates, scope, and results. | The report reflects the selected scope and filters, and its results are readable. | | |
| UAT-14 | Print or export | From an appropriate report or document, open print preview or export a PDF if available. | The output is readable, includes the expected information, and does not show unrelated interface controls or clipped content. | | |
| UAT-15 | Check view-only access (view-only account) | Sign in with a view-only account. Try to find and view records, then look for add, edit, or delete actions. | You can perform permitted viewing/report tasks. Restricted changes are unavailable or refused with understandable feedback. | | |
| UAT-16 | Check save and error feedback | Save an approved test change, then observe the result message. If an error occurs naturally, note the wording and whether your input remains. | Success or failure is clear, the system does not imply a failed save succeeded, and useful input is not unexpectedly lost. | | |
| UAT-17 | Navigate between tasks | Move from a list to a profile and back, and switch between modules. | You can tell which module or record you are viewing and return without losing your place unexpectedly. | | |
| UAT-18 | Overall ease of use | Complete one common task from start to finish without help, such as finding a person and reviewing their records. | You can complete the task with reasonable effort and understand the available next steps. | | |

## Stakeholder feedback

1. Which tasks were easiest to complete?

   _Response:_

2. Which tasks were difficult, confusing, or took longer than expected? What were you trying to do?

   _Response:_

3. Did you see information that was missing, unclear, duplicated, or in the wrong place? Please identify the screen and test record (no sensitive personal details).

   _Response:_

4. Were any labels, instructions, validation messages, or status values hard to understand? What wording would be clearer?

   _Response:_

5. Did any report, document, print preview, or PDF omit information or display incorrectly? Please describe.

   _Response:_

6. What is the most important change needed before you would be comfortable using the system for this work?

   _Response:_

7. Other comments or suggestions:

   _Response:_

## Issue / improvement log

Add one row for each problem or suggestion. Use test IDs above where possible. Avoid including real personal or sensitive data in these notes.

| # | Test ID / module | Steps or context | Expected | Actual | Impact (High / Medium / Low) | Suggestion / follow-up |
|---|---|---|---|---|---|---|
| 1 | | | | | | |
| 2 | | | | | | |
| 3 | | | | | | |

## Acceptance summary

| Question | Response |
|---|---|
| Were you able to complete the tasks relevant to your role? | Yes / Partly / No |
| Are any issues a blocker to your work? If yes, list the issue numbers. | |
| Overall, how easy was the system to use? (1 = very difficult, 5 = very easy) | |
| Stakeholder recommendation | Accept / Accept with changes / Retest after changes |
| Additional notes | |

> Stakeholder acceptance records feedback and task outcomes; the project team should review failures and blocking issues before deciding readiness for operational use.
