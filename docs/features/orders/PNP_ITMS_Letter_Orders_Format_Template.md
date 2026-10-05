# PNP-ITMS Letter Orders Format Template Breakdown

## 1. Overall Page Setup

This document is a **one-page PNP-ITMS Letter Order template** with a security classification header/footer, institutional letterhead, order metadata, travel authorization paragraph, personnel roster, command authority, signature blocks, and distribution notation.

### Page Settings

| Setting | Format |
|---|---|
| Paper Size | A4, Portrait |
| Width | 8.27 in / 210 mm |
| Height | 11.69 in / 297 mm |
| Left Margin | 1.00 in |
| Right Margin | ~0.92 in |
| Top Margin | ~0.89 in |
| Bottom Margin | ~0.02 in |
| Header Distance | ~0.24 in from edge |
| Footer Distance | ~0.13 in from edge |
| Main Usable Width | ~6.35 in |
| Main Body Font | Arial, 12 pt |
| Default Body Color | Black |
| Paragraph Spacing | 0 pt before / 0 pt after |
| General Line Spacing | Approximately single |

> **Template Recommendation:** Preserve the visual position of the footer, but use proper Word footer settings instead of relying on an extremely small bottom margin.

---

## 2. Security Classification Header

At the absolute top of the page:

```text
R E S T R I C T E D
```

This should be placed in the **Word Header** so it automatically repeats on additional pages.

### Formatting

| Attribute | Format |
|---|---|
| Text | `R E S T R I C T E D` |
| Font | Arial |
| Size | 10 pt |
| Case | ALL CAPS |
| Alignment | Center |
| Character Treatment | Letters individually underlined |
| Letter Spacing | A normal space between every character |
| Bold | No |
| Position | Header area, close to top edge |

The letters themselves are underlined while the spaces are not, producing the segmented underline appearance.

---

## 3. Institutional Letterhead

The institutional heading is arranged as:

```text
[PNP EMBLEM]          Republic of the Philippines          [ITMS SEAL]
                    NATIONAL POLICE COMMISSION
                    PHILIPPINE NATIONAL POLICE
             INFORMATION TECHNOLOGY MANAGEMENT SERVICE
                  Camp BGen Rafael T Crame, Quezon City
```

### Typography

| Line | Font | Size | Style |
|---|---|---:|---|
| Republic of the Philippines | Arial | 10 pt | Regular |
| NATIONAL POLICE COMMISSION | Arial | 10 pt | Regular |
| PHILIPPINE NATIONAL POLICE | Arial | 11 pt | Bold |
| INFORMATION TECHNOLOGY MANAGEMENT SERVICE | Arial | 11 pt | Bold |
| Camp BGen Rafael T Crame, Quezon City | Arial | 10 pt | Regular |

All lines are centered with tight vertical spacing.

### Logo Placement

Recommended implementation: a **3-column borderless table**.

| Left | Center | Right |
|---|---|---|
| PNP Logo | Institutional Heading | ITMS Logo |

Suggested column proportions:

```text
Left:   ~1.00"
Center: ~4.30"
Right:  ~1.00"
```

The left PNP emblem in the source is approximately **0.82 in wide × 1.08 in high**. The right ITMS seal should be visually balanced with it.

---

## 4. Office Identifier and Date Line

Format:

```text
ITMS                                      [DATE]
```

### Formatting

| Element | Format |
|---|---|
| `ITMS` | Arial 12 pt, Bold, Left Aligned |
| Date | Arial 12 pt, Regular, Right Aligned |
| Baseline | Same line |

### Recommended Implementation

Use either:

- A left and right tab stop, or
- A borderless two-column table.

Example:

```text
ITMS                                      August 18, 2026
```

Avoid manually pressing Tab repeatedly.

---

## 5. Order Classification Block

Format:

```text
LETTER ORDERS
NUMBER [YYYY-ORDER NUMBER]
```

Example:

```text
LETTER ORDERS
NUMBER 2026-767
```

### Formatting

- Arial 12 pt
- Bold
- Left aligned
- No colon after `LETTER ORDERS`
- No colon after `NUMBER`
- Keep the two lines close together

---

## 6. Subject Line

Format:

```text
SUBJECT    :  [SUBJECT]
```

Example:

```text
SUBJECT    :  Travel
```

### Formatting

| Attribute | Format |
|---|---|
| Font | Arial |
| Size | 12 pt |
| Weight | Bold |
| Alignment | Left |
| Label | `SUBJECT` |
| Separator | `:` |
| Value | Same line |

Recommended tab stop position: approximately **1.0–1.1 inches from the left margin**.

Example uses:

