const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const SOURCE = fs.readFileSync(path.resolve(__dirname, '../apps_script.gs'), 'utf8');

/**
 * Sobe o apps_script.gs em um sandbox com mocks dos serviços do Apps Script.
 * Os mocks são fiéis no que importa para os testes: a planilha entrega todas as
 * linhas de uma vez e registra quantas chamadas de escrita recebeu (é assim que
 * provamos que a v2 grava em lote, com um único setValues).
 */
function createBackend(options = {}) {
  const sheets = new Map();

  function makeSheet(name, rows) {
    const state = {
      name,
      rows: rows.map((row) => row.slice()),
      writeCalls: 0,
      appendCalls: 0
    };

    const sheet = {
      getDataRange() {
        return { getValues: () => state.rows.map((row) => row.slice()) };
      },
      getRange(row, col, numRows, numCols) {
        return {
          setValues(values) {
            state.writeCalls += 1;
            for (let i = 0; i < values.length; i += 1) {
              const target = row - 1 + i;
              if (!state.rows[target]) state.rows[target] = [];
              for (let j = 0; j < values[i].length; j += 1) {
                state.rows[target][col - 1 + j] = values[i][j];
              }
            }
          },
          setFontWeight() { return this; }
        };
      },
      appendRow(values) {
        state.appendCalls += 1;
        state.rows.push(values.slice());
      },
      getLastRow() { return state.rows.length; },
      deleteRows(start, count) { state.rows.splice(start - 1, count); },
      setFrozenRows() {},
      _state: state
    };

    return sheet;
  }

  if (options.seed) {
    for (const [name, rows] of Object.entries(options.seed)) {
      sheets.set(name, makeSheet(name, rows));
    }
  }

  const spreadsheet = {
    getSheetByName: (name) => sheets.get(name) || null,
    insertSheet: (name) => {
      const sheet = makeSheet(name, []);
      sheets.set(name, sheet);
      return sheet;
    }
  };

  const cacheStore = new Map();
  const cacheService = {
    getScriptCache: () => ({
      get: (key) => (cacheStore.has(key) ? cacheStore.get(key) : null),
      put: (key, value) => { cacheStore.set(key, String(value)); },
      remove: (key) => { cacheStore.delete(key); }
    })
  };

  const properties = new Map(Object.entries(options.properties || {}));
  const scriptProperties = {
    getProperty: (key) => (properties.has(key) ? properties.get(key) : null),
    setProperty: (key, value) => { properties.set(key, String(value)); }
  };

  const ui = {
    alert: () => {},
    createMenu: () => {
      const menu = {
        addItem: () => menu,
        addToUi: () => menu
      };
      return menu;
    },
    ButtonSet: { OK: 'OK' }
  };

  let lastOutput = null;
  const contentService = {
    MimeType: { JSON: 'application/json', JAVASCRIPT: 'application/javascript' },
    createTextOutput(text) {
      lastOutput = {
        text: String(text),
        mimeType: '',
        setMimeType(mime) { this.mimeType = mime; return this; },
        getContent() { return this.text; }
      };
      return lastOutput;
    }
  };

  const sandbox = {
    SpreadsheetApp: {
      getActiveSpreadsheet: () => spreadsheet,
      getUi: () => ui
    },
    PropertiesService: { getScriptProperties: () => scriptProperties },
    CacheService: cacheService,
    LockService: {
      getScriptLock: () => ({
        waitLock: () => true,
        releaseLock: () => {}
      })
    },
    ContentService: contentService,
    Utilities: { formatDate: (date) => new Date(date).toISOString() },
    console,
    Date,
    Math,
    JSON,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    isNaN,
    parseFloat,
    parseInt
  };

  vm.createContext(sandbox);
  vm.runInContext(SOURCE, sandbox, { filename: 'apps_script.gs' });

  function call(fnName, event) {
    lastOutput = null;
    sandbox[fnName](event);
    assert.ok(lastOutput, `${fnName} deveria devolver um ContentService`);
    return lastOutput;
  }

  function callJson(fnName, event) {
    const output = call(fnName, event);
    return JSON.parse(output.text);
  }

  return { ctx: sandbox, sheets, properties, cacheStore, call, callJson };
}

function headerRow() {
  return ['chave', 'valor_json', 'atualizado_em', 'registros'];
}

function seedBackup() {
  return {
    Backup: [
      headerRow(),
      ['extraItems', JSON.stringify([{ desc: 'Café', val: 10, de: 1, ate: 2 }]), '2026-11-10T12:00:00.000Z', 1],
      ['overrides', JSON.stringify({ 'Café__1': 12 }), '2026-11-10T12:00:00.000Z', 1],
      ['_meta', JSON.stringify({ revision: 7, savedAt: '2026-11-10T12:00:00.000Z', api: '2.0' }), '2026-11-10T12:00:00.000Z', 2]
    ]
  };
}

