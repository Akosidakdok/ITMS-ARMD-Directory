---
name: PAIS Scoped Operational Modules
description: Scoped clean, professional navy-and-white operational registers.
colors:
  primary-light: "#102f4a"
  primary-dark: "#2d6b9f"
  surface-light: "#ffffff"
  surface-dark: "#131f2e"
  ink-light: "#182536"
  ink-dark: "#f1f5f9"
  muted-light: "#657181"
  muted-dark: "#94a3b8"
  rule-light: "#d9d6cc"
  rule-dark: "#223448"
  subtle-light: "#f0eee7"
  subtle-dark: "#182638"
typography:
  headline:
    fontFamily: '"Segoe UI", "Arial Nova", Arial, system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 600
  body:
    fontFamily: '"Segoe UI", "Arial Nova", Arial, system-ui, sans-serif'
    fontSize: "14px"
    lineHeight: 1.5
  summary-label:
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.5
  summary-value:
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.2
  table-header:
    fontSize: "0.6875rem"
    fontWeight: 600
    letterSpacing: "0"
  table-body:
    fontSize: "0.75rem"
    fontWeight: 400
  control:
    fontSize: "0.8125rem"
  ribbon-control:
    fontSize: "0.75rem"
  worksheet-cell-default:
    fontSize: "11px"
rounded:
  control: "0.25rem"
  panel: "0.375rem"
spacing:
  summary-padding: "1rem"
  summary-mobile-padding: "0.875rem"
  education-content-padding: "1.25rem"
  education-column-gap: "1.5rem"
---

# Design System: PAIS Scoped Operational Modules

## Overview

The confirmed user direction is clean, professional navy and white. Orders and Education & Training present operational records through compact summaries, clear search, restrained borders, and readable record details. The user subsequently authorized the same incumbent treatment for Promotion, Reports, Excel Worksheets, Document Editor, and Administrator Accounts.

**Scope and authority:** This document describes only those seven authorized modules. `src/pages/RecordsModules.css` implements the shared scoped treatment, extended by the five modules' page stylesheets and existing `ModulePages.css`. `tokens.css` aliases the incumbent PAIS theme in `src/index.css`; no new palette is introduced. Those CSS sources govern actual rendering. Existing components, global CSS, and `.21st/design.json` decisions remain authoritative for every other page. `.21st/DESIGN.md` remains the generated project design reference; this document does not replace it or authorize a wider redesign.

The fresh review disposition is **Ship at bounded scope**. Reported implementation verification: typecheck and build passed, nine targeted tests passed, the overflow detector returned `[]`, and 21st reported zero errors with existing advisory warnings. Review limits remain: screenshots were cropped, populated academic/training entries were unavailable, and mutation flows were not checked. This documentation pass does not expand those claims.

That disposition concerns the original Orders/Education review. For the five subsequent extensions, reported build and typecheck passed with ten targeted tests; desktop/mobile captures exist under `.impeccable/review`. Their finish review is still active, so the original disposition does not certify those extensions.

## Colors

Frontmatter records the actual light and dark values of the theme roles used here. Apply the live CSS aliases rather than hardcoding light colors:

| Scoped alias | Incumbent role | Light | Dark |
| --- | --- | --- | --- |
| `--color-records-surface` | `--card` | `#ffffff` | `#131f2e` |
| `--color-records-ink` | `--foreground` | `#182536` | `#f1f5f9` |
| `--color-records-muted` | `--muted-foreground` | `#657181` | `#94a3b8` |
| `--color-records-rule` | `--border` | `#d9d6cc` | `#223448` |
| `--color-records-subtle` | `--secondary` | `#f0eee7` | `#182638` |

Primary actions inherit `--primary`; personnel hover and selection inherit `--accent` (`#edf3f7` light, `#1c3046` dark). Navy and white describe the chosen light-mode direction; dark mode retains the existing PAIS surface hierarchy.

## Typography

Use the incumbent sans stack through `--font-records-body: var(--font-sans)`. Page headings and summary values use 600 weight at `1.5rem`; summary labels use 500 at `0.6875rem`. Section headings use 600 at `0.875rem`. Counts use tabular numerals. Education detail copy wraps instead of truncating; scoped detail headings remove uppercase and extra letter spacing.

