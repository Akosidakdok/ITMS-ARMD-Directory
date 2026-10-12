---
name: PAIS Operations Workbench
description: A clean blue, white and yellow personnel operations system.
colors:
  primary-light: "#175cd3"
  primary-dark: "#286de0"
  primary-hover: "#144db0"
  navigation-light: "#123c7a"
  navigation-dark: "#102b54"
  selected-yellow: "#f4c542"
  on-yellow: "#172b4d"
  yellow-soft-light: "#fff7d6"
  yellow-soft-dark: "#382f16"
  yellow-ink-light: "#493600"
  yellow-ink-dark: "#ffe28c"
  data-blue-light: "#175cd3"
  data-blue-dark: "#8bb8fa"
  surface-light: "#ffffff"
  surface-dark: "#14243a"
  canvas-light: "#f5f8fc"
  canvas-dark: "#0c182b"
  ink-light: "#172b4d"
  ink-dark: "#edf3ff"
  muted-light: "#526581"
  muted-dark: "#a5b6cf"
  rule-light: "#dbe5f0"
  rule-dark: "#2b405d"
  subtle-light: "#f0f5fc"
  subtle-dark: "#1b2e48"
  accent-light: "#eaf2ff"
  accent-dark: "#203a60"
typography:
  headline:
    fontFamily: '"Segoe UI", "Arial Nova", Arial, system-ui, sans-serif'
    fontSize: "1.5rem"
    fontWeight: 650
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  body:
    fontFamily: '"Segoe UI", "Arial Nova", Arial, system-ui, sans-serif'
    fontSize: "0.875rem"
    lineHeight: 1.5
  section-title:
    fontSize: "0.9375rem"
    fontWeight: 600
  control:
    fontSize: "0.8125rem"
    fontWeight: 600
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
  directory-table-body:
    fontSize: "0.8125rem"
  worksheet-cell-default:
    fontSize: "11px"
rounded:
  control: "0.375rem"
  panel: "0.5rem"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.primary-light}"
    textColor: "{colors.surface-light}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.875rem"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.control}"
    padding: "0.5rem 0.875rem"
  navigation-selected:
    backgroundColor: "{colors.selected-yellow}"
    textColor: "{colors.on-yellow}"
    rounded: "{rounded.control}"
  panel:
    backgroundColor: "{colors.surface-light}"
    textColor: "{colors.ink-light}"
    rounded: "{rounded.panel}"
---

# Design System: PAIS Operations Workbench

## Overview

**Creative North Star: "The Personnel Operations Workbench"**

PAIS is a sober, professional personnel operations application. Blue navigation frames white work surfaces; yellow marks the current navigation destination and the key strength total. The application presents records, search, tabs, tables and document tools with a compact hierarchy and restrained borders.

**Scope and authority:** The user's whole-project blue, white and yellow redesign supersedes the former seven-module boundary. This system covers Dashboard, Personnel, Management, Assignment, Orders, Education & Training, Promotion, Reports, Document Editor, Excel Worksheets, Administrator Accounts, login, loading and shared application chrome. `tokens.css`, globally imported by `src/index.css`, owns app palette and role aliases. The final `@theme` and `@media screen` blocks in `src/index.css`, shared SystemUI/layout components and page styles govern rendering. The records aliases remain compatibility roles; RecordsModules no longer imports the theme locally. Existing routes, authentication, permission checks, data operations and export logic remain functional constraints. Older `.21st` references do not restrict this authorized whole-project refresh.

Desktop and mobile captures for every page, navigation and dark samples are stored in `.impeccable/review/whole-project`. Build, typecheck and 15 targeted tests were reported passing by the implementation pass. This document records source evidence; it does not self-certify a blanket visual review or establish a ship disposition. Captures and automated tests do not establish unexercised mutation, populated-data or export results.

**Key Characteristics:**

- Blue navigation, white work surfaces and purposeful yellow selection.
- Compact headings, clear search and controls, then existing record content.
- Flat bordered panels, restrained corners and local table scrolling.
- Shared light/dark role aliases and preserved dense document/workbook tools.

## Colors

The palette combines operational blue, cool white surfaces and selective yellow with semantic status colors where necessary. The frontmatter records actual light/dark values; application styles must consume the live CSS roles.

### Primary

Blue is the navigation and action family. Use `--primary` for filled controls and `--primary-foreground` for their text. Navigation uses `--sidebar-bg`; interactive blue text and measures use `--color-data-blue`, which becomes a lighter blue in dark mode. The dark primary control and dark data-blue tokens deliberately serve different contrast contexts.

### Secondary

Yellow identifies the current navigation destination and the primary strength measure. Solid yellow uses `--color-on-yellow`, whose dark ink remains the same in both themes. Soft yellow summaries use `--color-brand-yellow-soft` and `--color-brand-yellow-ink`, which adapt with the theme. Semantic green and red retain success and error meaning; other colors are justified by content or status.

### Neutral

Use `--background` for the canvas, `--card` for work surfaces, `--foreground` for primary copy, `--muted-foreground` for secondary copy and `--border` for dividers. `--secondary`, `--accent`, `--table-header` and `--table-hover` distinguish context and state. The old PAIS, background/text and records aliases resolve into these same roles.

**The Role Contrast Rule.** Use data blue for readable blue measures and primary blue for filled controls; use fixed dark ink on solid yellow in either theme.

## Typography

**Display and Body Font:** Segoe UI with Arial Nova, Arial, system-ui and sans-serif fallbacks. The system uses a single practical sans family and tabular numerals for counts and tables.

