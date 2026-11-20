# OCR Reader integration QA: real source canvases and reviewed masks

**Date:** 20 November 2026. **Status:** testing only; not installed in public WordPress.

## A. Three real-page offline tests

The candidate JSONs from three independent source PDFs were transformed **in memory only** into the approved response shape, and the Reader's `scientificApprovedOcr` parser + `showOverlays` drawing logic were exercised in Chromium with original PDF page raster canvases. Candidate `maskReviewed:false` values were never persisted or published.

| Publication | PDF page | Candidate blocks parsed/rendered | Zoom/viewport checks |
|---|---:|---:|---:|
| Lavori pubblici (#93708) | 10 | 13/13 | 8 |
| Benessere IeFP (#93616) | 52 | 51/51 | 8 |
| Cultura OCP (#94629) | 68 | 10/10 | 8 |
| **Total** | | **74/74** | **24** |

At 75%, 100%, 150% and 200%, with 390px and 1366px viewport widths, no translated node was hidden by the Reader's overflow/fit guard. The text boxes use transparent backgrounds when `maskMode: source-only`; each independently approved source mask remains behind its English text.

### Source words left visible

An independent PyMuPDF word/rectangle comparison found only:
- Public works: `ASL-AOU` and `Unioni-CUC` (institutional/organizational column labels).
- IeFP: two `(n.` fragments in sample-size headings.
- Culture: one `Fig.` marker in the figure caption.

These **must be confirmed by a reviewer**; not every legible native word is a mistranslation. Dense IeFP table figures still need a visual typographic review, particularly headers and adjacent numeric cells. A no-overflow result does not automatically demonstrate the absence of double-rendered glyphs.

## B. Reproducible GitHub browser test

The **actual repository functions** are extracted at runtime from `ires-pdf-reader/assets/reader.js`, run in headless Chromium, and validated by:

- 4 zoom levels × 2 viewport widths: mask count, source-only transparency, fit/overflow, validated yellow cell background.
- Composite screenshot comparisons at 100% and 200%: original table gridline, native number and yellow cell area remain pixel-identical to the PDF-like canvas when an English text box crosses the gridline.
- Reject unreviewed masks; maintain legacy approved v1 without any mask.

Source: `tests/browser_ocr_integration.py`.

Successful run: https://github.com/ires-commits/ires-pdf-reader/actions/runs/44825525413

The GitHub Actions artifact **ires-reader-ocr-actual-function-browser-qa** contains `result.json`, `ocr-100.png` and `ocr-200.png`.

### Pending release gates

1. **Actual WordPress staging/public Reader** is not available to this isolated test: no end-to-end WordPress site test or real plugin activation has been executed.
2. Verify individual English translations against native source data and editorial terminology.
3. Review apparent double printing/typo overlaps on the IeFP second statistical table at mobile and 200% zoom.
4. Verify actual PDF.js canvas positioning, scroll and changing page in the installed Reader.
5. Validate server-side administrator import with both review checkboxes; keep page-specific rollback available.
6. Do not translate or approve rotated historical scanned table cells without high-confidence image-first OCR.

**Do not merge or publish the two draft PRs until the above are resolved.** No mass batch, no paid AI calls, no WordPress writes.
