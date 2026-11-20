# IRES PDF Reader 2.14.13 - review-gated table OCR overlays

Changes:
- Optional `maskMode: source-only` draws English text over transparent placement rectangles while hiding only reviewer-approved Italian glyph rectangles; native PDF table rules remain visible.
- Optional validated `maskFill: "#RRGGBB"` retains sampled table-cell background colours.
- Reject unreviewed masks, masks outside the source/target bounds and CSS other than the hex fill.
- Legacy approved OCR v1 pages remain backward-compatible.
- Browser QA executes the actual Reader parser and rendering functions on deterministic canvases at 75, 100, 150 and 200 percent zoom; assertions check that numbers, table rulings and colours remain unchanged.
- No bulk translation occurs on plugin installation. No additional OCR overlay becomes active until it is separately approved in Produzione Scientifica.

QA: https://github.com/ires-commits/ires-pdf-reader/actions/runs/44825525413

Important rollout note: staging/live WordPress verification and editorial proofreading remain required before activating the new multilingual candidates. Installing the Reader alone does not certify every PDF page.
