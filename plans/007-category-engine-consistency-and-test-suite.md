# Plan 007: Enforce Category Rule Consistency on Global Reclassification and Add Rule Test Suite

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 2ec8b2a..HEAD -- index.html tests/categories.test.js`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (1h)
- **Risk**: LOW
- **Depends on**: none
- **Category**: bug
- **Planned at**: commit `2ec8b2a`, 2026-11-01

## Why this matters

When reclassifying a purchase category in the "Gastos" tab or invoice details modal, users can check "Aplicar a todas as faturas" (`applyToAll`). Currently, `reclassifyItem(desc, mIdx, newCatId, applyToAll)` at `index.html:3407-3420` sets the global map entry `itemCatMap[sDesc] = newCatId`, but only deletes the key for the current month (`delete itemCatMap[mIdx + '::' + sDesc]`).

If the user had previously adjusted that item in other specific months (e.g. `1::Supermercado`, `2::Supermercado`), those other month-specific overrides remain active. Because `getItemCategory` prioritizes month-specific overrides above global mappings, the item will continue showing the old category in those months, violating the user's intent.

Furthermore, there is currently zero automated test coverage for the categorization engine and rule precedence.

## Current state

- `index.html` lines 3407–3420:
```javascript
function reclassifyItem(desc, mIdx, newCatId, applyToAll){
  if(!desc || !newCatId) return;
  var sDesc = String(desc).trim();
  if(applyToAll){
    itemCatMap[sDesc] = newCatId;
    delete itemCatMap[mIdx + '::' + sDesc];
  } else {
    itemCatMap[mIdx + '::' + sDesc] = newCatId;
  }
  saveLocal();
  pushToSheets();
  renderGastosView();
  showToast('✓ Categoria atualizada: ' + getCategoryById(newCatId).name);
}
```
- `index.html` lines 3378–3405 (`getItemCategory`):
```javascript
function getItemCategory(desc, mIdx){
  if(!desc) return getCategoryById('outros');
  var sDesc = String(desc).trim();
  // 1. Sobrescrita específica do mês
  if(mIdx != null && itemCatMap[mIdx + '::' + sDesc]){
    return getCategoryById(itemCatMap[mIdx + '::' + sDesc]);
  }
  // 2. Sobrescrita global pelo nome do item
  if(itemCatMap[sDesc]){
    return getCategoryById(itemCatMap[sDesc]);
  }
  // 3. Regras customizadas do usuário
  var low = sDesc.toLowerCase();
  for(var i=0; i<userCatRules.length; i++){
    var r = userCatRules[i];
    if(r.match && low.indexOf(r.match.toLowerCase().trim()) !== -1){
      return getCategoryById(r.cat);
    }
  }
  // 4. Regras padrão automáticas
  for(var i=0; i<DEFAULT_CAT_RULES.length; i++){
    var dr = DEFAULT_CAT_RULES[i];
    if(dr.match && low.indexOf(dr.match) !== -1){
      return getCategoryById(dr.cat);
    }
  }
  return getCategoryById('outros');
}
```

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Tests | `& "$env:TEMP\node.exe" --test tests/categories.test.js` | exit 0, all pass |
| Full suite | `& "$env:TEMP\node.exe" --test (Get-ChildItem -Recurse -Filter *.test.js tests \| Select-Object -ExpandProperty FullName)` | exit 0, all pass |

## Scope

**In scope**:
- `index.html`: Clean all month-specific keys for the target description in `reclassifyItem` when `applyToAll` is true.
- `tests/categories.test.js` (create): Comprehensive unit tests for `getItemCategory`, `reclassifyItem`, and rule precedence.

**Out of scope**:
- Changing default category definitions (`DEFAULT_CATEGORIES`, `DEFAULT_CAT_RULES`).
- Modifying UI layouts in the Gastos tab.

## Steps

### Step 1: Update `reclassifyItem` in `index.html`

Replace `reclassifyItem` in `index.html`:
```javascript
function reclassifyItem(desc, mIdx, newCatId, applyToAll){
  if(!desc || !newCatId) return;
  var sDesc = String(desc).trim();
  if(applyToAll){
    itemCatMap[sDesc] = newCatId;
    var suffix = '::' + sDesc;
    for(var k in itemCatMap){
      if(Object.prototype.hasOwnProperty.call(itemCatMap, k)){
        if(k === sDesc) continue;
        if(k.endsWith(suffix) || k === (mIdx + suffix)){
          delete itemCatMap[k];
        }
      }
    }
  } else {
    itemCatMap[mIdx + '::' + sDesc] = newCatId;
  }
  saveLocal();
  pushToSheets();
  renderGastosView();
  showToast('✓ Categoria atualizada: ' + getCategoryById(newCatId).name);
}
```

### Step 2: Create `tests/categories.test.js`

Using `loadAppContext` from `tests/helpers/load-app-context.js`, create `tests/categories.test.js` testing:
1. Default keyword matching (e.g. `'Uber *Trip'` matches `transporte`, `'iFood'` matches `alimentacao`).
2. Fallback to `'outros'` for unknown descriptions.
3. User custom rule priority (`userCatRules`) over default rules.
4. Global item override (`itemCatMap['Loja X'] = 'lazer'`) overriding rules.
5. Month-specific override (`itemCatMap['1::Loja X'] = 'casa'`) taking precedence over global override for month 1, while month 2 uses the global override.
6. `reclassifyItem(..., applyToAll = true)` purging prior month overrides so all months immediately reflect the new global category.

**Verify**:
`& "$env:TEMP\node.exe" --test tests/categories.test.js` → exit 0, all pass.

## Done criteria

- [x] When `applyToAll` is true, all month-specific keys for that item are deleted from `itemCatMap`.
- [x] `tests/categories.test.js` tests all 4 tiers of `getItemCategory` and `reclassifyItem`.
- [x] Full test suite passes without errors.
- [x] `plans/README.md` status row updated.

## STOP conditions

- If `itemCatMap` schema is found to store data with separators other than `::`, STOP and report.
