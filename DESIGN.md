---
name: PAIS Orders and Education & Training
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
rounded:
  control: "0.25rem"
  panel: "0.375rem"
spacing:
  summary-padding: "1rem"
  summary-mobile-padding: "0.875rem"
  education-content-padding: "1.25rem"
  education-column-gap: "1.5rem"
---

# Design System: PAIS Orders and Education & Training

## Overview

The confirmed user direction is clean, professional navy and white. These two modules present operational records through compact summaries, clear search, restrained borders, and readable record details.

**Scope and authority:** This document describes only Orders and Education & Training. `src/pages/RecordsModules.css` implements the scoped treatment; `tokens.css` aliases the incumbent PAIS theme in `src/index.css`. Those CSS sources govern actual rendering. Existing components, global CSS, and `.21st/design.json` decisions remain authoritative for every other page. `.21st/DESIGN.md` remains the generated project design reference; this document does not replace it or authorize a wider redesign.

The fresh review disposition is **Ship at bounded scope**. Reported implementation verification: typecheck and build passed, nine targeted tests passed, the overflow detector returned `[]`, and 21st reported zero errors with existing advisory warnings. Review limits remain: screenshots were cropped, populated academic/training entries were unavailable, and mutation flows were not checked. This documentation pass does not expand those claims.

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

## Layout

Orders uses seven compact summary cells, search before optional controls, and initially collapsed general and advanced filters. The table keeps a `1080px` minimum width inside its horizontal scrolling container. At `1199px` and below, the Orders summary becomes four columns and page headers stack. At `639px` and below, summaries become two columns.

Education & Training uses five summary cells and a personnel register with native expandable details. Expanded files show qualification context across the width, then academic and training columns with a `1.5rem` gap and `1.25rem` padding. At `639px` and below, these columns stack with `1rem` padding and personnel headings wrap. Selection controls remain separate from disclosure controls.

## Elevation & Depth

Scoped record sections explicitly use `box-shadow: none`. Borders, dividers, and subtle surface changes establish grouping. Preserve incumbent elevation on shared dialogs and floating controls.

## Shapes

Use `--pais-radius-control` (`0.25rem`) for controls and `--radius-records-panel: var(--pais-radius-panel)` (`0.375rem`) for summary panels. Academic and training entries use flat rows with bottom rules.

## Components

- Summary strips: bordered surfaces with internal dividers, muted labels, and tabular values.
- Search and filters: search is immediately available; optional Orders filters use native disclosures. Preserve labels, active-filter feedback, and existing reset behavior.
- Orders table: preserve readable columns and document actions inside the scrolling region.
- Personnel files: native `details`/`summary` provides disclosure; selection is an independent control. Academic and training actions remain visible rather than hover-dependent.
- Controls: page actions and search-toolbar buttons have a `40px` minimum height; entry action buttons have a `32px` minimum target. Global keyboard focus remains a `2px` outline using `--pais-focus`, offset `2px`.

## Do's and Don'ts

- Do preserve PAIS theme aliases, permission checks, data behavior, and document workflows.
- Do keep search prominent, qualification text readable, and disclosure independent of selection.
- Do retain light and dark theme inheritance.
- Don't propagate these page layouts to other modules without a separately scoped request.
- Don't treat cropped screenshots or empty qualification data as verification of populated entries or mutation flows.
