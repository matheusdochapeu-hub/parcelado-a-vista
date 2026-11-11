// ============================================================
//  FATURAS · API v2 (Google Apps Script + Google Sheets)
//  App: parcelado-a-vista  ·  Contrato de dados: pv4_* / Faturas
// ============================================================
//
//  O que mudou na v2 (compatível com a v1 e com o Matrix)
//  ------------------------------------------------------
//  1. LEITURA EM PASSADA ÚNICA: o snapshot inteiro é lido com um único
//     getDataRange() (a v1 lia a planilha 10x, uma por chave).
//  2. ESCRITA EM LOTE: um único setValues() grava todas as chaves alteradas
//     (a v1 fazia um setValues() por chave e um appendRow por chave nova).
//  3. CACHE: CacheService guarda o snapshot por 30s e é invalidado na escrita.
//  4. REVISÃO: cada gravação incrementa _meta.revision e _meta.savedAt, o que
//     permite ao app comparar "nuvem mais nova" com "alterações locais".
//  5. SYNC INCREMENTAL: GET ?since=<ISO> devolve só as chaves alteradas.
//  6. VALIDAÇÃO: whitelist de chaves, tipo esperado, limite de tamanho por
//     célula (45 KB) e por corpo (900 KB) antes de gravar.
//  7. SEGURANÇA: comparação de token em tempo constante, rate limit de 120
//     req/min por token, sanitização de callback JSONP e log de escritas.
//  8. COMPATIBILIDADE: 'restore'/'load' continuam devolvendo o payload
//     completo (o Matrix chama action=restore), e JSONP segue funcionando.
//
//  COMO IMPLANTAR (obrigatório após atualizar este arquivo)
//  -------------------------------------------------------
//  1. Abra a planilha de backup > Extensões > Apps Script.
//  2. Apague o conteúdo e cole este arquivo inteiro.
//  3. Ajuste SHARED_SECRET (ou defina SHEETS_SECRET_TOKEN nas Propriedades
//     do Script — recomendado, porque o repositório é público).
//  4. Salvar (Ctrl+S).
//  5. Implantar > Gerenciar implantações > ✏️ > Versão: "Nova versão" >
//     Implantar. A URL /exec NÃO muda.
//  6. No app, aba Perfil > "Testar conexão" deve mostrar API 2.x + revisão.
//
//  Para rotacionar o token: Propriedades do Script > adicionar
//  SHEETS_SECRET_TOKEN com um valor novo e colar o mesmo valor no app.
// ============================================================

var API_VERSION = '2.1';
var DEFAULT_SECRET = 'DefinaUmaChaveComplexaAqui123!';
var SHARED_SECRET = DEFAULT_SECRET; // ignorado se SHEETS_SECRET_TOKEN existir
var SHEET_NAME = 'Backup';
var LOG_SHEET = 'Log';
var META_KEY = '_meta';

var MAX_BODY_CHARS = 900000;   // corpo máximo aceito no POST
var MAX_CELL_CHARS = 45000;    // limite prático de uma célula do Sheets
var RATE_LIMIT_PER_MIN = 120;  // requisições por token por minuto
var CACHE_TTL_SECONDS = 30;
var LOG_MAX_ROWS = 500;

// Chaves do contrato e o tipo esperado de cada uma.
var DATA_KEYS = {
  extraItems: 'array',
  simItems: 'array',
  purchHist: 'array',
  userCategories: 'array',
  userCatRules: 'array',
  overrides: 'object',
  monthStatus: 'object',
  collapsedMonths: 'object',
  itemCatMap: 'object',
  profile: 'object'
};

// ============================================================
//  AUTENTICAÇÃO E SEGURANÇA
// ============================================================

function getSecretToken() {
  try {
    var prop = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET_TOKEN');
    if (prop) return prop;
  } catch (err) {}
  return SHARED_SECRET;
}

function isSecretConfigured() {
  var secret = getSecretToken();
  return !!secret && secret !== DEFAULT_SECRET;
}

