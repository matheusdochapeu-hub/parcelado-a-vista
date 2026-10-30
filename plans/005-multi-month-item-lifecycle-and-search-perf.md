# Plan 005: Multi-Month Item Lifecycle Splitting and Gastos Search Performance

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

- **Priority**: P2
- **Effort**: M (2–3h)
- **Risk**: MED
- **Depends on**: plans/001-verification-baseline.md
- **Category**: correctness
- **Planned at**: commit `9187a6d`, 2026-10-30

## Why this matters

Two usability and data management issues impact daily operation:
1. **Accidental Deletion of Multi-Month Expenses**: When a user creates a recurring manual expense (e.g. `Parcela TV 1/10` repeating across months 1 to 10) and subsequently deletes it from an individual month's invoice, [index.html:2051](file:///scratch/parcelado-a-vista/index.html#L2051) and [index.html:2066](file:///scratch/parcelado-a-vista/index.html#L2066) execute `extraItems.splice(ix, 1)`. This wipes out the expense from all 10 months simultaneously, rather than removing it solely from the month being edited.
2. **Gastos Live Search Lag**: In [index.html:650](file:///scratch/parcelado-a-vista/index.html#L650), every keystroke in the search field triggers `setGastosSearch()`. Inside `renderGastosItemsList` ([index.html:3134](file:///scratch/parcelado-a-vista/index.html#L3134-L3139)), the function iterates through every item and rebuilds category dropdown markup from scratch, causing stutter and input delay on mobile devices with dozens of transactions.

## Scope

**In scope**:
- `index.html` (specifically `saveModal`, `setGastosSearch`, and `renderGastosItemsList`)
- `tests/items-lifecycle.test.js` (create)

## Steps

### Step 1: Write tests in `tests/items-lifecycle.test.js`

Create `tests/items-lifecycle.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('lifecycle: exclusão em um mês ajusta o intervalo ou divide o item recorrente', () => {
  const ctx = loadAppContext();
  
  ctx.extraItems = [
    { desc: 'Internet', val: 100, de: 1, ate: 4, tag: 'extra', isExtra: true }
  ];

  ctx.deleteOrSplitExtraItem(0, 1);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 2);
  assert.equal(ctx.extraItems[0].ate, 4);

  ctx.deleteOrSplitExtraItem(0, 4);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 2);
  assert.equal(ctx.extraItems[0].ate, 3);

  ctx.deleteOrSplitExtraItem(0, 2);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 3);
  assert.equal(ctx.extraItems[0].ate, 3);

  ctx.deleteOrSplitExtraItem(0, 3);
  assert.equal(ctx.extraItems.length, 0);
});

test('lifecycle: exclusão no meio do intervalo divide em dois itens', () => {
  const ctx = loadAppContext();
  ctx.extraItems = [
    { desc: 'Assinatura', val: 50, de: 1, ate: 5, tag: 'extra', isExtra: true }
  ];

  ctx.deleteOrSplitExtraItem(0, 3);
  assert.equal(ctx.extraItems.length, 2);
  assert.equal(ctx.extraItems[0].de, 1);
  assert.equal(ctx.extraItems[0].ate, 2);
  assert.equal(ctx.extraItems[1].de, 4);
  assert.equal(ctx.extraItems[1].ate, 5);
});
```

### Step 2: Implement `deleteOrSplitExtraItem` and update `saveModal()`

In `index.html`:

```javascript
function deleteOrSplitExtraItem(extraIdx, mIdx){
  var item = extraItems[extraIdx];
  if(!item) return;

  if(item.de === item.ate && item.de === mIdx){
    extraItems.splice(extraIdx, 1);
    return;
  }

  if(mIdx === item.de){
    item.de = mIdx + 1;
  } else if(mIdx === item.ate){
    item.ate = mIdx - 1;
  } else if(item.de < mIdx && mIdx < item.ate){
    var splitPart = {
      desc: item.desc,
      val: item.val,
      de: mIdx + 1,
      ate: item.ate,
      tag: item.tag,
      isExtra: true
    };
    item.ate = mIdx - 1;
    extraItems.splice(extraIdx + 1, 0, splitPart);
  }
}
```

In `saveModal()`, invoke `deleteOrSplitExtraItem(parseInt(extraIdx), mIdx)` when removing an extra item.

### Step 3: Debounce Gastos search in `index.html`

Wrap `setGastosSearch` with a 150ms timeout debounce.

## Done criteria

- [ ] `node --test tests/items-lifecycle.test.js` passes.
- [ ] Deleting an extra item in a single month preserves other months.
- [ ] Rapid typing in Gastos search triggers at most one DOM update per 150ms.
