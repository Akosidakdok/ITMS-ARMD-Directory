# PNP-ITMS Personnel and Assignment Information System

## Updated Implementation, UI/UX, SDLC, Change Log, and Weekly Timeline

**Document version:** 2.0  
**Date updated:** August 18, 2026  
**Project type:** Personnel Management Information System  
**Development approach:** Incremental and module-based development  

## 1. Project Overview

The PNP-ITMS Personnel and Assignment Information System is a web-based administrative system for managing personnel profiles and connected employment records. It centralizes personnel information, assignments, orders, awards, education, training, promotions, leave, reports, and official document outputs. The system uses a React and Vite frontend, an Express REST API, Supabase PostgreSQL for operational records, and Supabase Auth for account authentication.

The application was developed incrementally. The personnel profile and shared database structure were created first, followed by the related personnel modules. The modules were then integrated, tested, connected to authenticated user roles, and prepared for deployment.

## 2. Summary of Changes and Additions Completed

| Area | Change or Addition | Result |
|---|---|---|
| Project documentation | Created an implementation plan, UI/UX plan, SDLC plan, completion audit, setup guide, deployment checklist, and updated weekly timeline. | The development process and current project status are documented for capstone, internship, and project review purposes. |
| Authentication | Replaced the local-only login approach with Supabase Auth email and password authentication. | User credentials are verified by Supabase instead of being stored in frontend code. |
| Login interface | Corrected the login fields so users can type normally; added an expandable demo-account area and clearer error feedback. | The login page is usable and provides guided account entry without blocking manual input. |
| API login error | Added the missing backend authentication endpoint and connected the frontend login request to it. | The previous “API endpoint /api/auth/login not found” error is resolved. |
| Session security | Added bearer-token session verification and automatic authorization headers for protected API requests. | Signed-in users keep an authenticated session and protected requests are verified by the server. |
| Role-based access control | Added `superadmin`, `admin`, and `view_only` application roles. Protected non-read API requests from unauthorized users. | Administrators can manage records, while view-only users can read information without changing it. |
| Superadmin account | Configured a Supabase Auth user as the system superadmin without storing the password in documentation or source code. | A protected account can manage administrator accounts and personnel records. |
| Administrator Accounts module | Added a superadmin-only page and navigation entry for creating and viewing administrator accounts. | Superadmins have a dedicated account-management interface. |
| Administrator management UI | Redesigned administrator management as a clear table with identity, division, email, role, status, last sign-in, and profile synchronization. | Administrator information is easier to scan and manage. |
| Administrator profile database | Prepared the `admin_profiles` Supabase SQL migration with user ID, email, display name, division, role, status, and timestamps. | Supabase Auth credentials can be paired with editable application profile information. |
| Administrator API | Added protected endpoints for listing, creating, and synchronizing administrator profiles. | Administrator accounts and profile rows can be managed through the backend using the server-side Supabase service role. |
| Management role correction | Corrected the Management module so `superadmin` is recognized as an editor instead of a view-only account. | The superadmin can access Create, Edit, and Delete controls. |
| Personnel CRUD | Added complete Create, Read, Update, and Delete controls to the Management module. | Authorized users can register personnel, edit profile information, search records, and delete a selected record. |
| Personnel edit form | Added editable rank, badge number, salary grade, status, name, plantilla, division, designation, detail, address, gender, contact number, birthday, and date-of-entry fields. | Personnel information can be corrected from one organized modal form. |
| Delete protection | Added a record-specific confirmation modal before deletion. | Accidental personnel deletion is less likely. |
| Supabase write verification | Personnel Create, Update, and Delete operations now change the frontend list only after Supabase confirms success. Silent local success was removed for these operations. | A success message means the database operation was actually accepted by Supabase. |
| Database error handling | Improved backend and frontend error messages for failed personnel writes. | Users receive a useful error and the existing table remains unchanged when saving fails. |
| Assignment module | Added and refined assignment creation, updating, deletion, and personnel linking. | Assignment information is connected to personnel records and can be maintained by authorized users. |
| Orders and document templates | Improved editable order templates, personnel-name insertion, printing, saved document data, and automatic linked records. | Official order documents can be prepared from consistent templates and connected to personnel. |
| Awards | Added award API operations, validation, Supabase integration, profile linking, and report support. | Award records can be stored and displayed under the correct personnel profile. |
| Promotion | Improved promotion CRUD behavior and automatic time-in-grade calculation. | Promotion history and eligibility information are more accurate and maintainable. |
| Time in grade | Added validation for missing, invalid, future, leap-year, and exact three-year boundary dates. | The system avoids displaying misleading eligibility values. |
| Reports | Improved report data, printing, CSV/PDF export, and route-level loading. | Required administrative reports can be viewed and exported more reliably. |
| Application performance | Added lazy loading or route-level code splitting for large pages. | The initial application bundle is smaller and pages load as needed. |
| Backend health | Added a public health endpoint showing API, authentication, and Supabase connection status. | Administrators can confirm whether the backend and database are available. |
| Testing | Added automated authentication and time-in-grade tests and repeatedly verified the production build. | Fourteen automated tests pass and the production frontend builds successfully. |

