"""Render the PAIS weekly timeline Markdown table to an A4 PDF."""

from pathlib import Path
import re

import pymupdf


ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / "docs/project/PAIS_2_0_WEEKLY_TIMELINE_2026_10_26.md"
OUTPUT = ROOT / "pais-2-0-weekly-timeline-updated-2026-10-26.pdf"


def rows_from_markdown():
    rows = []
    for line in SOURCE.read_text(encoding="utf-8").splitlines():
        if re.match(r"^\| \d+ \|", line):
            parts = [part.strip() for part in line.strip("|").split("|")]
            assert len(parts) == 5, line
            rows.append(parts)
    assert len(rows) == 12, f"Expected 12 weeks, got {len(rows)}"
    return rows


doc = pymupdf.open()
font_regular = pymupdf.Font(fontname="helv")
font_bold = pymupdf.Font(fontname="hebo")
navy = (0.08, 0.16, 0.30)
blue = (0.13, 0.35, 0.62)
muted = (0.32, 0.39, 0.48)
border = (0.85, 0.89, 0.93)
panel = (0.975, 0.983, 0.992)


def write(page, x, y, value, size=10, bold=False, color=navy):
    page.insert_text(
        (x, y), value, fontsize=size,
        fontname="hebo" if bold else "helv",
        color=color,
    )


def width(value, size, bold=False):
    return (font_bold if bold else font_regular).text_length(value, fontsize=size)


def wrap(value, size, max_width):
    lines = []
    current = ""
    for word in value.split():
        candidate = f"{current} {word}" if current else word
        if current and width(candidate, size) > max_width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def header(page, page_number):
    write(page, 38, 40, "PAIS 2.0", 10, True, blue)
    write(page, 38, 64, "Weekly Timeline Report", 20, True)
    write(page, 38, 82, "August 10 - October 26, 2026  |  Updated October 26, 2026", 9, color=muted)
    page.draw_line((38, 95), (557, 95), color=blue, width=1.4)
    write(page, 38, 814, "Source: supplied timeline and repository records through October 22, 2026", 7.8, color=muted)
    number = f"Page {page_number} of 2"
    write(page, 557 - width(number, 7.8), 814, number, 7.8, color=muted)


def card(page, row, y):
    week, dates, focus, accomplishment, status = row
    rect = pymupdf.Rect(38, y, 557, y + 88)
    page.draw_rect(rect, color=border, fill=panel, width=0.7)
    write(page, 49, y + 17, f"WEEK {int(week):02d}", 9.5, True, blue)
    write(page, 119, y + 17, dates + ", 2026", 9, color=muted)
    status_color = (0.05, 0.42, 0.29) if "complete" in status.lower() else (0.47, 0.29, 0.05)
    if status.startswith("Implemented"):
        status_color = (0.12, 0.36, 0.61)
    write(page, 547 - width(status, 8.1, True), y + 17, status, 8.1, True, status_color)
    write(page, 49, y + 37, focus, 11, True)
    lines = wrap(accomplishment, 9.5, 495)
    assert len(lines) <= 3, (week, lines)
    for index, line in enumerate(lines):
        write(page, 49, y + 55 + index * 13, line, 9.5)


rows = rows_from_markdown()
for page_index in range(2):
    page = doc.new_page(width=595.28, height=841.89)
    header(page, page_index + 1)
    for local_index, row in enumerate(rows[page_index * 6:(page_index + 1) * 6]):
        card(page, row, 111 + local_index * 95)

    if page_index == 0:
        write(page, 38, 700, "Weeks 1-8 retain the completion status reported in the original PDF.", 8.5, color=muted)
        write(page, 38, 714, "Later weeks record repository implementation; they do not establish deployment.", 8.5, color=muted)
    else:
        page.draw_rect(pymupdf.Rect(38, 690, 557, 794), color=border, fill=(0.94, 0.97, 1.0), width=0.7)
        write(page, 49, 710, "RELEASE CHECKPOINT", 9.5, True, blue)
        note = (
            "Repository records do not confirm stakeholder UAT sign-off, target-environment "
            "migration and RLS checks, backup restoration, production deployment, or handover. "
            "The DLOS migration and operational checks remain required before rollout."
        )
        for index, line in enumerate(wrap(note, 9, 495)):
            write(page, 49, 728 + index * 13, line, 9)

doc.set_metadata({
    "title": "PAIS 2.0 Weekly Timeline Report - Updated October 26, 2026",
    "subject": "Weekly implementation timeline and release checkpoint",
    "author": "PAIS 2.0 project",
})
doc.save(OUTPUT, garbage=4, deflate=True)
print(OUTPUT)
