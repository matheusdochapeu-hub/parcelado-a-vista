const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

const VALID = 'https://script.google.com/macros/s/AKfycbzXFXbZQ8TfHYwntMXg5k1lI_1pzBx7rTwVYycNESff8KC3DV95CRq15OrcP6dsC2_F/exec';
const OTHER = 'https://script.google.com/macros/s/OUTRO_DEPLOY_123/exec';

test('url: normalizeGasUrl limpa espaços e extrai a URL de um texto colado', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.normalizeGasUrl('  ' + VALID + '  '), VALID);
  assert.equal(ctx.normalizeGasUrl('Implantação: ' + VALID), VALID);
  assert.equal(ctx.normalizeGasUrl('script.google.com/macros/s/ABC_123/exec'), 'https://script.google.com/macros/s/ABC_123/exec');
  assert.equal(ctx.normalizeGasUrl(''), '');
  assert.equal(ctx.normalizeGasUrl(null), '');
  assert.equal(ctx.normalizeGasUrl('Matheus'), 'Matheus');
});

test('url: isValidGasUrl aceita só a URL de implantação /exec', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.isValidGasUrl(VALID), true);
  assert.equal(ctx.isValidGasUrl('Implantação: ' + VALID), true);
  assert.equal(ctx.isValidGasUrl('Matheus'), false);
  assert.equal(ctx.isValidGasUrl(''), false);
  assert.equal(ctx.isValidGasUrl('https://script.google.com/macros/s/ABC'), false);
  assert.equal(ctx.isValidGasUrl('https://example.com/macros/s/ABC/exec'), false);
  assert.equal(ctx.isValidGasUrl('http://script.google.com/macros/s/ABC/exec'), false);
});

test('url: saveProfile normaliza a URL mesmo colada com texto em volta', () => {
  const ctx = loadAppContext();
  ctx.document.getElementById('cGasUrl').value = '  Link: ' + VALID + '  ';
  ctx.document.getElementById('cGasToken').value = '  segredo  ';

  ctx.saveProfile();

  assert.equal(ctx.profile.gasUrl, VALID);
  assert.equal(ctx.profile.gasToken, 'segredo');
  assert.equal(ctx.hasValidGasUrl(), true);
});

test('url: saveProfile com valor inválido marca erro e não agenda envio', () => {
  const ctx = loadAppContext();
  ctx.document.getElementById('cGasUrl').value = 'Matheus';
  ctx.document.getElementById('cGasToken').value = '';

  ctx.saveProfile();

  assert.equal(ctx.profile.gasUrl, 'Matheus');
  assert.equal(ctx.hasValidGasUrl(), false);
  assert.match(ctx.document.getElementById('syncStatus').textContent, /URL do Apps Script inválida/);
  assert.equal(ctx.document.getElementById('gasUrlHint').className, 'csub err-text');
});

test('url: applyRemoteProfile adota a URL válida da planilha quando a local está quebrada', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.profile.gasToken = 'token-local';

  ctx.applyRemoteProfile({ meta: 3000, gasUrl: VALID, gasToken: 'token-da-planilha' });

  assert.equal(ctx.profile.gasUrl, VALID, 'deve recuperar a URL salva na nuvem');
  assert.equal(ctx.profile.gasToken, 'token-local', 'token nunca vem da planilha');
  assert.equal(ctx.document.getElementById('cGasUrl').value, VALID);
});

test('url: applyRemoteProfile preserva a URL local quando ela é válida', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = VALID;

  ctx.applyRemoteProfile({ meta: 3000, gasUrl: OTHER });

  assert.equal(ctx.profile.gasUrl, VALID);
});

test('url: profile enviado para a planilha não carrega o token', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = VALID;
  ctx.profile.gasToken = 'super-secreto';
  ctx.profile.meta = 3200;

  const payload = ctx.buildSyncPayload();

  assert.equal(payload.token, 'super-secreto', 'o token ainda autentica a requisição');
  assert.equal(Object.prototype.hasOwnProperty.call(payload.profile, 'gasToken'), false, 'não pode gravar o token na planilha');
  assert.equal(payload.profile.gasUrl, VALID);
  assert.equal(payload.profile.meta, 3200);
});