```text
SUBJECT    :  Travel
SUBJECT    :  Training
SUBJECT    :  Conference
SUBJECT    :  Inspection
```

---

## 7. Main Authorization Paragraph

This is the functional core of the Letter Order.

### Generic Structure

```text
In addition to their duties and responsibilities, following-named
personnel of this Service are authorized to travel to [DESTINATION/S]
from [START DATE] to [END DATE] ([DAY] to [DAY]) for the conduct of
[PURPOSE]:
```

### Formatting

| Attribute | Format |
|---|---|
| Font | Arial |
| Size | 12 pt |
| Alignment | Justified |
| Width | Full text width, about 6.35 in |
| First Line | Indented |
| Recommended First-Line Indent | 0.60–0.75 in |
| Paragraph Spacing | 0 pt before / 0 pt after |
| Line Spacing | Approximately single |
| Ending | Colon |

The paragraph ends with a colon because the list of personnel follows immediately.

---

## 8. Personnel Roster

Structure:

```text
PLTCOL [FULL NAME]
PLT [FULL NAME]
NUP [FULL NAME]
NUP [FULL NAME]
NUP [FULL NAME]
NUP [FULL NAME]
Driver: [RANK/NAME]
```

### Formatting

| Attribute | Format |
|---|---|
| Font | Arial |
| Size | 12 pt |
| Alignment | Left |
| Left Indent | ~1.18 in from normal text margin |
| Bullets | None |
| Numbering | None |
| Line Spacing | Single |
| Rank | Same line as name |
| Driver Label | `Driver:` |

Approximate physical position from the left edge:

```text
1.00" page margin
+ 1.18" list indent
≈ 2.18"
```

Do not center individual names. Use a left indent so every name begins at the same position.

---

## 9. Command Authority Line

Format:

```text
BY COMMAND OF [COMMANDING OFFICER RANK AND SURNAME]:
```

Example:

```text
BY COMMAND OF POLICE BRIGADIER GENERAL PALGUE:
```

### Formatting

| Attribute | Format |
|---|---|
| Font | Arial |
| Size | 12 pt |
| Weight | Bold |
| Case | ALL CAPS |
| Ending | Colon |
| Alignment | Preferably Center |

The source visually shifts the line using indentation, but for a reusable template, true center alignment is more stable.

---

## 10. Signature and Certification Area

Visual structure:

```text
OFFICIAL:                                  [COMMAND OFFICIAL]
                                           [Rank]
                                           [Position]


      [CERTIFYING OFFICIAL]
      [Rank]
      [Position Line 1]
      [Position Line 2]

DISTRIBUTION:
      "[CODE]"
```

---

## 11. Right-Side Authority Block

Template:

```text
[NAME]
[RANK]
[POSITION]
```

### Formatting

| Element | Format |
|---|---|
| Name | Arial 12 pt, Bold Italic |
| Rank | Arial 12 pt, Regular |
| Position | Arial 12 pt, Regular |

Example:

```text
RANDI M PATIÑO
Police Colonel
Chief of Staff
```

---

## 12. `OFFICIAL:` Label

Format:

```text
OFFICIAL:
```

### Formatting

- Arial 12 pt
- Regular
- Left aligned
- Positioned on the left side of the signature row
- Leave enough vertical blank space for a handwritten or digital signature

---

## 13. Certifying Official Block

Template:

```text
[OFFICIAL NAME]
[POLICE RANK]
[OFFICE / POSITION LINE 1]
[OFFICE / POSITION LINE 2]
```

### Formatting

| Element | Format |
|---|---|
| Name | Arial 12 pt, Bold Italic |
| Rank | Arial 12 pt, Regular |
| Position | Arial 12 pt, Regular |

Example:

```text
VICTORIO M DELA PEÑA, JR
Police Colonel
Chief, Administrative and
Resource Management Division
```

---

## 14. Recommended Signature Table Structure

For a clean reusable template, use a **3-column borderless table** instead of complicated tabs or many merged cells.

```text
┌───────────────────────┬───────────┬───────────────────────┐
│ OFFICIAL:             │           │ [COMMAND OFFICIAL]    │
│                       │           │ [Rank]                │
│                       │           │ [Position]            │
├───────────────────────┴───────────┼───────────────────────┤
│                                   │                       │
│ [CERTIFYING OFFICIAL]             │                       │
│ [Rank]                            │                       │
│ [Position Line 1]                 │                       │
│ [Position Line 2]                 │                       │
└───────────────────────────────────┴───────────────────────┘
```

Suggested proportions:

```text
Left block:  ~2.88"
Spacer:      ~0.56"
Right block: ~2.85"
```

Set all borders to **No Border**.

---

## 15. Distribution Section

Format:

