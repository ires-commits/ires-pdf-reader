# Controlled server deployment (not enabled by default)

This repository publishes a validated ZIP on GitHub. The production WordPress installation must **not** be updated merely because a release exists. Have the server administrator review and explicitly approve the following workflow.

## Preconditions

- WordPress installed with WP-CLI; dedicated low-privilege deployment account with permission to update **only** this plugin (where technically possible).
- Working backup/snapshot and documented restoration procedure.
- Staging site that uses the same PHP, WordPress, and PDF-serving configuration.
- Outbound HTTPS to api.github.com and github.com.
- Production scheduling and notifications approved by the site's administrators.

## Recommended workflow

1. Poll `https://api.github.com/repos/ires-commits/ires-pdf-reader/releases/latest` with an authenticated or appropriately rate-limited HTTPS client.
2. Require a non-prerelease version strictly newer than the installed plugin and verify the release artifact against a pinned, independently trusted SHA-256 digest or signature. A checksum downloaded from the same untrusted release is **not** sufficient.
3. Download and verify the ZIP. Inspect the ZIP for unexpected paths and ensure it contains `ires-pdf-reader/ires-pdf-reader.php` and `ires-pdf-reader/vendor/pdfjs/pdf.min.js`.
4. Deploy to staging first, test opening a known PDF, pagination, zoom, and console errors; only continue on success.
5. Take a fresh production snapshot and acquire a deployment lock. Run the WP-CLI update **only** for `ires-pdf-reader`, never a blanket plugin update.
6. Confirm the installed version with `wp plugin get ires-pdf-reader --field=version`, check site health and perform a real browser smoke test. Roll back on failure.
7. Notify the operator **only after** post-deployment verification. Include old/new versions, timestamp, test outcome, and rollback reference.

## Minimal WP-CLI commands (manual, not a scheduled job)

Run from the WordPress root, after staging approval and backup:

```sh
wp plugin get ires-pdf-reader --field=version
wp plugin update ires-pdf-reader
wp plugin get ires-pdf-reader --field=version
```

The plugin's GitHub updater must be active and the WordPress installation must allow WP-CLI to perform updates. Some sites disable automatic updates intentionally; do not bypass that policy. The actual unattended deployment job should be configured on the server only after explicit authorization, and should use staging, verification, and rollback.

**Status:** design/documentation only. No cron job, webhook, server credentials, or unattended production deployment has been configured.