test('url: profile enviado não propaga URL inválida', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';

  const payload = ctx.buildSyncPayload();
  assert.equal(payload.profile.gasUrl, '');
});

test('url: syncAll com URL inválida não faz requisição e mostra o banner de correção', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  let called = false;
  ctx.jsonpGet = () => { called = true; };

  ctx.syncAll();

  assert.equal(called, false);
  const banner = ctx.document.getElementById('syncBanner');
  assert.equal(banner.hidden, false);
  assert.match(banner.innerHTML, /A URL da planilha está inválida/);
  assert.match(banner.innerHTML, /Usar URL padrão/);
  assert.match(ctx.document.getElementById('syncTxt').textContent, /URL inválida/);
});

test('url: flushPush com URL inválida não tenta POST (não pode fingir sucesso)', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.SYNC.dirty = true;
  let posts = 0;
  ctx.fetch = () => { posts += 1; return Promise.resolve(); };

  ctx.flushPush();

  assert.equal(posts, 0);
  assert.equal(ctx.SYNC.dirty, true, 'continua pendente até corrigir a URL');
});

test('url: useDefaultGasUrl restaura a URL conhecida e valida', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.pingApi = () => {};

  ctx.useDefaultGasUrl();

  assert.equal(ctx.profile.gasUrl, ctx.DEFAULT_GAS_URL);
  assert.equal(ctx.hasValidGasUrl(), true);
  assert.equal(ctx.document.getElementById('cGasUrl').value, ctx.DEFAULT_GAS_URL);
});

test('url: diagnóstico mostra URL, token, pendências e revisão', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.SYNC.dirty = true;
  ctx.SYNC.revision = 13;

  ctx.renderSyncDiag();

  const box = ctx.document.getElementById('syncDiagBox');
  assert.match(box.innerHTML, /URL do Apps Script/);
  assert.match(box.innerHTML, /❌ inválida/);
  assert.match(box.innerHTML, /Alterações pendentes/);
  assert.match(box.innerHTML, /13/);
});

test('url: URL inválida testa a URL padrão em modo leitura e se recupera sozinha', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.pingApi = () => {};
  let probe = null;
  ctx.jsonpGet = (url, params, onSuccess) => {
    probe = { url, action: params.action };
    onSuccess({ ok: true, api: '2.1', revision: 13 });
  };

  ctx.probeDefaultUrl();

  assert.equal(probe.url, ctx.DEFAULT_GAS_URL);
  assert.equal(probe.action, 'ping', 'a recuperação é somente leitura');
  assert.equal(ctx.profile.gasUrl, ctx.DEFAULT_GAS_URL);
  assert.equal(ctx.hasValidGasUrl(), true);
});

test('url: recuperação automática não faz nada quando a URL já é válida', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = VALID;
  let calls = 0;
  ctx.jsonpGet = () => { calls += 1; };

  ctx.probeDefaultUrl();
  assert.equal(calls, 0);
});

test('url: recuperação automática mantém o banner se o ping falhar (ex.: token exigido)', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = 'Matheus';
  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({ ok: false, error: 'Acesso nao autorizado' });
  };

  ctx.probeDefaultUrl();
  assert.equal(ctx.profile.gasUrl, 'Matheus', 'não pode adotar URL sem confirmar que responde');
});

test('token: erro de autorização vira instrução acionável', () => {
  const ctx = loadAppContext();
  ctx.profile.gasUrl = VALID;
  ctx.profile.gasToken = '';
  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({ ok: false, code: 'UNAUTHORIZED', error: 'Acesso nao autorizado. Verifique o token de autenticacao.' });
  };

  ctx.syncAll();

  assert.match(ctx.SYNC.lastError, /exige token/);
  assert.match(ctx.SYNC.lastError, /SHEETS_SECRET_TOKEN/);
  assert.match(ctx.document.getElementById('syncStatus').textContent, /SHEETS_SECRET_TOKEN/);
  assert.equal(ctx._syncing, false);
});
