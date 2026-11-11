# Plan 006: Require Explicit Authentication Token in Apps Script and Eliminate Default Secret Bypass

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec8b2a..HEAD -- apps_script.gs tests/security.test.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (30m–1h)
- **Risk**: LOW
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `2ec8b2a`, 2026-11-01

## Why this matters

The Google Apps Script backend (`apps_script.gs`) functions as the cloud synchronization and backup endpoint for personal financial data. Currently, `isAuthorized(e)` contains a development fallback: if the script property `SHEETS_SECRET_TOKEN` is not configured, or if it matches the default placeholder `'DefinaUmaChaveComplexaAqui123!'`, it returns `true` unconditionally.

This means any user deployment where the placeholder was not modified leaves the entire financial database publicly accessible to unauthenticated HTTP GET and POST requests. Removing this bypass and enforcing an explicit non-default secret ensures user financial confidentiality.

## Current state

- `apps_script.gs` (lines 29–54):
```javascript
var SHARED_SECRET = 'DefinaUmaChaveComplexaAqui123!'; // Chave privada de acesso (ou defina SHEETS_SECRET_TOKEN nas Propriedades do script)
var SHEET_NAME = 'Backup';

function getSecretToken() {
  try {
    var prop = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET_TOKEN');
    if (prop) return prop;
  } catch(err) {}
  return SHARED_SECRET;
}

function isAuthorized(e) {
  var secret = getSecretToken();
  if (!secret || secret === 'DefinaUmaChaveComplexaAqui123!') {
    // Permite uso inicial se o usuario ainda nao configurou token exclusivo
    return true;
  }
  var token = (e && e.parameter && e.parameter.token) || '';
  if (!token && e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      token = parsed.token || '';
    } catch(err) {}
  }
  return token === secret;
}
```
- `tests/security.test.js` (lines 1–35): Contains tests for CSP and toast sanitization in `index.html`, but does not test `apps_script.gs` authentication logic.

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `& "$env:TEMP\node.exe" --test tests/security.test.js` | exit 0, all pass |
| Full suite | `& "$env:TEMP\node.exe" --test (Get-ChildItem -Recurse -Filter *.test.js tests \| Select-Object -ExpandProperty FullName)` | exit 0, all pass |

*(Note: On Windows without node in PATH, use `$env:TEMP\node.exe` or standard `node`).*

## Scope

**In scope**:
- `apps_script.gs` — harden `isAuthorized` and error responses.
- `tests/security.test.js` — add test coverage for Apps Script authorization logic.

**Out of scope**:
- Changing JSONP response format (`doGet`) or POST response format (`doPost`) for valid tokens.
- Modifying UI or network sync logic in `index.html`.

## Git workflow

- Branch: `advisor/006-require-explicit-sheets-token`
- Commit style: `sec: require explicit non-default secret in apps script authorization`
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Reject default placeholder and empty secret in `apps_script.gs`

In `apps_script.gs`, update `isAuthorized(e)` so that:
1. It retrieves the secret using `getSecretToken()`.
2. If `secret` is falsy, blank, or equals `'DefinaUmaChaveComplexaAqui123!'`, it treats authorization as failed (`return false;`), logging an explanatory message: `Logger.log('Erro: SHEETS_SECRET_TOKEN não configurado ou chave padrão ainda em uso.')`.
3. Validates the caller's token against the configured secret using constant-time string comparison or strict equality.

Code pattern for `isAuthorized` in `apps_script.gs`:
```javascript
var DEFAULT_PLACEHOLDER_SECRET = 'DefinaUmaChaveComplexaAqui123!';

function isAuthorized(e) {
  var secret = getSecretToken();
  if (!secret || secret === DEFAULT_PLACEHOLDER_SECRET) {
    Logger.log('Acesso negado: configure uma chave secreta exclusiva em SHEETS_SECRET_TOKEN nas Propriedades do script.');
    return false;
  }
  var token = (e && e.parameter && e.parameter.token) || '';
  if (!token && e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      token = parsed.token || '';
    } catch(err) {}
  }
  return token === secret;
}
```

And update error output in `doGet` and `doPost` when unauthorized:
```javascript
{ error: 'unauthorized', message: 'Token inválido ou não configurado nas propriedades do script.' }
```

### Step 2: Add authorization tests in `tests/security.test.js`

Add a test suite in `tests/security.test.js` that evaluates the authorization logic:
1. Rejection when secret is the placeholder `'DefinaUmaChaveComplexaAqui123!'`, even if caller passes that placeholder token.
2. Rejection when caller passes missing or incorrect token.
3. Acceptance when secret is configured to a custom key and caller passes the matching token via query parameter (`e.parameter.token`) or JSON body (`e.postData.contents`).

**Verify**:
`& "$env:TEMP\node.exe" --test tests/security.test.js` → exit 0, all pass.

## Done criteria

- [x] `apps_script.gs` no longer returns `true` when secret is `'DefinaUmaChaveComplexaAqui123!'` or unset.
- [x] `tests/security.test.js` tests `isAuthorized` with placeholder, mismatched token, and matching token.
- [x] Full test suite passes without errors.
- [x] `plans/README.md` status row updated.

## STOP conditions

- If changing `isAuthorized` breaks the existing JSONP response wrapper for valid callers, STOP and adjust the wrapper.
- If existing sync in `index.html` sends tokens in a different format than `e.parameter.token` or `e.postData.contents`, STOP and report.
