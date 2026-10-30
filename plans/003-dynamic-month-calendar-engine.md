# Plan 003: Dynamic Month Calendar Engine to Support Long Installments

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
- **Effort**: M (3–4h)
- **Risk**: MED
- **Depends on**: plans/001-verification-baseline.md
- **Category**: correctness
- **Planned at**: commit `9187a6d`, 2026-10-30

## Why this matters

The application's invoice calendar currently relies on a fixed 15-element array `MNS` ([index.html:820](file:///scratch/parcelado-a-vista/index.html#L820)), ending in index 14 (`Nov/2027+`). When a user simulates purchases in 18x or 24x (options available in the calculator's `pMaxN` dropdown), [index.html:1698](file:///scratch/parcelado-a-vista/index.html#L1698) clamps all installments beyond month 14 to `mIdx = maxM = 14`.

Consequently, up to 10 future monthly installments are lumped simultaneously into a single invoice slot (`Nov/2027+`). This causes massive artificial budget overruns and completely distorts future cash-flow projections and annual spend charts.

Replacing the static array with a dynamic calculation of month names and unbounded active ranges allows installment plans to project smoothly up to 24, 36, or 48 months as needed.

## Current state

- `MNS` is an array of 15 hardcoded strings from Set/2026 to Nov/2027+.
- `addSimulation` clamps `mIdx` to `MNS.length - 1`.
- `getMaxActiveMonth` is capped at `MNS.length - 1`.

## Scope

**In scope**:
- `index.html` (functions `getMonthName`, `refreshMnsCache`, `getMaxActiveMonth`, `addSimulation`, `recalcSimParc`, `updateMonthSelects`, `renderFaturas`, `getGastosAnalysisData`)
- `tests/calendar.test.js` (create)

## Steps

### Step 1: Write test suite for dynamic calendar in `tests/calendar.test.js`

Create `tests/calendar.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('calendar: getMonthName formata corretamente meses dentro e além do ano âncora', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.getMonthName(0), 'Set/2026');
  assert.equal(ctx.getMonthName(1), 'Out/2026');
  assert.equal(ctx.getMonthName(3), 'Dez/2026');
  assert.equal(ctx.getMonthName(4), 'Jan/2027');
  assert.equal(ctx.getMonthName(15), 'Dez/2027');
  assert.equal(ctx.getMonthName(16), 'Jan/2028');
  assert.equal(ctx.getMonthName(28), 'Jan/2029');
});

test('calendar: addSimulation distribui parcelas de 24x em 24 meses distintos', () => {
  const ctx = loadAppContext();
  ctx.simItems = [];
  ctx.addSimulation('TV 8K', 200, 1, 24);

  assert.equal(ctx.simItems.length, 24);
  const monthIndices = ctx.simItems.map(item => item.de);
  const uniqueMonths = new Set(monthIndices);

  assert.equal(uniqueMonths.size, 24, 'Cada parcela deve ocupar um mês diferente de 1 a 24');
  assert.equal(ctx.simItems[23].de, 24, 'A 24ª parcela deve estar no índice 24');
  assert.equal(ctx.getMonthName(ctx.simItems[23].de), 'Set/2028');
});

test('calendar: getMaxActiveMonth expande além do padrão quando há parcelas longas', () => {
  const ctx = loadAppContext();
  ctx.simItems = [];
  ctx.addSimulation('Curso', 100, 1, 24);

  const maxMonth = ctx.getMaxActiveMonth();
  assert.ok(maxMonth >= 24, 'getMaxActiveMonth deve ser pelo menos 24');
});
```

### Step 2: Implement `getMonthName(mIdx)` and dynamic `MNS` in `index.html`

In `index.html`:

1. Define `MONTH_NAMES_PT` and `getMonthName`:
   ```javascript
   var MONTH_NAMES_PT=['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
   var MNS_ANCHOR_YEAR=2026, MNS_ANCHOR_MONTH=9;

   function getMonthName(mIdx){
     if(mIdx == null || isNaN(mIdx)) return '';
     var totalMonths = (MNS_ANCHOR_MONTH - 1) + mIdx;
     var year = MNS_ANCHOR_YEAR + Math.floor(totalMonths / 12);
     var monthIdx = totalMonths % 12;
     if(monthIdx < 0){
       monthIdx += 12;
       year -= 1;
     }
     return MONTH_NAMES_PT[monthIdx] + '/' + year;
   }

   var MNS = [];
   function refreshMnsCache(maxCount){
     var count = Math.max(48, (maxCount || 0) + 12);
     MNS.length = 0;
     for(var m=0; m<=count; m++){
       MNS.push(getMonthName(m));
     }
   }
   refreshMnsCache(48);
   ```

2. In `getMaxActiveMonth()`:
   ```javascript
   function getMaxActiveMonth(){
     var curM = getCurrentMonthIndex();
     var maxM = Math.max(curM + MONTHS_DEFAULT, MONTHS_DEFAULT);
     for(var i=0; i<BASE_ITEMS.length; i++){ if(BASE_ITEMS[i].ate > maxM) maxM = BASE_ITEMS[i].ate; }
     for(var i=0; i<extraItems.length; i++){ if(extraItems[i].ate > maxM) maxM = extraItems[i].ate; }
     for(var i=0; i<simItems.length; i++){ if(simItems[i].ate > maxM) maxM = simItems[i].ate; }
     refreshMnsCache(maxM);
     return maxM;
   }
   ```

3. In `addSimulation`, remove `if(mIdx>maxM) mIdx=maxM`. Let `mIdx = startMonth + i` project naturally.

## Done criteria

- [ ] `node --test tests/calendar.test.js` passes.
- [ ] 24-installment simulation projects over 24 individual calendar months.
- [ ] Future months display correctly as `Jan/2028`, `Fev/2028`, etc.
