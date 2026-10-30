const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('security: setSyncStatus usa textContent/seguro e não interpreta HTML malicioso', () => {
  const ctx = loadAppContext();
  const box = ctx.document.getElementById('syncStatusBox');

  const maliciousPayload = '<img src=x onerror=alert(1)>';
  ctx.setSyncStatus('err', maliciousPayload);

  assert.ok(box.textContent.includes(maliciousPayload), 'O texto bruto deve estar preservado no textContent');
  assert.ok(!box.innerHTML.includes('<img'), 'Não deve renderizar elemento HTML no innerHTML');
});
