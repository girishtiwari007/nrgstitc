# NR GST ITC Knowledge Portal

Professional GST ITC flagging and reference portal for Northern Railway / Moradabad Division. It combines the master HSN/SAC table, Railway Board guidance, circular links, procurement FAQs, construction references, ITC flags, and invoice-level decision notes.

## Important Separation

This repository is the GST ITC portal only. Keep it separate from the Revenue Liability Portal and do not merge either portal's `index.html` into the other.

## Run

No installation is required. Either open `index.html` directly or run the local backend:

```powershell
npm start
```

Then open `http://localhost:3000`. Use `npm run dev` for automatic server restarts during development.

## Test

```powershell
npm test
```

The smoke suite checks JavaScript syntax, all 165 master records, mandatory data fields, duplicate serials, key HSN/SAC entries, static delivery, API search/filter behavior, and path traversal protection.

## Project Structure

```text
index.html                 Page structure
assets/css/portal.css      Responsive portal styling
assets/js/data.js          Shared knowledge dataset
assets/js/app.js           Browser behavior
server.js                  Dependency-free Node.js server and API
scripts/smoke-test.js      Data and endpoint tests
docs/ARCHITECTURE.md       Design and backend evolution notes
```

## API

The backend exposes versioned, read-only endpoints at `/api/v1`. Examples:

```text
GET /api/health
GET /api/v1/meta
GET /api/v1/master?hsn=85176290
GET /api/v1/master?flag=T3&category=Transport
GET /api/v1/faqs?q=dealer
GET /api/v1/search?q=998349
```

See `docs/ARCHITECTURE.md` for the complete endpoint list and the recommended path to authentication, database storage, review workflows, and audit history.

## Deployment

GitHub Pages continues to serve the static portal from the repository root. The Node backend requires a Node.js host; set `PORT` when the platform does not use port 3000.

## Compliance Basis

The portal guides users through CGST Sections 16 and 17, Rules 42/43, Railway Board flagging instructions, end use, funding source, and current source material. It is a decision-support knowledge base, not a substitute for invoice facts, current notifications, or competent tax review.