## 3. Updated Implementation Plan

| Functionality or Module | Purpose | Main Features and Implementation | Expected Output | Timeline |
|---|---|---|---|---|
| System workflow and database design | Establish the project structure and shared data relationships. | Designed the system workflow, page navigation, Supabase tables, REST resources, personnel identifiers, and linked module records. | A consistent technical and data foundation for all modules. | Week 1 |
| Login and access control | Secure the application and control editing permissions. | Supabase Auth login, verified bearer sessions, logout, protected API mutations, and superadmin/admin/view-only roles. | Authorized access with server-enforced permissions. | Week 1 design; Week 8 security integration |
| Dashboard | Present an immediate operational summary. | Personnel totals, module summaries, recent information, system/database status, and navigation shortcuts. | A clear landing page with updated information. | Week 1 design; Week 8 integration |
| Personnel Information | Maintain the central personnel profile. | Personal data, employment information, contact details, division, designation, status, search, profile tabs, and database CRUD. | One authoritative personnel profile used by connected modules. | Week 2; CRUD strengthened in Week 8 |
| Management Center | Provide authorized data maintenance. | Searchable personnel table, register form, full edit form, status badges, confirmation modal, success/error feedback, and strict Supabase synchronization. | A working Create, Read, Update, and Delete interface for personnel records. | Weeks 2 and 8 |
| Assignment | Record current and historical assignments. | Personnel selection, unit, position, dates, status, edit/delete operations, and profile linking. | An accurate assignment history for each person. | Week 3 |
| Orders | Prepare and record official personnel orders. | Order details, selected personnel, editable templates, saved content, printing, PDF generation, and linked profile records. | A reusable official order connected to affected personnel. | Week 3; verified in Week 8 |
| Awards | Store personnel recognition records. | Award name, authority, date, order type, personnel link, validation, Supabase CRUD, and report inclusion. | A complete award history under the correct profile. | Week 3; verified in Week 8 |
| Education | Maintain educational background. | School, degree, education level, dates, profile linking, editing, bulk handling, and exports. | An organized educational history. | Week 4 |
| Training | Maintain completed training and certificates. | Course, provider, hours, dates, certificate information, profile linking, editing, and bulk handling. | A searchable training history. | Week 4 |
| Promotion | Track promotion history and eligibility. | Previous/current rank, effective date, edit/delete operations, latest-rank synchronization, and automatic time-in-grade calculation. | Accurate promotion history and eligibility values. | Week 5 |
| Leave | Manage leave applications and status. | Leave type, dates, reason, approval state, approver, remarks, editing, deletion, and personnel linking. | A complete leave application history. | Week 3 foundation; Week 6 completion |
| Leave Calendar | Display personnel leave schedules. | Calendar events, date ranges, personnel names, status colors, event details, and record updates. | A visual schedule of personnel leave. | Week 6 |
| Reports | Generate administrative information. | Alpha List, Current Assignments, Current Leave, Education, Training, Promotion, Orders, and Awards reports with search, filter, print, CSV, and PDF output. | Accurate reports for review and official use. | Week 7; export verification in Week 8 |
| Administrator Accounts | Allow the superadmin to create and maintain administrator access. | Supabase Auth account creation, `admin_profiles`, division/role/status information, profile synchronization, and superadmin-only authorization. | Central administrator-account management. | Week 8 addition |
| Printing and PDF export | Produce official physical and electronic documents. | Print preview, print-specific formatting, hidden screen controls, page handling, PDF filenames, and exported tables/documents. | Clean printed pages and portable PDF documents. | Week 8 |
| Search and filtering | Locate records quickly. | Search by name, badge number, division, designation, status, and module-specific filters. | Fast and relevant database results. | Weeks 2–7; tested in Week 8 |
| Integration and testing | Confirm that the modules work as one application. | Shared context/API data, personnel ID linking, authenticated mutations, Supabase health checks, automated tests, CRUD smoke testing, and production builds. | A connected and technically verified application ready for acceptance testing. | Week 8 |

