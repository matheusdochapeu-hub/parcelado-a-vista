# Plan 004: Sync Security, Status Message Sanitization, and Offline Asset Fallback

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9187a6d..HEAD -- index.html sw.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S (1–2h)
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md
- **Category**: security
- **Planned at**: commit `9187a6d`, 2026-10-30

## Why this matters

Three integrity and security issues affect data synchronization and offline caching:
1. **Unescaped Sync Status Messages**: In [index.html:1002](file:///scratch/parcelado-a-vista/index.html#L1002-L1012), `box.innerHTML = '❌ ' + msg;` injects raw error messages returned by external sources (e.g. `data.error`, `err`, or `e.message` during JSON backup parsing) directly into the DOM as HTML instead of plain text.
2. **False-Positive Sync Feedback**: In [index.html:1101](file:///scratch/parcelado-a-vista/index.html#L1101-L1110), `pushToSheets()` uses `fetch(..., { mode: 'no-cors' })`. In `no-cors` mode, browser promises resolve even on HTTP 401, 403, and 500 responses. The user is shown `Salvo ✓` even when the Google Apps Script token is invalid or the server rejects the request.
3. **Mismatched Service Worker Offline Fallback**: In [sw.js:91](file:///scratch/parcelado-a-vista/sw.js#L91), when an offline asset fetch fails (such as an icon or image), the catch handler falls back to returning `./index.html`. Browsers log MIME-type warnings when receiving `text/html` for image requests.

## Scope

**In scope**:
- `index.html` (specifically `setSyncStatus` and `pushToSheets`)
- `sw.js` (asset fallback handling and CACHE_NAME bump)
- `tests/security.test.js` (create)

## Steps

### Step 1: Write security tests in `tests/security.test.js`

Create `tests/security.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('security: setSyncStatus usa textContent/seguro e não interpreta HTML malicioso', () => {
  const ctx = loadAppContext();
  const box = ctx.document.getElementById('syncStatusBox');

  const maliciousPayload = '<img src=x onerror=alert(1)>';
  ctx.setSyncStatus('err', maliciousPayload);

  assert.ok(box.textContent.includes(maliciousPayload), 'O texto bruto deve estar preservado no textContent');
  assert.ok(!box.innerHTML.includes('<img'), 'Não deve renderizar elemento HTML no innerHTML');
});
```

### Step 2: Sanitize `setSyncStatus` and enhance `pushToSheets`

In `index.html`:

1. Replace `box.innerHTML` with `box.textContent` in `setSyncStatus`.
2. Update `pushToSheets` success message to `Enviado ao Sheets ✓`.

### Step 3: Fix Service Worker asset fallback in `sw.js`

In `sw.js`:
1. Bump cache version to `faturas-pwa-v11`.
2. Return 404 for non-HTML failed assets instead of `./index.html`.

## Done criteria

- [ ] `node --test tests/security.test.js` passes.
- [ ] `syncStatusBox` uses `textContent`.
- [ ] `sw.js` returns 404 for failed static assets offline.
