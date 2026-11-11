# Plan 008: Automatically Infer Target Invoice Month from Transaction Dates during CSV/OFX Import

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec8b2a..HEAD -- index.html tests/fatura-import.test.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S (1h)
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ec8b2a`, 2026-11-01

## Why this matters

When importing an invoice statement via CSV or OFX, `openImportModal` unconditionally initializes `currentImportTargetMonth = getFirstOpenMonth()`. If a user uploads an older statement from 2 or 3 months ago (or an upcoming future cycle), the modal defaults to whatever open month is first in line.

If the user does not manually adjust the target month dropdown in the review modal, all expenses are imported into the wrong billing cycle, causing duplicate alerts or misallocated expenses across months. Automatically inferring the target invoice month from the transaction dates in the file eliminates this friction while still letting the user override the selection if desired.

## Current state

- `index.html` lines 2434–2445:
```javascript
function openImportModal(fileContent, fileName){
  var bg = document.getElementById('importModalBg');
  if(!bg) return;
  bg.classList.add('on');
  
  currentImportTargetMonth = getFirstOpenMonth();

  if(fileContent){
    processFaturaFile(fileContent, fileName || 'fatura.csv');
  } else {
    renderImportUploadPrompt();
  }
}
```
- `index.html` lines 2515–2525 (`processFaturaFile`):
```javascript
function processFaturaFile(content, fileName){
  currentImportFileName = fileName;
  var items = parseFaturaData(content);
  if(!items.length){
    alert('Nenhum lançamento legível foi encontrado neste arquivo. Verifique se o arquivo é um CSV ou OFX válido.');
    renderImportUploadPrompt();
    return;
  }
  currentImportItems = items;
  renderImportReview();
}
```
- `index.html` lines 846–860: `MNS_ANCHOR_YEAR = 2026`, `MNS_ANCHOR_MONTH = 9` (where index 0 = Set/2026, 1 = Out/2026, etc.).

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `& "$env:TEMP\node.exe" --test tests/fatura-import.test.js` | exit 0, all pass |
| Full suite | `& "$env:TEMP\node.exe" --test (Get-ChildItem -Recurse -Filter *.test.js tests \| Select-Object -ExpandProperty FullName)` | exit 0, all pass |

## Scope

**In scope**:
- `index.html`: Implement `inferTargetMonthFromItems(items)` and call it in `processFaturaFile`.
- `tests/fatura-import.test.js`: Add unit tests for target month inference with various date formats and cycles.

**Out of scope**:
- Changing existing CSV or OFX regex parsing logic in `parseFaturaData`.
- Modifying item reconciliation duplicate detection.

## Steps

### Step 1: Implement `inferTargetMonthFromItems(items)` in `index.html`

In `index.html`, add helper `inferTargetMonthFromItems(items)`:
1. Iterate through `items`, parsing dates (`YYYY-MM-DD` or `DD/MM/YYYY`).
2. For each transaction with a valid day, month, and year:
   - In Brazilian credit cards (Nubank, etc.), transactions with day >= 10 typically close into the next calendar month's payment (e.g. Sept 15 -> Oct payment; Oct 15 -> Nov payment). If day < 10, it belongs to the current calendar month's payment.
   - Alternatively, compute the candidate invoice index `candidateIdx = (year - MNS_ANCHOR_YEAR) * 12 + (month - MNS_ANCHOR_MONTH) + (day >= 10 ? 1 : 0)`.
   - Track votes/counts for each `candidateIdx`.
3. Pick the candidate index with the highest count.
4. If the inferred index is valid (>= 0 and <= `getMaxActiveMonth() + 6`), return it. Otherwise, return `getFirstOpenMonth()`.

Call `inferTargetMonthFromItems` in `processFaturaFile`:
```javascript
  currentImportItems = items;
  var inferred = inferTargetMonthFromItems(items);
  if(inferred != null){
    currentImportTargetMonth = inferred;
  }
  renderImportReview();
```

### Step 2: Add test cases to `tests/fatura-import.test.js`

Add tests verifying:
1. Statement with transactions between Sept 10 and Oct 09 correctly infers month 1 (`Out/2026`).
2. Statement with transactions in Nov (`2026-11-15`) correctly infers month 3 (`Dez/2026`).
3. Statement with no dates or unparseable dates safely falls back to `getFirstOpenMonth()`.

**Verify**:
`& "$env:TEMP\node.exe" --test tests/fatura-import.test.js` → exit 0, all pass.

## Done criteria

- [x] `inferTargetMonthFromItems` selects the correct invoice index based on majority transaction dates.
- [x] Review modal preselects the inferred month automatically upon file drop/upload.
- [x] User can still change the month dropdown manually if desired.
- [x] All tests in `tests/fatura-import.test.js` pass.
- [x] `plans/README.md` status row updated.

## STOP conditions

- If `MNS_ANCHOR_YEAR` or `MNS_ANCHOR_MONTH` definitions are moved or altered, STOP and report.