## 4. Updated UI/UX Design Plan

### Recommended User Flow

**Login → Dashboard → Select Module → Search or Select Personnel → View, Create, or Edit Information → Validate → Save to Supabase → Receive Confirmation → Generate Report or Document → Print or Export**

| UI/UX Component | Updated Design | Purpose | User Experience Consideration |
|---|---|---|---|
| Login page | Centered branded card, editable email/password fields, password visibility control, demo-account fill area, loading state, and concise error banner. | Provide a focused and understandable system entry point. | Manual typing must always work; failed login must preserve input and explain the problem. |
| Dashboard | Responsive summary cards, important totals, recent information, database status, and module shortcuts. | Help the user understand the current system state. | Avoid overcrowding and show useful loading or empty states. |
| Sidebar and mobile navigation | Consistent icons and labels, active-page highlighting, responsive behavior, and a superadmin-only Administrator Accounts entry. | Provide stable navigation across modules and devices. | Users should always know their current module and available permissions. |
| Header | Current account name, role label, Supabase status, and consistent system controls. | Show session and connection context. | Clearly distinguish Superadmin, Administrator, and View-only modes. |
| Personnel table | Wide administrative table with readable headers, status badges, search, and aligned action controls. | Present many records in a scannable format. | Preserve horizontal scrolling on smaller screens and provide a clear empty state. |
| Administrator table | Identity avatar, display name, division, email, role, account status, last sign-in, and synchronization control. | Simplify administrator account review. | Use role/status badges and limit the module to superadmins. |
| Create/Edit forms | Group related fields, use visible labels, required-field validation, appropriate input types, and a single clear primary Save action. | Reduce data-entry mistakes. | Keep user input when saving fails and disable repeated submission while loading. |
| Modals | Clear title and explanation, scrollable body, visible close/cancel action, and appropriate width for the form. | Keep focused tasks within the current page. | Prevent closing while a critical save/delete request is processing. |
| Delete confirmation | Show the exact record name and badge number with a visually separate destructive action. | Prevent accidental deletion. | Never delete immediately from an icon click; require a second deliberate action. |
| Status indicators | Use consistent success, warning, error, role, and connection colors with text labels. | Communicate record and system state. | Do not rely on color alone to explain meaning. |
| Success and error messages | Display a page-level confirmation only after the backend completes; show readable database errors when an operation fails. | Provide trustworthy feedback. | A failed Supabase write must not appear successful in the table. |
| Loading states | Use button spinners, disabled repeated actions, route loading states, and clear offline states. | Show that an operation is in progress. | Avoid blank screens and accidental duplicate submissions. |
| Editable templates | Standard official format with editable content, personnel autofill, preview, printing, and PDF output. | Speed up official document preparation. | Preserve formatting and verify personnel insertion before saving. |
| Reports and exports | Search/filter controls, readable tables, print action, CSV/PDF export, and meaningful filenames. | Support administrative review and distribution. | Exported information should match the filtered report shown to the user. |
| Responsive design | Flexible grids, collapsible navigation, scrollable tables, wrapping buttons, and appropriately sized touch controls. | Support desktop, tablet, and essential mobile use. | Desktop remains the primary administrative layout without blocking smaller screens. |
| Accessibility | Proper labels, keyboard access, visible focus, adequate contrast, readable text, and descriptive controls. | Make routine tasks accessible to more users. | Icons should include titles or text, and important meaning should not use color alone. |