// Comparação em tempo constante (evita vazar o token por timing).
function safeEqual(a, b) {
  var s1 = String(a == null ? '' : a);
  var s2 = String(b == null ? '' : b);
  var len = Math.max(s1.length, s2.length);
  var diff = s1.length ^ s2.length;
  for (var i = 0; i < len; i++) {
    var c1 = i < s1.length ? s1.charCodeAt(i) : 0;
    var c2 = i < s2.length ? s2.charCodeAt(i) : 0;
    diff |= (c1 ^ c2);
  }
  return diff === 0 && s2.length > 0;
}

function extractToken(e, payload) {
  var token = '';
  if (e && e.parameter && e.parameter.token) token = e.parameter.token;
  if (!token && payload && payload.token) token = payload.token;
  if (!token && e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      if (parsed && parsed.token) token = parsed.token;
    } catch (err) {}
  }
  return String(token || '');
}

function isAuthorized(e, payload) {
  // Sem token configurado a API não fica aberta: o app avisa para configurar.
  if (!isSecretConfigured()) return false;
  return safeEqual(extractToken(e, payload), getSecretToken());
}

function tokenFingerprint(token) {
  var s = String(token || '');
  var hash = 0;
  for (var i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return String(hash);
}

// Janela deslizante de 60s por token. Falha aberta se o cache indisponível.
function checkRateLimit(token) {
  try {
    var cache = CacheService.getScriptCache();
    var minute = Math.floor(Date.now() / 60000);
    var key = 'rl_' + tokenFingerprint(token) + '_' + minute;
    var count = Number(cache.get(key) || 0) + 1;
    cache.put(key, String(count), 120);
    return count <= RATE_LIMIT_PER_MIN;
  } catch (err) {
    return true;
  }
}

// ============================================================
//  PLANILHA
// ============================================================

function openSheet(name, headers) {
  var cols = headers || ['chave', 'valor_json', 'atualizado_em', 'registros'];
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, cols.length).setValues([cols]);
    sh.getRange(1, 1, 1, cols.length).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function getSheet() {
  return openSheet(SHEET_NAME);
}

function safeJsonParse(raw) {
  if (raw === '' || raw === null || raw === undefined) return null;
  try {
    return JSON.parse(String(raw));
  } catch (err) {
    return null;
  }
}

// Converte "dd/MM/yyyy HH:mm:ss" (legado) ou ISO em milissegundos.
function parseSheetDate(value) {
  var raw = String(value || '').trim();
  if (!raw) return 0;
  var iso = Date.parse(raw);
  if (!isNaN(iso)) return iso;
  var m = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?$/);
  if (m) {
    var d = new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]),
                     Number(m[4] || 0), Number(m[5] || 0), Number(m[6] || 0));
    return d.getTime();
  }
  return 0;
}

// Uma única leitura da planilha devolve todas as chaves + metadados.
function readSnapshot(sh) {
  var values = sh.getDataRange().getValues();
  var data = {};
  var keys = {};
  var latestMs = 0;
  var meta = null;

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var key = String(row[0] || '').trim();
    if (!key) continue;
    var updatedAt = row[2] ? String(row[2]) : '';
    var count = Number(row[3] || 0);
    if (key === META_KEY) {
      meta = safeJsonParse(row[1]);
      continue;
    }
    if (key.charAt(0) === '_') continue;
    data[key] = safeJsonParse(row[1]);
    keys[key] = { updatedAt: updatedAt, updatedAtMs: parseSheetDate(updatedAt), count: count };
    var ms = keys[key].updatedAtMs;
    if (ms > latestMs) latestMs = ms;
  }

  var savedAt = (meta && meta.savedAt) ? String(meta.savedAt) : (latestMs ? new Date(latestMs).toISOString() : '');
  return {
    data: data,
    keys: keys,
    meta: {
      revision: (meta && Number(meta.revision)) || 0,
      savedAt: savedAt,
      savedAtMs: parseSheetDate(savedAt)
    }
  };
}

function getRevision() {
  try {
    var stored = PropertiesService.getScriptProperties().getProperty('FATURAS_REV');
    return stored ? Number(stored) || 0 : 0;
  } catch (err) {
    return 0;
  }
}

function setRevision(value) {
  try {
    PropertiesService.getScriptProperties().setProperty('FATURAS_REV', String(value));
  } catch (err) {}
}

function invalidateSnapshotCache() {
  try {
    CacheService.getScriptCache().remove('snapshot');
  } catch (err) {}
}

