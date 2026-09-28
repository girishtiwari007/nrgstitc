# Architecture

## Layers

- `index.html` contains the accessible page structure only.
- `assets/css/portal.css` owns layout, responsive behavior, and visual styling.
- `assets/js/data.js` is the canonical knowledge dataset. It supports browsers and CommonJS so the page and API read the same records.
- `assets/js/app.js` owns filters, tabs, tables, modals, exports, and other browser behavior.
- `server.js` serves the static portal and exposes a versioned, read-only JSON API.
- `scripts/smoke-test.js` validates required records, data integrity, static delivery, API filters, and path traversal protection.

## Backend Evolution

The current backend intentionally has no third-party dependencies. Its API paths are versioned under `/api/v1`, allowing the in-file dataset to be replaced later by PostgreSQL, an approved departmental service, or authenticated workflows without changing consumers.

Recommended future order:

1. Add a configuration layer for environment variables and approved source locations.
2. Introduce authentication and role-based access before any write endpoint.
3. Move knowledge records to a database with effective dates, source documents, review status, and an audit trail.
4. Add an administrative review workflow; never auto-publish scraped compliance material.
5. Deploy behind HTTPS with backups, monitoring, and departmental security review.

## API Contract

- `GET /api/health`
- `GET /api/v1/meta`
- `GET /api/v1/master?q=&hsn=&flag=&category=&fund=&endUse=&changed=`
- `GET /api/v1/master/:sr`
- `GET /api/v1/faqs?q=&category=`
- `GET /api/v1/circulars`
- `GET /api/v1/construction`
- `GET /api/v1/search?q=`

All endpoints are read-only. The portal remains usable from GitHub Pages and by opening `index.html` directly.