### Overall UI/UX Concept

The updated interface uses a clean administrative design with white content panels, blue primary actions, neutral gray surfaces, readable tables, and semantic success/error colors. The sidebar and header remain consistent across modules. Personnel profiles are the center of the experience, while modals support focused Create, Edit, and Delete tasks. All important database operations provide loading, success, or error feedback so users understand whether Supabase accepted the requested change.

## 5. Updated SDLC Plan and Current Status

| SDLC Phase | Actual Activities | Deliverables and Current Status | Timeline |
|---|---|---|---|
| Planning | Defined the personnel-management problem, project scope, target users, modules, reports, outputs, and eight-week development schedule. | Project objectives, scope, module list, development sequence, and documentation plan completed. | Week 1 |
| Requirements Analysis | Identified personnel fields, related histories, order/award workflows, leave approval, reports, document outputs, authentication, and role permissions. | Functional requirements, data requirements, workflow requirements, validation rules, and access-control requirements completed and refined. | Week 1 and before each module |
| System Design | Designed shared personnel IDs, Supabase data structures, REST routes, React pages, reusable components, navigation, responsive tables, forms, and document/report layouts. | System workflow, UI structure, database relationships, role model, and module architecture implemented. | Week 1; refined through Week 8 |
| Development | Built the personnel, assignment, orders, awards, education, training, promotion, leave, calendar, reports, authentication, admin accounts, and management CRUD features. | Planned modules and the later security/administration additions are implemented. | Weeks 2–8 |
| Integration | Connected modules through personnel IDs and shared API/context state; connected Supabase Auth, PostgreSQL records, templates, reports, print/PDF, and role controls. | One connected application with authenticated database operations. | Week 8 |
| Testing | Tested schemas, CSV imports, authentication roles, mutation restrictions, time-in-grade rules, production compilation, backend health, superadmin login, administrator listing, and live Supabase personnel CRUD. | Fourteen automated tests pass; production build passes; a temporary Supabase CRUD row was successfully created, updated, and deleted. | Week 8 |
| Deployment/Implementation | Prepared environment-variable templates, secure key separation, setup instructions, health checks, migration SQL, backup guidance, and a deployment checklist. | Local implementation is operational. Production hosting, HTTPS, approved credentials, formal backup verification, and user acceptance remain release requirements. | End of Week 8 / release stage |
| Maintenance and Future Improvement | Documented monitoring, backups, access review, security review, restore testing, defect correction, and future enhancements. | Maintenance framework prepared; ongoing operational evidence will be recorded after deployment. | After Week 8 |

### SDLC Approach

The system followed an incremental SDLC approach. Each module was developed and checked before later modules were connected. This reduced the complexity of testing and allowed personnel linking, calculations, reports, and documents to be reviewed separately before final integration. Week 8 expanded beyond technical integration by adding production-oriented authentication, role-based access, administrator management, strict Supabase personnel CRUD, error handling, automated verification, and deployment documentation.

## 6. Updated Eight-Week Timeline