// Grava todas as chaves alteradas com um único setValues().
function writePatch(sh, patch) {
  var values = sh.getDataRange().getValues();
  if (!values.length) values = [['chave', 'valor_json', 'atualizado_em', 'registros']];

  var rows = [];
  for (var i = 0; i < values.length; i++) {
    rows.push([values[i][0], values[i][1], values[i][2], values[i][3]]);
  }

  var index = {};
  var metaRevision = 0;
  for (var r = 1; r < rows.length; r++) {
    var k = String(rows[r][0] || '').trim();
    if (!k) continue;
    index[k] = r;
    if (k === META_KEY) {
      var previousMeta = safeJsonParse(rows[r][1]);
      if (previousMeta && Number(previousMeta.revision)) metaRevision = Number(previousMeta.revision);
    }
  }

  var now = new Date();
  var iso = now.toISOString();
  var changed = [];
  var counts = {};

  for (var key in patch) {
    if (!patch.hasOwnProperty(key)) continue;
    var value = patch[key];
    var json = JSON.stringify(value === undefined ? null : value);
    if (json.length > MAX_CELL_CHARS) {
      throw apiError('PAYLOAD_TOO_LARGE',
        'O campo "' + key + '" excede ' + Math.round(MAX_CELL_CHARS / 1000) + ' KB. Reduza o histórico antes de sincronizar.');
    }
    var count = Array.isArray(value) ? value.length : Object.keys(value || {}).length;
    var line = [key, json, iso, count];
    if (index[key] !== undefined) rows[index[key]] = line;
    else { rows.push(line); index[key] = rows.length - 1; }
    changed.push(key);
    counts[key] = count;
  }

  var revision = Math.max(getRevision(), metaRevision) + 1;
  var metaLine = [META_KEY, JSON.stringify({ revision: revision, savedAt: iso, api: API_VERSION }), iso, changed.length];

  if (index[META_KEY] !== undefined) rows[index[META_KEY]] = metaLine;
  else { rows.push(metaLine); index[META_KEY] = rows.length - 1; }

  sh.getRange(1, 1, rows.length, 4).setValues(rows);
  setRevision(revision);
  invalidateSnapshotCache();

  return { revision: revision, savedAt: iso, keys: changed, counts: counts };
}

function appendLog(entry) {
  try {
    var headers = ['quando', 'acao', 'chaves', 'bytes', 'revisao'];
    var sh = openSheet(LOG_SHEET, headers);
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
      sh.setFrozenRows(1);
    }
    var line = [
      new Date().toISOString(),
      String(entry.action || ''),
      String(entry.keys || ''),
      Number(entry.bytes || 0),
      Number(entry.revision || 0)
    ];
    sh.appendRow(line);
    var overflow = sh.getLastRow() - LOG_MAX_ROWS;
    if (overflow > 0) sh.deleteRows(2, overflow);
  } catch (err) {
    // log nunca pode derrubar a API
  }
}

// ============================================================
//  RESPOSTAS
// ============================================================

function errorPayload(code, message) {
  return { ok: false, api: API_VERSION, code: code, error: message };
}

function apiError(code, message) {
  var err = new Error(message);
  err.code = code;
  return err;
}

function normalizeCallback(callback) {
  var clean = String(callback || '').replace(/[^a-zA-Z0-9_$.]/g, '');
  if (!clean || !/^[a-zA-Z_$][a-zA-Z0-9_$.]{0,60}$/.test(clean)) return '';
  return clean;
}

function respond(callback, payload) {
  if (callback) {
    return ContentService
      .createTextOutput(callback + '(' + JSON.stringify(payload) + ');')
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function baseMeta(snapshot) {
  return {
    api: API_VERSION,
    revision: snapshot.meta.revision,
    savedAt: snapshot.meta.savedAt,
    serverTime: new Date().toISOString(),
    keys: snapshot.keys,
    authConfigured: isSecretConfigured()
  };
}

function readSnapshotWithCache(sh, useCache) {
  if (useCache) {
    try {
      var cached = CacheService.getScriptCache().get('snapshot');
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.data) return parsed;
      }
    } catch (err) {}
  }
  var snapshot = readSnapshot(sh);
  try {
    var serialized = JSON.stringify(snapshot);
    // CacheService limita o valor a 100 KB: só cacheia snapshots pequenos.
    if (serialized.length < 90000) {
      CacheService.getScriptCache().put('snapshot', serialized, CACHE_TTL_SECONDS);
    }
  } catch (err) {}
  return snapshot;
}

