# Plan 001: Establish Node.js Native Test Verification Baseline

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9187a6d..HEAD -- package.json tests/ index.html`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: S (1–2h)
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests
- **Planned at**: commit `9187a6d`, 2026-10-30

## Why this matters

The repository currently contains zero automated tests. All financial math—Net Present Value (`npv`), Selic/CDI discount rates (`getRate`), miles valuations (`miles`, `milesVal`), installment allocation (`npv`, `calculate`), and Brazilian currency parsing (`parseNum`)—is tested solely by manual browser manipulation.

Establishing an automated verification baseline using Node.js's built-in test runner (`node --test`) provides an instant, zero-dependency safety net. This ensures subsequent bug fixes and architectural improvements (such as calendar dynamic generation and modal state management) cannot silently introduce financial calculation regressions.

## Current state

- Root has no `package.json` for npm script definitions.
- `index.html` (lines 813–3496) contains all application code in a single `<script>` block.
- Financial functions are defined as global functions in `index.html`:
  - `parseNum` at lines 975–981
  - `getRate` at lines 2111–2116
  - `npv` at lines 2118–2121
  - `miles` at line 2123
  - `milesVal` at line 2124

## Commands you will need

| Purpose | Command | Expected on success |
|---|---|---|
| Run tests | `node --test tests/**/*.test.js` | exit 0, tests pass |

## Scope

**In scope**:
- `package.json` (create)
- `tests/math.test.js` (create)
- `tests/helpers/load-app-context.js` (create helper to execute `index.html`'s `<script>` block in Node VM)

**Out of scope**:
- Changing existing calculation logic or formula behavior.
- Introducing third-party dependencies (Jest, Vitest, Mocha, Babel).
- Modifying UI markup or CSS in `index.html`.

## Steps

### Step 1: Create `package.json` with test scripts

Create `package.json` in the project root:

```json
{
  "name": "parcelado-a-vista",
  "version": "1.2.0",
  "private": true,
  "description": "Aplicativo PWA de inteligência financeira e controle de faturas.",
  "scripts": {
    "test": "node --test tests/**/*.test.js"
  },
  "engines": {
    "node": ">=20.0.0"
  },
  "license": "MIT"
}
```

### Step 2: Implement context loader helper `tests/helpers/load-app-context.js`

Create `tests/helpers/load-app-context.js`:

```javascript
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadAppContext(customState = {}) {
  const htmlPath = path.resolve(__dirname, '../../index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('Não foi possível encontrar a tag <script> em index.html');
  }

  const storage = {};
  const mockLocalStorage = {
    getItem: (k) => (k in storage ? storage[k] : null),
    setItem: (k, v) => { storage[k] = String(v); },
    removeItem: (k) => { delete storage[k]; },
    clear: () => { Object.keys(storage).forEach((k) => delete storage[k]); }
  };

  const mockElement = {
    value: '',
    textContent: '',
    innerHTML: '',
    style: {},
    classList: { add: () => {}, remove: () => {}, contains: () => false },
    addEventListener: () => {},
    setAttribute: () => {},
    getAttribute: () => null,
    appendChild: () => {},
    removeChild: () => {},
    querySelector: () => null,
    querySelectorAll: () => []
  };

  const sandbox = {
    window: {},
    document: {
      getElementById: (id) => ({ ...mockElement, id }),
      querySelector: () => mockElement,
      querySelectorAll: () => [],
      createElement: () => ({ ...mockElement }),
      head: { appendChild: () => {} },
      body: { appendChild: () => {}, removeChild: () => {} },
      location: { hash: '' }
    },
    localStorage: mockLocalStorage,
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    parseFloat,
    parseInt,
    isNaN,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    JSON,
    ...customState
  };

  sandbox.window = sandbox;
  vm.createContext(sandbox);

  const scriptContent = scriptMatch[1];
  vm.runInContext(scriptContent, sandbox);

  return sandbox;
}

module.exports = { loadAppContext };
```

### Step 3: Implement unit test suite `tests/math.test.js`

Create `tests/math.test.js`:

```javascript
const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('parseNum: sanitização e conversão de valores PT-BR', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.parseNum('1200,50'), 1200.50);
  assert.equal(ctx.parseNum('500.25'), 500.25);
  assert.equal(ctx.parseNum(100), 100);
  assert.equal(ctx.parseNum(null), 0);
  assert.equal(ctx.parseNum(''), 0);
  assert.equal(ctx.parseNum('abc'), 0);
});

test('npv: cálculo de valor presente das parcelas', () => {
  const ctx = loadAppContext();
  const base = 1000;
  const total = 1000;
  const n = 10;
  const ar = 0.12;

  const res = ctx.npv(base, total, n, ar);
  assert.ok(res.pv < base, 'O valor presente das parcelas deve ser inferior ao total à vista');
  assert.ok(res.gain > 0, 'O ganho de rendimento da reserva deve ser positivo');
  assert.equal(res.per, 100, 'Parcela de 1000 em 10x deve ser 100');
});

test('miles e milesVal: conversão em dólares e cotação de milhas', () => {
  const ctx = loadAppContext();
  ctx.profile.cambio = 5.00;
  ctx.profile.milhas = 2.0;
  ctx.profile.milhaVal = 0.03;

  const m = ctx.miles(1000);
  assert.equal(m, 400);

  const val = ctx.milesVal(m);
  assert.equal(val, 12);
});

test('overKey: gera chave única consistente para mês e descrição', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.overKey('Netflix', 2), 'Netflix__2');
});
```

## Done criteria

- [ ] `node --test tests/**/*.test.js` executes and exits with code 0.
- [ ] `package.json` contains `"test": "node --test tests/**/*.test.js"`.
- [ ] No changes made to `index.html` calculation formulas or UI code.