```text
DISTRIBUTION:
      "[DISTRIBUTION CODE]"
```

Example:

```text
DISTRIBUTION:
      "C"
```

### Formatting

- Arial 12 pt
- Regular
- Left aligned
- Distribution code slightly indented
- Not bold

---

## 16. Bottom Security Classification

The bottom of the page repeats:

```text
R E S T R I C T E D
```

### Formatting

| Attribute | Format |
|---|---|
| Location | Word Footer |
| Font | Arial |
| Size | 10 pt |
| Alignment | Center |
| Case | ALL CAPS |
| Letters | Underlined individually |
| Placement | Very close to bottom edge |

Use a true Word footer so the classification automatically appears on every page.

---

## 17. Recommended Vertical Hierarchy

```text
HEADER
R E S T R I C T E D


LETTERHEAD
[PNP Logo]     Institutional Heading     [ITMS Logo]


ITMS                                           [DATE]


LETTER ORDERS
NUMBER [NUMBER]


SUBJECT    :  [SUBJECT]


        [JUSTIFIED AUTHORIZATION PARAGRAPH]


        [PERSONNEL 1]
        [PERSONNEL 2]
        [PERSONNEL 3]
        [ETC.]
        Driver: [NAME]


        BY COMMAND OF [COMMANDING OFFICER]:


OFFICIAL:                              [OFFICIAL NAME]
                                       [RANK]
                                       [POSITION]


     [CERTIFYING OFFICIAL]
     [RANK]
     [POSITION]


DISTRIBUTION:
     "[CODE]"


FOOTER
R E S T R I C T E D
```

---

# 18. Clean Master Template

```text
R E S T R I C T E D


[PNP LOGO]

Republic of the Philippines
NATIONAL POLICE COMMISSION
PHILIPPINE NATIONAL POLICE
INFORMATION TECHNOLOGY MANAGEMENT SERVICE
Camp BGen Rafael T Crame, Quezon City

                                              [ITMS LOGO]


ITMS                                           [DATE]


LETTER ORDERS
NUMBER [LETTER ORDER NUMBER]


SUBJECT    :  [SUBJECT]


        In addition to their duties and responsibilities, following-named
personnel of this Service are authorized to travel to [DESTINATION/S]
from [START DATE] to [END DATE] ([DAY] to [DAY]) for the conduct of
[PURPOSE]:


        [RANK] [FULL NAME]
        [RANK] [FULL NAME]
        [RANK] [FULL NAME]
        [RANK] [FULL NAME]
        [RANK] [FULL NAME]
        Driver: [RANK/NAME]


        BY COMMAND OF [COMMANDING OFFICER RANK AND NAME]:


OFFICIAL:                              [NAME OF OFFICIAL]
                                       [RANK]
                                       [POSITION]


     [NAME OF CERTIFYING OFFICIAL]
     [RANK]
     [POSITION / DIVISION]


DISTRIBUTION:
     "[CODE]"


R E S T R I C T E D
```

---

# 19. Fixed vs. Editable Fields

## Fixed Layout Elements

These should normally remain unchanged in the master template:

- `R E S T R I C T E D` header
- `R E S T R I C T E D` footer
- PNP logo
- ITMS logo
- Institutional heading
- `ITMS`
- `LETTER ORDERS`
- `NUMBER`
- `SUBJECT`
- `OFFICIAL:`
- `DISTRIBUTION:`

## Editable Fields

These should be replaced for every new Letter Order:

- `[DATE]`
- `[LETTER ORDER NUMBER]`
- `[SUBJECT]`
- `[DESTINATION/S]`
- `[START DATE]`
- `[END DATE]`
- `[DAY]`
- `[PURPOSE]`
- `[PERSONNEL]`
- `[DRIVER]`
- `[COMMANDING OFFICER]`
- `[OFFICIAL NAME]`
- `[RANK]`
- `[POSITION]`
- `[CERTIFYING OFFICIAL]`
- `[DISTRIBUTION CODE]`

---

# 20. Template Construction Recommendation

For the cleanest and most reusable Word version:

1. Put the top `R E S T R I C T E D` text inside the **Header**.
2. Put the bottom `R E S T R I C T E D` text inside the **Footer**.
3. Use a **3-column borderless table** for the two logos and institutional heading.
4. Use a **2-column borderless table** for `ITMS` and the date.
5. Use fixed paragraph styles for:
   - Letter Orders
   - Subject
   - Authorization Paragraph
   - Personnel List
   - Command Authority
6. Use another **borderless table** for the signature and certification blocks.
7. Use placeholder fields for all editable content.
8. Avoid using repeated spaces and manual tabs whenever a table or proper tab stop can provide stable alignment.