// ============================================================
//  GET — leitura (JSON ou JSONP)
// ============================================================

function doGet(e) {
  var params = (e && e.parameter) || {};
  var callback = normalizeCallback(params.callback);
  var action = String(params.action || 'restore').toLowerCase();

  try {
    if (!isAuthorized(e)) {
      return respond(callback, errorPayload('UNAUTHORIZED',
        'Acesso nao autorizado. Verifique o token de autenticacao.'));
    }
    if (!checkRateLimit(extractToken(e))) {
      return respond(callback, errorPayload('RATE_LIMITED',
        'Muitas requisicoes em pouco tempo. Tente novamente em 1 minuto.'));
    }

    if (action === 'ping') {
      var shPing = getSheet();
      var snapPing = readSnapshotWithCache(shPing, true);
      return respond(callback, {
        ok: true,
        api: API_VERSION,
        revision: snapPing.meta.revision,
        savedAt: snapPing.meta.savedAt,
        serverTime: new Date().toISOString(),
        keys: Object.keys(snapPing.data || {}),
        authConfigured: isSecretConfigured()
      });
    }

    if (action === 'schema') {
      return respond(callback, {
        ok: true,
        api: API_VERSION,
        keys: DATA_KEYS,
        limits: { bodyChars: MAX_BODY_CHARS, cellChars: MAX_CELL_CHARS, ratePerMin: RATE_LIMIT_PER_MIN }
      });
    }

    if (action !== 'restore' && action !== 'load' && action !== 'get') {
      return respond(callback, errorPayload('BAD_REQUEST', 'Acao desconhecida: ' + action));
    }

    var sh = getSheet();
    var snapshot = readSnapshotWithCache(sh, true);
    var since = String(params.since || '');
    var sinceMs = since ? parseSheetDate(since) : 0;

    var body = {
      ok: true,
      api: API_VERSION,
      meta: baseMeta(snapshot),
      partial: false
    };

    if (sinceMs > 0) {
      var changed = [];
      for (var key in snapshot.data) {
        if (!snapshot.data.hasOwnProperty(key)) continue;
        var info = snapshot.keys[key] || {};
        if (!info.updatedAtMs || info.updatedAtMs > sinceMs) {
          body[key] = snapshot.data[key];
          changed.push(key);
        }
      }
      body.partial = true;
      body.changed = changed;
    } else {
      for (var k in snapshot.data) {
        if (snapshot.data.hasOwnProperty(k)) body[k] = snapshot.data[k];
      }
    }

    return respond(callback, body);
  } catch (err) {
    return respond(callback, errorPayload(err.code || 'SERVER_ERROR', err.message || 'Erro inesperado'));
  }
}

// ============================================================
//  POST — gravação autenticada, validada e em lote
// ============================================================

function stripProto(value, depth) {
  if (!value || typeof value !== 'object') return value;
  if ((depth || 0) > 12) return null;
  if (Array.isArray(value)) {
    var arr = [];
    for (var i = 0; i < value.length; i++) arr.push(stripProto(value[i], (depth || 0) + 1));
    return arr;
  }
  var out = {};
  for (var key in value) {
    if (!value.hasOwnProperty(key)) continue;
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    out[key] = stripProto(value[key], (depth || 0) + 1);
  }
  return out;
}