| Timeline | Activities and Accomplishments |
|---|---|
| Week 1 | Analyzed project requirements and designed the system workflow, personnel database, dashboard, navigation, user roles, shared interface, and module relationships. Defined the incremental implementation, UI/UX, and SDLC plans. |
| Week 2 | Developed the Personnel Information Module, including personnel profiles, personal information, contact details, employment information, status, search, filtering, and the main personnel data structure used by related modules. |
| Week 3 | Developed the Assignment, Orders, Awards, and initial Leave features. Integrated editable document templates, personnel selection, profile linking, order/award history, printing preparation, and automatic recording of connected orders and awards. |
| Week 4 | Developed the Education and Training Modules, including educational background, completed courses, training providers, dates, hours, certificate information, profile linking, validation, editing, and data export support. |
| Week 5 | Developed the Promotion Module, including promotion history, current-rank updates, editing and deletion, and automatic time-in-grade calculation with boundary and invalid-date handling. |
| Week 6 | Completed the Leave Module and Leave Calendar, including leave applications, inclusive dates, approval status, approver information, schedules, calendar events, editing, and record deletion. |
| Week 7 | Developed the Reports Module, including Alpha List, Current Assignments, Current Leave, Education, Training, Promotion, Orders, and Awards reports. Added search, filtering, printing, CSV export, and PDF export. |
| Week 8 | Integrated and tested all modules, editable templates, printing, PDF export, personnel-name/ID linking, and automatic order/award records. Added Supabase Auth login, session verification, role-based API protection, superadmin and administrator-account management, `admin_profiles` migration, Management Center personnel CRUD, strict Supabase write confirmation, database health reporting, lazy-loaded routes, automated tests, production builds, and live Supabase CRUD verification. |

## 7. Database and Authentication Design Update

### Supabase Auth

Supabase Auth stores and verifies login credentials. Passwords must never be placed in documentation, committed environment files, frontend demo data, or database profile tables. The backend validates the access token for protected requests and determines the application role from approved account metadata or configuration.

### Personnel Table

The `personnel` table stores operational profile information. Authorized Management Center actions write directly through the backend to Supabase. The interface updates only after the database operation succeeds.

### Administrator Profiles Table

The prepared `admin_profiles` table stores non-password administrator information:

- Supabase Auth user ID
- Email address
- Display name
- Division
- Role (`admin` or `superadmin`)
- Status (`active` or `inactive`)
- Creation and update timestamps

The SQL migration is located at `backend/scripts/create_admin_profiles.sql`. The table uses Row Level Security and is intended to be accessed by the protected server-side administrator API.

## 8. Verification Results

| Verification | Result |
|---|---|
| Automated test suite | 14 of 14 tests passed |
| Production frontend build | Passed |
| Backend health endpoint | Online |
| Supabase database connection | Connected |
| Superadmin role resolution | Passed |
| Protected administrator listing | Passed |
| Live personnel Create operation | Passed |
| Live personnel Update operation | Passed |
| Live personnel Delete operation | Passed |
| Temporary CRUD verification record cleanup | Completed |
| Existing personnel records affected by CRUD verification | None |

## 9. Remaining Release and Maintenance Activities

The following are operational release activities and should not be marked complete until evidence is available:

1. Run and verify the `admin_profiles` SQL migration in the target Supabase project if it has not yet been applied.
2. Perform formal user acceptance testing with authorized personnel and record signatures or approval.
3. Review production Row Level Security, data privacy, retention, and least-privilege requirements.
4. Configure the approved production host, HTTPS, domain, CORS origin, and environment variables.
5. Create and test a production backup and restoration procedure in a separate environment.
6. Perform browser-based accessibility, responsive-layout, print, and PDF acceptance tests on the target devices.
7. Configure error monitoring, availability monitoring, and a maintenance/change-request process.
8. Rotate temporary credentials and require approved password practices before production use.

## 10. Conclusion

The project now covers the planned personnel-management modules and the main Week 8 integration requirements. The latest additions improve security, database reliability, administrator management, and day-to-day personnel maintenance. Supabase Auth provides verified accounts, server-side role controls protect changes, and the Management Center provides complete personnel CRUD with confirmed Supabase synchronization. The successful tests and production build show that the implementation is technically ready for formal user acceptance and production deployment activities.