test('api: GET restore devolve todas as chaves, metadados e ignora a linha _meta', () => {
  const backend = createBackend({ seed: seedBackup() });
  const body = backend.callJson('doGet', { parameter: { action: 'restore' } });

  assert.equal(body.ok, true);
  assert.equal(body.api, backend.ctx.API_VERSION);
  assert.equal(body.meta.revision, 7);
  assert.equal(body.meta.savedAt, '2026-11-10T12:00:00.000Z');
  assert.equal(body.extraItems.length, 1);
  assert.equal(body.overrides['Café__1'], 12);
  assert.equal(body._meta, undefined, '_meta não deve vazar como chave pública');
  assert.equal(body.partial, false);
  assert.equal(body.meta.authConfigured, false, 'token padrão conta como não configurado');
});

test('api: escrita em lote usa exatamente um setValues e incrementa a revisão', () => {
  const backend = createBackend({ seed: seedBackup() });
  const sheet = backend.sheets.get('Backup');
  const writesBefore = sheet._state.writeCalls;

  const body = backend.callJson('doPost', {
    postData: {
      contents: JSON.stringify({
        token: '',
        extraItems: [{ desc: 'Novo', val: 25, de: 3, ate: 3 }],
        overrides: { 'Café__1': 15 }
      })
    }
  });

  assert.equal(body.ok, true);
  assert.equal(body.revision, 8);
  assert.deepEqual(body.keys.sort(), ['extraItems', 'overrides']);
  assert.equal(sheet._state.writeCalls - writesBefore, 1, 'as duas chaves devem ser gravadas em um único setValues');

  const metaRow = sheet._state.rows.find((row) => row[0] === '_meta');
  assert.equal(JSON.parse(metaRow[1]).revision, 8);

  const readBack = backend.callJson('doGet', { parameter: { action: 'load' } });
  assert.equal(readBack.meta.revision, 8);
  assert.equal(readBack.extraItems[0].desc, 'Novo');
});

test('api: validação rejeita tipo errado, campo desconhecido e JSON malformado', () => {
  const backend = createBackend({ seed: seedBackup() });

  const wrongType = backend.callJson('doPost', {
    postData: { contents: JSON.stringify({ extraItems: { a: 1 } }) }
  });
  assert.equal(wrongType.ok, false);
  assert.equal(wrongType.code, 'BAD_REQUEST');
  assert.match(wrongType.error, /lista/);

  const unknown = backend.callJson('doPost', {
    postData: { contents: JSON.stringify({ naoExiste: 1 }) }
  });
  assert.equal(unknown.code, 'BAD_REQUEST');
  assert.match(unknown.error, /Nenhum campo conhecido/);

  const malformed = backend.callJson('doPost', { postData: { contents: '{oops' } });
  assert.equal(malformed.code, 'BAD_REQUEST');
  assert.match(malformed.error, /malformado/);

  const empty = backend.callJson('doPost', { postData: { contents: '' } });
  assert.equal(empty.ok, false);
});

test('api: campo acima do limite de célula é recusado antes de gravar', () => {
  const backend = createBackend({ seed: seedBackup() });
  const sheet = backend.sheets.get('Backup');
  const writesBefore = sheet._state.writeCalls;

  const huge = 'x'.repeat(backend.ctx.MAX_CELL_CHARS + 10);
  const body = backend.callJson('doPost', {
    postData: { contents: JSON.stringify({ extraItems: [{ desc: huge, val: 1, de: 1, ate: 1 }] }) }
  });

  assert.equal(body.ok, false);
  assert.equal(body.code, 'PAYLOAD_TOO_LARGE');
  assert.equal(sheet._state.writeCalls, writesBefore, 'nada deve ser gravado quando a validação falha');
});

test('api: token configurado exige autenticação e compara em tempo constante', () => {
  const backend = createBackend({ seed: seedBackup(), properties: { SHEETS_SECRET_TOKEN: 'segredo-forte' } });

  const denied = backend.callJson('doGet', { parameter: { action: 'restore' } });
  assert.equal(denied.ok, false);
  assert.equal(denied.code, 'UNAUTHORIZED');

  const ok = backend.callJson('doGet', { parameter: { action: 'restore', token: 'segredo-forte' } });
  assert.equal(ok.ok, true);
  assert.equal(ok.meta.authConfigured, true);

  const wrong = backend.callJson('doGet', { parameter: { action: 'restore', token: 'segredo-forte ' } });
  assert.equal(wrong.ok, false);

  assert.equal(backend.ctx.safeEqual('abc', 'abc'), true);
  assert.equal(backend.ctx.safeEqual('abc', 'abd'), false);
  assert.equal(backend.ctx.safeEqual('abc', 'ab'), false);
  assert.equal(backend.ctx.safeEqual('', ''), false);
});

