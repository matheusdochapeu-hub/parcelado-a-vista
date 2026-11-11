const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadAppContext } = require('./helpers/load-app-context');

test('security: setSyncStatus usa textContent/seguro e não interpreta HTML malicioso', () => {
  const ctx = loadAppContext();
  const box = ctx.document.getElementById('syncStatusBox');

  const maliciousPayload = '<img src=x onerror=alert(1)>';
  ctx.setSyncStatus('err', maliciousPayload);

  assert.ok(box.textContent.includes(maliciousPayload), 'O texto bruto deve estar preservado no textContent');
  assert.ok(!box.innerHTML.includes('<img'), 'Não deve renderizar elemento HTML no innerHTML');
});

function loadAppsScriptContext(mockProperties = {}) {
  const scriptPath = path.resolve(__dirname, '../apps_script.gs');
  const code = fs.readFileSync(scriptPath, 'utf8');

  const sandbox = {
    PropertiesService: {
      getScriptProperties: () => ({
        getProperty: (key) => (key in mockProperties ? mockProperties[key] : null)
      })
    },
    Logger: {
      log: () => {}
    },
    JSON,
    String,
    Date
  };

  vm.createContext(sandbox);
  vm.runInContext(code, sandbox);
  return sandbox;
}

test('security: apps_script bloqueia acesso não autenticado quando secret é o placeholder padrão ou vazio', () => {
  // 1. Secret padrão sem propriedade configurada
  const ctxDefault = loadAppsScriptContext({});
  assert.equal(ctxDefault.isAuthorized({}), false, 'Deve bloquear requisição anônima com secret padrão');
  assert.equal(ctxDefault.isAuthorized({ parameter: { token: 'DefinaUmaChaveComplexaAqui123!' } }), false, 'Deve bloquear mesmo se passar o token padrão');

  // 2. Secret explicitamente vazio
  const ctxEmpty = loadAppsScriptContext({ SHEETS_SECRET_TOKEN: '' });
  assert.equal(ctxEmpty.isAuthorized({ parameter: { token: 'abc' } }), false, 'Deve bloquear quando o token configurado é vazio');
});

test('security: apps_script autoriza com token correto e bloqueia token divergente', () => {
  const customSecret = 'MinhaChaveUltraSegura987!';
  const ctx = loadAppsScriptContext({ SHEETS_SECRET_TOKEN: customSecret });

  // Query parameter válido
  assert.equal(ctx.isAuthorized({ parameter: { token: customSecret } }), true, 'Deve autorizar quando parameter.token confere');

  // JSON POST body válido
  assert.equal(ctx.isAuthorized({ postData: { contents: JSON.stringify({ token: customSecret }) } }), true, 'Deve autorizar quando token no body confere');

  // Token incorreto
  assert.equal(ctx.isAuthorized({ parameter: { token: 'chaveErrada' } }), false, 'Deve rejeitar token incorreto via parameter');
  assert.equal(ctx.isAuthorized({ postData: { contents: JSON.stringify({ token: 'chaveErrada' }) } }), false, 'Deve rejeitar token incorreto via body');
  assert.equal(ctx.isAuthorized({}), false, 'Deve rejeitar requisição sem token');
});
