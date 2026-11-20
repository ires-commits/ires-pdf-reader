# Collaudo overlay OCR - pubblicazione 95373

Questa matrice descrive i controlli prima di avviare il batch cronologico. **Non certifica test già eseguiti.**

| PDF page | Layout | Acceptance checks |
| --- | --- | --- |
| 5-6 | Table of contents | Keep indentation, page references, internal links and heading hierarchy |
| 9 | Bar chart | Preserve axes, numeric values, colours, bar geometry; translate title, legend and labels only when safely recognized |
| 11 | Map and text | Seven approved English blocks, no source-language bleed, map unchanged; acknowledge untranslated map legend |
| 22 | Table | Keep each numeric value and each label in its original cell, preserve alignment and borders |
| 23 | Mixed content | Preserve population pyramid and table; avoid overlap with regular text |

## Reader regressions

1. Visit a page with tabular layout before an OCR overlay is approved. The source PDF must remain visible, and the protective fallback must not be bypassed.
2. Activate an administrator-verified OCR overlay for that page, reload and translate. A prior table-protected state must not prevent fetching the newly approved overlay.
3. At 75%, 100%, 150% and 200% zoom, inspect whether every translated block fits without visible source-language bleed or cutoffs.
4. Test single-page and continuous scroll, desktop and mobile. Verify coordinate scaling and that figures remain unobscured.
5. Change the PDF hash (in a safe test environment): approved geometry must be invalidated. Missing/unverified/mismatched overlay must not be presented as verified.
6. Do not invoke Gemini merely to load an approved overlay or a previously cached translation.

## Release gate

Do not turn on the full archive batch until the five page types pass visual review on-site, followed by three complete publications including varied layout. Log per-page fit failures and unresolved chart/table labels. Preserve rollback and avoid suppressing the original PDF when overlay validation fails.
