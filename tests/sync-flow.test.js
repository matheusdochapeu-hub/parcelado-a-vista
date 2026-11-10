const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

function withSyncUrl(ctx) {
  ctx.profile.gasUrl = 'https://script.google.com/macros/s/mock/exec';
  ctx.profile.gasToken = 'token';
  return ctx;
}

test('sync: syncAll aplica o snapshot remoto e guarda revisão + horário', () => {
  const ctx = withSyncUrl(loadAppContext());
  let requestedAction = null;

  ctx.jsonpGet = (url, params, onSuccess) => {
    requestedAction = params.action;
    onSuccess({
      ok: true,
      api: '2.1',
      meta: { revision: 9, savedAt: new Date().toISOString() },
      extraItems: [{ desc: 'Veio da nuvem', val: 42, de: 1, ate: 1 }],
      monthStatus: { 2: 'fechada' }
    });
  };

  ctx.syncAll();

  assert.equal(requestedAction, 'restore');
  assert.equal(ctx.SYNC.revision, 9);
  assert.ok(ctx.SYNC.lastOkAt > 0);
  assert.equal(ctx.extraItems[0].desc, 'Veio da nuvem');
  assert.equal(ctx.monthStatus[2], 'fechada');
  assert.equal(ctx.SYNC.dirty, false);
  assert.equal(ctx._apiInfo.api, '2.1');
});

test('sync: syncAll pede incremental (since) quando já existe savedAt', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.SYNC.savedAt = '2026-11-10T12:00:00.000Z';
  let since = null;

  ctx.jsonpGet = (url, params, onSuccess) => {
    since = params.since;
    onSuccess({ ok: true, api: '2.1', meta: { revision: 10, savedAt: '2026-11-10T12:05:00.000Z' }, extraItems: [] });
  };

  ctx.syncAll({ incremental: true });
  assert.equal(since, '2026-11-10T12:00:00.000Z');
  assert.equal(ctx.SYNC.revision, 10);
});

test('sync: conflito não sobrescreve alterações locais e mostra o banner', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.SYNC.dirty = true;
  ctx._lastLocalChangeAt = Date.now() - 60 * 60 * 1000; // editei 1h atrás
  ctx.extraItems = [{ desc: 'Local', val: 7, de: 1, ate: 1 }];

  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({
      ok: true,
      api: '2.1',
      meta: { revision: 15, savedAt: new Date().toISOString() }, // nuvem gravou agora
      extraItems: [{ desc: 'Nuvem', val: 99, de: 1, ate: 1 }]
    });
  };

  ctx.syncAll();

  assert.equal(ctx.extraItems[0].desc, 'Local', 'conflito não pode descartar o dado local');
  assert.equal(ctx.SYNC.dirty, true);
  const banner = ctx.document.getElementById('syncBanner');
  assert.equal(banner.hidden, false);
  assert.match(banner.innerHTML, /Usar a nuvem/);
  assert.match(banner.innerHTML, /Manter este aparelho/);
});

test('sync: resolveSync("remote") força a nuvem sobre o conflito', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.SYNC.dirty = true;
  ctx._lastLocalChangeAt = Date.now() - 60 * 60 * 1000;
  ctx.extraItems = [{ desc: 'Local', val: 7, de: 1, ate: 1 }];
  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({
      ok: true,
      api: '2.1',
      meta: { revision: 16, savedAt: new Date().toISOString() },
      extraItems: [{ desc: 'Nuvem', val: 99, de: 1, ate: 1 }]
    });
  };

  ctx.resolveSync('remote');

  assert.equal(ctx.extraItems[0].desc, 'Nuvem');
  const banner = ctx.document.getElementById('syncBanner');
  assert.equal(banner.hidden, true);
});

test('sync: erro da API mantém o estado local e registra a mensagem', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({ ok: false, code: 'UNAUTHORIZED', error: 'Token inválido' });
  };

  ctx.syncAll();

  assert.equal(ctx.SYNC.lastError, 'Token inválido');
  assert.equal(ctx._syncing, false);
});

test('sync: ping descreve a API v2 e a revisão na aba Perfil', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.jsonpGet = (url, params, onSuccess) => {
    assert.equal(params.action, 'ping');
    onSuccess({ ok: true, api: '2.1', revision: 21, savedAt: '2026-11-10T15:00:00.000Z', authConfigured: true });
  };

  ctx.pingApi();

  assert.equal(ctx._apiInfo.api, '2.1');
  assert.equal(ctx._apiInfo.revision, 21);
  assert.equal(ctx.document.getElementById('aboutApi').textContent, 'API 2.1 · rev 21');
  const box = ctx.document.getElementById('apiStatusBox');
  assert.match(box.innerHTML, /conectado/);
  assert.match(box.innerHTML, /21/);
});

test('sync: ping em backend antigo (v1) não quebra e avisa', () => {
  const ctx = withSyncUrl(loadAppContext());
  ctx.jsonpGet = (url, params, onSuccess) => {
    onSuccess({ ok: true, extraItems: [], simItems: [] }); // resposta da API v1
  };

  ctx.pingApi();
  assert.equal(ctx._apiInfo.api, '1.x (reimplante o apps_script.gs)');
});

test('sync: sem URL configurada o app fica local e não dispara requisição', () => {
  const ctx = loadAppContext();
  let called = false;
  ctx.jsonpGet = () => { called = true; };

  ctx.syncAll();

  assert.equal(called, false);
  assert.equal(ctx.document.getElementById('syncTxt').textContent.length > 0, true);
});