Page headings use the headline role. Section headings range from `0.875rem` to the section-title role; controls and directory rows use the control/directory sizes. Operational register cells use the denser table-body role, with normal-case table headers and zero tracking. Dashboard summary figures use `1.625rem` at weight 650; the secondary strength strip uses `1.375rem` at weight 650. Summary labels stay quieter than values.

Login has its own larger hierarchy: a responsive brand heading and a `1.875rem` form heading, reduced on narrow screens. Document rows use `0.875rem` titles, `0.75rem` descriptions and `0.6875rem` metadata. Workbook ribbon/formula text uses `0.75rem`; worksheet cells default to the recorded cell size and retain workbook formatting within the existing `10px`–`14px` rendered clamp. Do not enlarge these tool-specific roles to ordinary body size.

**The One Hierarchy Rule.** Use readable sentence-case record headings and restrained weights; let size, spacing and grouping establish priority.

## Layout

The desktop shell uses a blue fixed sidebar, a compact sticky header and a cool canvas. The sidebar is `15rem` wide, collapses to `4.5rem`, and gives way to mobile navigation below the large breakpoint. Page actions wrap beside or below headings. The first viewport prioritizes the page title, operational summaries/search and existing record content rather than decorative introductions.

Shared toolbars use the spacing scale, wrap controls and keep search prominent. Optional filters use disclosures. Dashboard summaries reflow into two columns on small screens; its seven-part strength strip moves through four columns at `1100px` and two at `639px`. Personnel controls stack at `767px`. Most module controls and summaries reflow at `639px`; Orders and Promotion also adapt at `1199px`. Education details retain full-width qualification context, then two academic/training columns that stack on mobile. Account summaries retain three compact columns.

Dense records scroll inside their own containers. Common module tables retain a `900px` minimum, Management `1120px`, Orders `1080px` and Promotion roster `1180px`; empty-table states may relax the minimum. Document metadata rearranges at `1000px`, and actions/template columns stack on narrow screens. Worksheet ribbon panels, navigation and grids scroll locally while outer toolbars wrap. Login stacks at `900px` and becomes edge-to-edge at `520px`.

**The Local Overflow Rule.** Preserve readable record columns by scrolling the table or tool region; wrap the page's headings and controls within the viewport.

## Elevation & Depth

Work surfaces are flat at rest: borders, dividers and tonal differences convey grouping. The final screen rules remove shadows from shared panels and summaries. The floating personnel selection toolbar retains a functional soft shadow. Login focus may use a restrained ring; dialogs and floating controls retain their established depth where needed. Canvas and login remove decorative grid, grain and glow treatments.

**The Flat Work Surface Rule.** Use border and tone for ordinary panels; reserve elevation for floating interaction and focus.

## Shapes

Panels use the panel radius; controls use the smaller control radius. Single-pixel rules define panels, rows and headers. The page heading is a flat divider rather than a card. Status dots and existing badges may retain their functional small silhouettes; document and spreadsheet content keeps the geometry required by its editor or printed format.

## Components

### Buttons

Shared buttons are compact bordered controls with a `40px` minimum height. Primary uses live primary roles; secondary uses card, foreground and border roles. Hover strengthens blue or moves secondary controls to accent tone. Disabled controls communicate their state; preserve semantic danger and ghost variants. Global keyboard focus uses a `2px` role-colored outline with `2px` offset; page controls commonly use `3px` offset. Sidebar focus uses yellow.

### Inputs / Fields

Fields use input surfaces, readable text, borders and control corners. Ordinary controls have at least `40px` height; search commonly uses `44px`, login `46px`. Labels remain visible. Disabled fields use muted roles. Focus is visible without relying on hover.

### Navigation and Tabs

Blue navigation uses pale text and icons. The current route is a solid yellow row with dark text. View tabs wrap; the shared selected tab uses an accent surface and restrained yellow underline. Dashboard analysis tabs and worksheet tools keep their contextual blue selection treatment.

### Summaries and Containers

Summaries use bordered cells, muted labels and tabular values. The Dashboard's key total uses soft yellow; most record measures use data blue. Ordinary work panels use card surfaces, borders and no shadow. Education personnel details keep selection independent from disclosure, with visible entry actions.

### Records and Tool Workbenches

Tables have quiet header bands, row rules, visible actions, hover/selection feedback and local scroll. Search/filter state, result counts and pagination stay legible. Document list actions remain visible. Worksheet ribbon controls retain `28px` fields, `32px` formula inputs/sheet tabs and at least `36px` ribbon tabs. Print styles hide application chrome, use white paper and black copy, and preserve worksheet gridlines and repeating table headers. Document page geometry and export formatting remain tool constraints rather than general card styles.

### Login and Loading

Login uses a flat blue agency panel and a white/theme-aware form panel with yellow brand details. Existing agency identity stays intact. Loading uses the shared blue, white and yellow system without decorative canvas effects; preserve progress and reduced-motion behavior.

## Do's and Don'ts

### Do:

- **Do** use live shared roles for light and dark themes.
- **Do** keep search, record content and actions prominent and readable.
- **Do** retain local table scrolling, responsive control wrapping and visible keyboard focus.
- **Do** preserve routes, authentication, permissions, data, document and export behavior.
- **Do** preserve dense workbook controls and document/worksheet print exceptions.

### Don't:

- **Don't** spread yellow beyond meaningful navigation, key totals and existing brand details.
- **Don't** reintroduce decorative grid, grain or glow effects on the canvas or login.
- **Don't** treat screenshots or automated checks as certification of unexercised workflows.
- **Don't** inherit residual decorative kickers or eyebrows as a rule for new surfaces; these remain implementation drift, not a typography role.