Dense module tables use `0.6875rem` headers at weight 600 with normal case and zero letter spacing, and `0.75rem` cells at weight 400 (`ModulePages.css`). General fields and desktop view tabs use `0.8125rem`; report mobile tabs and worksheet ribbon/formula inputs use `0.75rem`. Document titles use `0.875rem` at weight 600, descriptions `0.75rem`, metadata `0.6875rem`. Worksheet cells default to `11px`; workbook formatting can set their rendered size within the existing `10px`–`14px` clamp. Preserve these dense tool roles rather than applying body size to the grid.

## Layout

Orders uses seven compact summary cells, search before optional controls, and initially collapsed general and advanced filters. The table keeps a `1080px` minimum width inside its horizontal scrolling container. At `1199px` and below, the Orders summary becomes four columns and page headers stack. At `639px` and below, summaries become two columns.

Education & Training uses five summary cells and a personnel register with native expandable details. Expanded files show qualification context across the width, then academic and training columns with a `1.5rem` gap and `1.25rem` padding. At `639px` and below, these columns stack with `1rem` padding and personnel headings wrap. Selection controls remain separate from disclosure controls.

Promotion uses wrapping view tabs, search, collapsible filters, and scrolling roster/history tables. Its four-column filter grid becomes two columns at `1199px` and one at `639px`; the nine-column roster retains `1180px` minimum width. Reports uses wrapping tabs, labeled context filters, a result count, and a scrolling `900px` table; mobile tabs form two columns and fields fill the width.

Document Editor uses a searchable document list with wrapping descriptions, metadata, and visible row actions. Row metadata rearranges at `1000px`; at `639px`, actions move beneath the text and the two-column template catalogue stacks. Excel Worksheets keeps the ribbon, formula bar, grid, and sheet bar in a restrained workbench: toolbars wrap while ribbon navigation/panels scroll locally. Ribbon fields are `28px` high, formula inputs and sheet tabs `32px`, and ribbon tabs at least `36px`; the grid preserves its own cell density. At `639px`, ribbon navigation and sheet navigation take the full row.

Administrator Accounts uses a three-cell account summary, search toolbar, and scrolling `900px` table. The summary stays three columns on mobile with `0.75rem` cell padding. Existing permission gates and account workflows remain incumbent behavior.

## Elevation & Depth

Scoped record sections explicitly use `box-shadow: none`. Borders, dividers, and subtle surface changes establish grouping. Preserve incumbent elevation on shared dialogs and floating controls.

## Shapes

Use `--pais-radius-control` (`0.25rem`) for controls and `--radius-records-panel: var(--pais-radius-panel)` (`0.375rem`) for summary panels. Academic and training entries use flat rows with bottom rules.

## Components

- Summary strips: bordered surfaces with internal dividers, muted labels, and tabular values.
- Search and filters: search is immediately available; optional Orders filters use native disclosures. Preserve labels, active-filter feedback, and existing reset behavior.
- Orders table: preserve readable columns and document actions inside the scrolling region.
- Personnel files: native `details`/`summary` provides disclosure; selection is an independent control. Academic and training actions remain visible rather than hover-dependent.
- Controls: page actions and search-toolbar buttons have a `40px` minimum height; entry action buttons have a `32px` minimum target. Global keyboard focus uses `--pais-focus` with a `2px` outline and `2px` offset; the module control rule uses `--ring` with a `2px` outline and `3px` offset.
- Extended registers: preserve wrapping navigation, visible search/filter context, readable scrolling tables, and account summaries.
- Document library and worksheet tools: keep document actions visible and preserve the template catalogue, workbook controls, and local toolbar/grid scrolling.

## Do's and Don'ts

- Do preserve PAIS theme aliases, permission checks, data behavior, and document workflows.
- Do keep search prominent, qualification text readable, and disclosure independent of selection.
- Do retain light and dark theme inheritance.
- Don't propagate these page layouts to other modules without a separately scoped request.
- Don't treat cropped screenshots or empty qualification data as verification of populated entries or mutation flows.