test('api: JSONP funciona e callback malicioso é sanitizado', () => {
  const backend = createBackend({ seed: seedBackup() });

  const out = backend.call('doGet', { parameter: { action: 'ping', callback: 'minhaFuncao' } });
  assert.match(out.text, /^minhaFuncao\(/);
  assert.match(out.text, /\);\s*$/);
  assert.equal(out.mimeType, 'application/javascript');

  const malicious = backend.call('doGet', { parameter: { action: 'ping', callback: 'alert(1);//' } });
  assert.ok(!malicious.text.includes('alert('), 'callback não pode conter parênteses');
  assert.match(malicious.text, /^alert1\(/);
});

test('api: GET com since devolve apenas as chaves alteradas depois do instante', () => {
  const backend = createBackend({ seed: seedBackup() });

  const partial = backend.callJson('doGet', {
    parameter: { action: 'restore', since: '2026-11-10T12:00:01.000Z' }
  });
  assert.equal(partial.partial, true);
  assert.deepEqual(partial.changed, [], 'nada mudou depois do since informado');
  assert.equal(partial.extraItems, undefined);

  const full = backend.callJson('doGet', {
    parameter: { action: 'restore', since: '2026-11-10T11:00:00.000Z' }
  });
  assert.equal(full.partial, true);
  assert.deepEqual(full.changed.sort(), ['extraItems', 'overrides']);
  assert.equal(full.extraItems.length, 1);
});

test('api: ações ping e schema respondem o contrato da v2', () => {
  const backend = createBackend({ seed: seedBackup() });

  const ping = backend.callJson('doGet', { parameter: { action: 'ping' } });
  assert.equal(ping.ok, true);
  assert.equal(ping.revision, 7);
  assert.ok(Array.isArray(ping.keys));
  assert.ok(ping.serverTime);

  const schema = backend.callJson('doGet', { parameter: { action: 'schema' } });
  assert.equal(schema.ok, true);
  assert.equal(schema.keys.extraItems, 'array');
  assert.equal(schema.keys.profile, 'object');
  assert.ok(schema.limits.cellChars > 0);

  const unknown = backend.callJson('doGet', { parameter: { action: 'drop_table' } });
  assert.equal(unknown.ok, false);
  assert.equal(unknown.code, 'BAD_REQUEST');
});

test('api: rate limit corta excesso de requisições por minuto', () => {
  const backend = createBackend({ seed: seedBackup() });
  backend.ctx.RATE_LIMIT_PER_MIN = 2;

  const first = backend.callJson('doGet', { parameter: { action: 'ping' } });
  const second = backend.callJson('doGet', { parameter: { action: 'ping' } });
  const third = backend.callJson('doGet', { parameter: { action: 'ping' } });

  assert.equal(first.ok, true);
  assert.equal(second.ok, true);
  assert.equal(third.ok, false);
  assert.equal(third.code, 'RATE_LIMITED');
});

test('api: stripProto remove chaves perigosas mantendo o resto', () => {
  const backend = createBackend({ seed: seedBackup() });
  const parsed = JSON.parse('{"ok":1,"__proto__":{"poluido":true},"lista":[{"constructor":{"x":1},"y":2}]}');
  const clean = backend.ctx.stripProto(parsed, 0);

  assert.equal(Object.prototype.hasOwnProperty.call(clean, '__proto__'), false);
  assert.equal(clean.ok, 1);
  assert.equal(clean.lista[0].y, 2);
  assert.equal(Object.prototype.hasOwnProperty.call(clean.lista[0], 'constructor'), false);
});

test('api: log de escrita é gravado e limitado, sem derrubar a API', () => {
  const backend = createBackend({ seed: seedBackup() });

  backend.callJson('doPost', {
    postData: { contents: JSON.stringify({ extraItems: [] }) }
  });

  const log = backend.sheets.get('Log');
  assert.ok(log, 'aba Log deve ser criada');
  assert.equal(log._state.rows[0][0], 'quando');
  assert.equal(log._state.rows.length, 2, 'cabeçalho + uma escrita');
  assert.equal(log._state.rows[1][1], 'backup');
  assert.match(log._state.rows[1][2], /extraItems/);
});

test('api: cache do snapshot é invalidado depois de escrever', () => {
  const backend = createBackend({ seed: seedBackup() });

  const first = backend.callJson('doGet', { parameter: { action: 'restore' } });
  assert.equal(first.extraItems.length, 1);

  backend.callJson('doPost', {
    postData: { contents: JSON.stringify({ extraItems: [{ desc: 'A', val: 1 }, { desc: 'B', val: 2 }] }) }
  });

  assert.equal(backend.cacheStore.has('snapshot'), false, 'escrita deve limpar o cache');
  const second = backend.callJson('doGet', { parameter: { action: 'restore' } });
  assert.equal(second.extraItems.length, 2);
});
