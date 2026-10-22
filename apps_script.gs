// ============================================================
//  APPS SCRIPT - Backup "Faturas"
//  Planilha: Vincule este script a sua planilha Google Sheets pessoal
//
//  SEGURANCA:
//  Defina uma chave secreta abaixo (SHARED_SECRET) e configure a
//  mesma chave na aba "Perfil" do aplicativo web.
//
//  COMO INSTALAR:
//  1. Abra sua planilha Google Sheets pessoal
//  2. Menu: Extensoes > Apps Script
//  3. Apague tudo e cole este codigo
//  4. Altere a constante SHARED_SECRET para uma senha forte
//  5. Salve (Ctrl+S)
//  6. Clique em "Implantar" > "Nova implantacao"
//  7. Tipo: App da Web
//  8. Executar como: Eu (seu e-mail)
//  9. Quem tem acesso: Qualquer pessoa
//  10. Clique em "Implantar" > autorize > copie a URL
//  11. Cole a URL e a mesma chave na aba Perfil do app
//
//  SE JA EXISTE UMA IMPLANTACAO:
//  1. "Implantar" > "Gerenciar implantacoes" > lapis (editar)
//  2. Versao: Nova versao
//  3. Acesso: Qualquer pessoa
//  4. Implantar (a URL nao muda)
// ============================================================

var SHARED_SECRET = 'DefinaUmaChaveComplexaAqui123!'; // Chave privada de acesso (ou defina SHEETS_SECRET_TOKEN nas Propriedades do script)
var SHEET_NAME = 'Backup';

function getSecretToken() {
  try {
    var prop = PropertiesService.getScriptProperties().getProperty('SHEETS_SECRET_TOKEN');
    if (prop) return prop;
  } catch(err) {}
  return SHARED_SECRET;
}

function isAuthorized(e) {
  var secret = getSecretToken();
  if (!secret || secret === 'DefinaUmaChaveComplexaAqui123!') {
    // Permite uso inicial se o usuario ainda nao configurou token exclusivo
    return true;
  }
  var token = (e && e.parameter && e.parameter.token) || '';
  if (!token && e && e.postData && e.postData.contents) {
    try {
      var parsed = JSON.parse(e.postData.contents);
      token = parsed.token || '';
    } catch(err) {}
  }
  return token === secret;
}

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

// GET - apenas leitura autenticada de dados
function doGet(e) {
  var p        = (e && e.parameter) || {};
  var callback = p.callback || '';

  if (!isAuthorized(e)) {
    var unauthorized = { ok: false, error: 'Acesso nao autorizado. Verifique o token de autenticacao.' };
    return callback ? jsonpResponse(callback, unauthorized) : jsonResponse(unauthorized);
  }

  var sh = getSheet();
  var result = {
    ok: true,
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

// POST - salva dados com autenticacao e trava de concorrencia (LockService)
function doPost(e) {
  if (!isAuthorized(e)) {
    return jsonResponse({ ok: false, error: 'Acesso nao autorizado. Verifique o token de autenticacao.' });
  }

  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000); // Aguarda ate 10s para evitar race conditions
    var body    = (e && e.postData) ? e.postData.contents : '{}';
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
  } finally {
    lock.releaseLock();
  }
}
