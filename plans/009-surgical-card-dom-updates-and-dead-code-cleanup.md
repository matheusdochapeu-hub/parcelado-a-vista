# Plan 009: Surgical DOM Card Updates for Collapse and Dead Code Elimination

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec8b2a..HEAD -- index.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S (45m)
- **Risk**: LOW
- **Depends on**: none
- **Category**: perf
- **Planned at**: commit `2ec8b2a`, 2026-11-01

## Why this matters

In `index.html`, clicking the collapse arrow on any month card calls `toggleMonthCollapse(mIdx)`. Currently, `toggleMonthCollapse` calls `renderFaturas()`, which destroys and completely recreates the entire DOM list of 15–48 month cards via string concatenation and `.innerHTML = html`. On mobile devices, this causes visible screen flickering, loss of scroll momentum, and dropped touch focus.

Additionally, `delExtra(idx)` at line 2184 is uncalled legacy code (superseded by `deleteOrSplitExtraItem`), lingering as dead weight in the script. Eliminating this dead code and updating month collapse in-place via class toggling significantly improves responsiveness and code health.

## Current state

- `index.html` lines 1577–1582:
```javascript
function toggleMonthCollapse(mIdx){
  collapsedMonths[mIdx] = !collapsedMonths[mIdx];
  saveLocal();
  pushToSheets();
  renderFaturas();
}
```
- `index.html` lines 1668–1691: Month header arrow and collapsible body lack unique ID hooks (`id="marrow-" + mi`, `id="mbody-" + mi`).
- `index.html` lines 2184–2187:
```javascript
function delExtra(idx){
  extraItems.splice(idx,1);
  saveLocal();pushToSheets();renderFaturas();
}
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `& "$env:TEMP\node.exe" --test (Get-ChildItem -Recurse -Filter *.test.js tests \| Select-Object -ExpandProperty FullName)` | exit 0, all pass |

## Scope

**In scope**:
- `index.html`:
  - Delete unused `delExtra` function.
  - Add ID hooks to the month arrow and collapsible body in `renderFaturas()`.
  - Update `toggleMonthCollapse` to toggle CSS classes on the targeted elements directly, falling back to `renderFaturas()` if the elements are not present in the DOM.

**Out of scope**:
- Changing the card layout or visual styling.
- Changing `setInvoiceStatus` reordering logic.

## Steps

### Step 1: Remove dead function `delExtra`

In `index.html`, remove lines 2184–2187:
```javascript
function delExtra(idx){
  extraItems.splice(idx,1);
  saveLocal();pushToSheets();renderFaturas();
}
```

### Step 2: Add DOM element IDs in `renderFaturas`

In `renderFaturas` (around lines 1668–1690), add identifiable IDs:
- To the arrow button: `id="marrow-' + mi + '"`
- To the collapsible body: `id="mbody-' + mi + '"`

Pattern:
```javascript
'<button id="marrow-'+mi+'" class="btn-arrow'+(isCollapsed?' collapsed':'')+'" onclick="toggleMonthCollapse('+mi+')" title="'+(isCollapsed?'Mostrar lançamentos':'Recolher lançamentos')+'">'
```
and
```javascript
'<div id="mbody-'+mi+'" class="mbody-collapsible'+(isCollapsed?' collapsed':'')+'" style="font-size:12px">'
```

### Step 3: Implement surgical toggle in `toggleMonthCollapse`

Update `toggleMonthCollapse(mIdx)`:
```javascript
function toggleMonthCollapse(mIdx){
  collapsedMonths[mIdx] = !collapsedMonths[mIdx];
  saveLocal();
  pushToSheets();
  var arrow = document.getElementById('marrow-' + mIdx);
  var body = document.getElementById('mbody-' + mIdx);
  if(arrow && body){
    var isCol = !!collapsedMonths[mIdx];
    if(isCol){
      arrow.classList.add('collapsed');
      arrow.title = 'Mostrar lançamentos';
      body.classList.add('collapsed');
    } else {
      arrow.classList.remove('collapsed');
      arrow.title = 'Recolher lançamentos';
      body.classList.remove('collapsed');
    }
  } else {
    renderFaturas();
  }
}
```

## Done criteria

- [x] `delExtra` is removed and no references to it remain.
- [x] Clicking the collapse arrow toggles classes in-place without triggering full `renderFaturas()`.
- [x] If DOM elements are absent, fallback to `renderFaturas()` safely executes.
- [x] Full test suite passes without regressions.
- [x] `plans/README.md` status row updated.

## STOP conditions

- If any other caller of `delExtra` is found in the repository, STOP and report.