function validatePayload(payload) {
  var patch = {};
  var errors = [];
  var ignored = [];

  for (var key in payload) {
    if (!payload.hasOwnProperty(key)) continue;
    if (key === 'token' || key === 'action' || key === 'revision' || key === 'client') continue;
    if (!DATA_KEYS.hasOwnProperty(key)) { ignored.push(key); continue; }
    var value = payload[key];
    var type = DATA_KEYS[key];
    if (type === 'array' && !Array.isArray(value)) {
      errors.push('"' + key + '" deve ser uma lista');
      continue;
    }
    if (type === 'object' && (value === null || typeof value !== 'object' || Array.isArray(value))) {
      errors.push('"' + key + '" deve ser um objeto');
      continue;
    }
    patch[key] = stripProto(value, 0);
  }

  return { patch: patch, errors: errors, ignored: ignored };
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var body = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  var payload = null;

  try {
    payload = JSON.parse(body);
  } catch (parseErr) {
    return respond('', errorPayload('BAD_REQUEST', 'JSON malformado no corpo da requisicao'));
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return respond('', errorPayload('BAD_REQUEST', 'Payload invalido'));
  }
  if (body.length > MAX_BODY_CHARS) {
    return respond('', errorPayload('PAYLOAD_TOO_LARGE',
      'Corpo da requisicao excede ' + Math.round(MAX_BODY_CHARS / 1000) + ' KB.'));
  }
  if (!isAuthorized(e, payload)) {
    return respond('', errorPayload('UNAUTHORIZED', 'Acesso nao autorizado. Verifique o token de autenticacao.'));
  }
  if (!checkRateLimit(extractToken(e, payload))) {
    return respond('', errorPayload('RATE_LIMITED', 'Muitas gravacoes em pouco tempo. Aguarde 1 minuto.'));
  }

  var validation = validatePayload(payload);
  if (validation.errors.length) {
    return respond('', errorPayload('BAD_REQUEST', validation.errors.join('; ')));
  }
  if (!Object.keys(validation.patch).length) {
    return respond('', errorPayload('BAD_REQUEST', 'Nenhum campo conhecido para gravar'));
  }

  try {
    lock.waitLock(15000);
    var sh = getSheet();
    var result = writePatch(sh, validation.patch);
    appendLog({
      action: 'backup',
      keys: result.keys.join(','),
      bytes: body.length,
      revision: result.revision
    });
    return respond('', {
      ok: true,
      api: API_VERSION,
      savedAt: result.savedAt,
      revision: result.revision,
      keys: result.keys,
      counts: result.counts,
      meta: { api: API_VERSION, revision: result.revision, savedAt: result.savedAt, serverTime: new Date().toISOString() }
    });
  } catch (err) {
    if (err && err.code) {
      return respond('', errorPayload(err.code, err.message));
    }
    return respond('', errorPayload('SERVER_ERROR', err && err.message ? err.message : 'Erro inesperado'));
  } finally {
    try { lock.releaseLock(); } catch (releaseErr) {}
  }
}

// ============================================================
//  MENU DA PLANILHA (opcional, ajuda no diagnóstico)
// ============================================================

function onOpen() {
  try {
    SpreadsheetApp.getUi()
      .createMenu('Faturas API')
      .addItem('Ver status da API', 'menuStatus')
      .addItem('Recriar cabeçalhos', 'menuFixHeaders')
      .addItem('Limpar log', 'menuClearLog')
      .addToUi();
  } catch (err) {}
}

function menuStatus() {
  var sh = getSheet();
  var snapshot = readSnapshot(sh);
  var msg = 'API ' + API_VERSION + '\n' +
    'Revisão: ' + snapshot.meta.revision + '\n' +
    'Salvo em: ' + (snapshot.meta.savedAt || '(sem gravações)') + '\n' +
    'Chaves: ' + (Object.keys(snapshot.data).join(', ') || '(nenhuma)') + '\n' +
    'Token configurado: ' + (isSecretConfigured() ? 'sim' : 'NÃO (defina SHEETS_SECRET_TOKEN)');
  try { SpreadsheetApp.getUi().alert('Faturas API', msg, SpreadsheetApp.getUi().ButtonSet.OK); } catch (err) {}
  return msg;
}

function menuFixHeaders() {
  var sh = getSheet();
  sh.getRange('A1:D1').setValues([['chave', 'valor_json', 'atualizado_em', 'registros']]);
  sh.getRange('A1:D1').setFontWeight('bold');
  sh.setFrozenRows(1);
  try { SpreadsheetApp.getUi().alert('Cabeçalhos recriados.'); } catch (err) {}
}

function menuClearLog() {
  try {
    var sh = openSheet(LOG_SHEET);
    if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
    SpreadsheetApp.getUi().alert('Log limpo.');
  } catch (err) {}
}
