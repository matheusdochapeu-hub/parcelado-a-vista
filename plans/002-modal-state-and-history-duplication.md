# Plan 002: Fix Modal Save Button State and Prevent History Duplication on Reopen

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9187a6d..HEAD -- index.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (1h)
- **Risk**: LOW
- **Depends on**: plans/001-verification-baseline.md
- **Category**: bug
- **Planned at**: commit `9187a6d`, 2026-10-30

## Why this matters

Two state-corruption bugs impair user interactions:
1. **Broken Modal Save Button**: When the user opens "Adicionar às faturas" from the calculator, the modal save button is reprogrammed with `confirmSimAdd()`. If the user cancels or closes the modal, the button handler is never restored. Subsequent clicks on "Novo item" or "Editar fatura" fail to save because they trigger `confirmSimAdd()` instead of `saveModal()`.
2. **History Item Duplication**: Clicking any saved simulation in the Histórico tab to view or edit it triggers `calculate()`, which unconditionally adds a duplicate entry to `purchHist` and pushes it to Google Sheets. Reopening an item repeatedly clutters and corrupts the user's historical log.

## Current state

In `index.html`:
- Lines 1228–1236 (`closeModal`): Does not reset `modalSaveBtn`.
- Lines 1736–1738 (`addToFaturas`): Sets `modalSaveBtn` to `confirmSimAdd()`.
- Lines 1361–1382 (`openHistToEdit`): Calls `calculate()` which unconditionally adds to `purchHist`.

## Scope

**In scope**:
- `index.html` (functions `closeModal`, `openEditMonthModal`, `openAddModal`, `openHistToEdit`, `calculate`)
- `tests/modal-and-history.test.js` (create)

## Steps

### Step 1: Write characterization tests in `tests/modal-and-history.test.js`

Create `tests/modal-and-history.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('modal: closeModal restaura o botão de salvar padrão', () => {
  const ctx = loadAppContext();
  const btn = ctx.document.getElementById('modalSaveBtn');

  btn.onclick = 'confirmSimAdd()';
  btn.textContent = '📅 Confirmar e Adicionar';

  ctx.closeModal();

  assert.equal(btn.textContent, '💾 Salvar');
  assert.match(String(btn.onclick || btn.getAttribute('onclick')), /saveModal/);
});

test('history: openHistToEdit não adiciona nova entrada no histórico', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Geladeira', cashPrice: 3000, winner: 'vista', winN: 1, savings: 200, miles: 500, date: '01/10/2026' }
  ];

  const initialCount = ctx.purchHist.length;
  ctx.openHistToEdit(0);

  assert.equal(ctx.purchHist.length, initialCount, 'Histórico não deve crescer ao reabrir uma simulação');
});
```

### Step 2: Implement modal save button reset in `index.html`

In `index.html`:

1. Define `resetModalSaveBtn`:
   ```javascript
   function resetModalSaveBtn(){
     var btn = document.getElementById('modalSaveBtn');
     if(btn){
       btn.setAttribute('onclick', 'saveModal()');
       btn.textContent = '💾 Salvar';
     }
   }
   ```
2. Call `resetModalSaveBtn()` inside `closeModal(fromPopstate)`, `openEditMonthModal()`, and `openAddModal()`.

### Step 3: Add `skipHist` flag to `calculate()` and `openHistToEdit()`

In `index.html`:

1. Update `calculate(skipHist)` signature:
   ```javascript
   function calculate(skipHist){
     // ...
     renderResults(lastCalc);
     if(!skipHist){
       addHist({ ... });
     }
   }
   ```
2. In `openHistToEdit(idx)`:
   Change `calculate()` to `calculate(true)`.

## Done criteria

- [ ] `node --test tests/modal-and-history.test.js` passes.
- [ ] Opening "Adicionar às faturas" and closing it leaves the modal button configured as `saveModal()`.
- [ ] Clicking any item in `Histórico` loads it into the calculator without incrementing `purchHist.length`.
