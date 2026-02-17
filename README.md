# Self Case Reporting App

A lightweight single-page app (modular HTML/CSS/JS) for creating Dynamics 365 cases through a Power Automate HTTP endpoint.

## Features

- Issue Type + dependent Sub-Issue Type dropdowns
- Required Description field (20–2000 chars)
- Inline validation messages
- Loading and disabled-button submit state
- Success panel with Case Number, optional Case ID, and Copy button
- Error panel with helpful error + correlation/request ID when available
- API helper with 20-second timeout via `AbortController`

## Prerequisites

- Node.js 18+
- npm

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy env file and set your flow endpoint:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env`:

   ```env
   VITE_FLOW_URL=https://YOUR_FLOW_HTTP_TRIGGER_URL
   VITE_FLOW_KEY=optional_api_key
   ```

4. Start locally:

   ```bash
   npm run dev
   ```

5. Open `http://localhost:5173`.

## Request sent to Power Automate

`POST ${VITE_FLOW_URL}` with JSON:

```json
{
  "issueType": "Billing",
  "subIssueType": "Refund",
  "description": "Customer was charged twice for the same invoice...",
  "source": "web"
}
```

Headers:

- `Content-Type: application/json`
- `x-api-key: <VITE_FLOW_KEY>` (only when `VITE_FLOW_KEY` is set)

## Expected response from flow

```json
{
  "caseNumber": "CAS-12345",
  "caseId": "00000000-0000-0000-0000-000000000000",
  "message": "Created"
}
```

If errors occur, return non-2xx JSON with `message` and optional correlation/request id:

```json
{
  "message": "Validation failed",
  "requestId": "abc-123"
}
```

## Power Automate flow notes

1. Use **When an HTTP request is received** trigger.
2. Parse input JSON with fields: `issueType`, `subIssueType`, `description`, `source`.
3. Create the case in Dataverse/Dynamics 365.
4. Add **Response** action:
   - Status code: `200` on success (or appropriate 4xx/5xx on failures)
   - Headers (recommended):
     - `Content-Type: application/json`
     - `Access-Control-Allow-Origin: http://localhost:5173` (or your deployed origin)
     - optionally `x-correlation-id: <tracked id>`
   - Body includes `caseNumber`, optional `caseId`, `message`.

## CORS guidance

If browser CORS errors appear, ensure the API layer returns:

- `Access-Control-Allow-Origin` with your app origin
- `Access-Control-Allow-Headers: content-type, x-api-key`
- `Access-Control-Allow-Methods: POST, OPTIONS`

If needed, handle preflight `OPTIONS` in a proxy/API layer.

## Project structure

```text
.
├─ src/
│  ├─ api.js
│  ├─ App.jsx
│  ├─ constants.js
│  ├─ main.jsx
│  └─ styles.css
├─ .env.example
├─ index.html
├─ package.json
├─ server.js
└─ README.md
```
