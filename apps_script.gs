// ============================================================
//  APPS SCRIPT - Backup "Parcelado ou A Vista?"
//  Planilha: https://docs.google.com/spreadsheets/d/1gOvQKSzyNuaVxUH-HgyQEV5HY_vlJsnAB5fnry4Uc3s
//
//  COMO INSTALAR:
//  1. Menu: Extensoes > Apps Script
//  2. Apague tudo e cole este codigo
//  3. Salve (Ctrl+S)
//  4. Clique em "Implantar" > "Nova implantacao"
//  5. Tipo: App da Web
//  6. Executar como: Eu (seu e-mail)
//  7. Quem tem acesso: Qualquer pessoa
//  8. Clique em "Implantar" > autorize > copie a URL
//  9. Cole a URL na aba Perfil do app
//
//  SE JA EXISTE UMA IMPLANTACAO:
//  1. "Implantar" > "Gerenciar implantacoes" > lapis (editar)
//  2. Versao: Nova versao
//  3. Acesso: Qualquer pessoa
//  4. Implantar (a URL nao muda)
// ============================================================

var SHEET_NAME = 'Backup';

function getSheet() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.getRange('A1:D1').setValues([['chave', 'valor_json', 'atualizado_em', 'registros']]);
    sh.getRange('A1:D1').setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

function readKey(sh, key) {
  var data = sh.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      try {
        return JSON.parse(String(data[i][1]));
      } catch (e) {
        return null;
      }
    }
  }
  return null;
}

function writeKey(sh, key, value) {
  var data  = sh.getDataRange().getValues();
  var now   = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
  var count = Array.isArray(value) ? value.length : Object.keys(value || {}).length;
  var json  = JSON.stringify(value);
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === key) {
      sh.getRange(i + 1, 2, 1, 3).setValues([[json, now, count]]);
      return;
    }
  }
  sh.appendRow([key, json, now, count]);
}

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonpResponse(callback, data) {
  var js = callback + '(' + JSON.stringify(data) + ')';
  return ContentService
    .createTextOutput(js)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// GET - carrega dados OU salva via GET (para file://)
function doGet(e) {
  var p        = e.parameter || {};
  var action   = p.action   || 'load';
  var callback = p.callback || '';
  var sh       = getSheet();

  if (action === 'save') {
    try {
      var raw     = decodeURIComponent(p.data || '{}');
      var payload = JSON.parse(raw);
      if (payload.extraItems !== undefined) writeKey(sh, 'extraItems', payload.extraItems);
      if (payload.simItems   !== undefined) writeKey(sh, 'simItems',   payload.simItems);
      if (payload.overrides  !== undefined) writeKey(sh, 'overrides',  payload.overrides);
      if (payload.purchHist  !== undefined) writeKey(sh, 'purchHist',  payload.purchHist);
      if (payload.monthStatus !== undefined) writeKey(sh, 'monthStatus', payload.monthStatus);
      if (payload.collapsedMonths !== undefined) writeKey(sh, 'collapsedMonths', payload.collapsedMonths);
      if (payload.profile    !== undefined) writeKey(sh, 'profile',    payload.profile);
      var ok = { ok: true, savedAt: new Date().toISOString() };
      return callback ? jsonpResponse(callback, ok) : jsonResponse(ok);
    } catch (err) {
      var fail = { ok: false, error: err.message };
      return callback ? jsonpResponse(callback, fail) : jsonResponse(fail);
    }
  }

  // action = 'load'
  var result = {
    extraItems: readKey(sh, 'extraItems') || [],
    simItems:   readKey(sh, 'simItems')   || [],
    overrides:  readKey(sh, 'overrides')  || {},
    purchHist:  readKey(sh, 'purchHist')  || [],
    monthStatus: readKey(sh, 'monthStatus') || {},
    collapsedMonths: readKey(sh, 'collapsedMonths') || {},
    profile:    readKey(sh, 'profile')    || {}
  };
  return callback ? jsonpResponse(callback, result) : jsonResponse(result);
}

// POST - salva dados (para quando app estiver hospedado em https://)
function doPost(e) {
  try {
    var body    = e.postData ? e.postData.contents : '{}';
    var payload = JSON.parse(body);
    var sh      = getSheet();
    if (payload.extraItems !== undefined) writeKey(sh, 'extraItems', payload.extraItems);
    if (payload.simItems   !== undefined) writeKey(sh, 'simItems',   payload.simItems);
    if (payload.overrides  !== undefined) writeKey(sh, 'overrides',  payload.overrides);
    if (payload.purchHist  !== undefined) writeKey(sh, 'purchHist',  payload.purchHist);
    if (payload.monthStatus !== undefined) writeKey(sh, 'monthStatus', payload.monthStatus);
    if (payload.collapsedMonths !== undefined) writeKey(sh, 'collapsedMonths', payload.collapsedMonths);
    if (payload.profile    !== undefined) writeKey(sh, 'profile',    payload.profile);
    return jsonResponse({ ok: true, savedAt: new Date().toISOString() });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}
