# IRES PDF Reader 2.14.11 - QA and compatibility

- Backward compatible with the existing approved OCR v1 overlay for publication 95373, page 11.
- Accepts optional administrator-reviewed `maskRect` geometry to hide source glyph bleed, separate from the English text's original coordinates.
- Masks are checked for dimensions, margin limits and collisions; unreviewed masks are rejected. Masks are drawn only if English text fits.
- Approved OCR overrides stale table-protection warnings.
- Scientific publications are kept on the PDF rather than automatically opening simplified translated reading.
- No translation is automatically started by installing this version.
- Runtime mask contract tests: `node tests/ocr-reviewed-mask-contract.cjs`.

The masking system has been tested with offline page previews. The 7 candidate masks are not auto-activated on upgrade. Site-level visual verification after WordPress installation and explicit admin review are still required.
