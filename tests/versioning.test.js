const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

function match(source, regex, label) {
  const found = regex.exec(source);
  assert.ok(found, `não foi possível ler ${label}`);
  return found[1];
}

test('versões: SW_CACHE_NAME do app casa com o CACHE_NAME do sw.js', () => {
  const appCache = match(html, /var SW_CACHE_NAME='([^']+)'/, 'SW_CACHE_NAME');
  const swCache = match(sw, /const CACHE_NAME = '([^']+)'/, 'CACHE_NAME');
  assert.equal(appCache, swCache, 'HTML e sw.js precisam estar na mesma versão de cache');
});

test('versões: os ícones usam a APP_VERSION como cache-busting', () => {
  const appVersion = match(html, /var APP_VERSION='([^']+)'/, 'APP_VERSION');
  const iconVersions = [...new Set([...html.matchAll(/icon-(?:192|512)\.png\?v=([\d.]+)/g)].map((m) => m[1]))];
  assert.ok(iconVersions.length > 0, 'os ícones devem ter ?v=');
  assert.deepEqual(iconVersions, [appVersion], 'o ?v= dos ícones deve ser igual à APP_VERSION');
});

test('manifest: tema, escopo e ícones coerentes com o index.html', () => {
  const themeMeta = match(html, /name="theme-color" content="([^"]+)"/, 'theme-color');
  assert.equal(manifest.theme_color, themeMeta);
  assert.equal(manifest.background_color, themeMeta);
  assert.equal(manifest.lang, 'pt-BR');
  assert.equal(manifest.display, 'standalone');

  for (const icon of manifest.icons) {
    assert.ok(fs.existsSync(path.join(root, icon.src)), `ícone ausente: ${icon.src}`);
  }
  for (const shortcut of manifest.shortcuts || []) {
    assert.ok(shortcut.url.startsWith('./index.html#tab='), 'atalho deve apontar para uma aba');
    for (const icon of shortcut.icons || []) {
      assert.ok(fs.existsSync(path.join(root, icon.src)), `ícone de atalho ausente: ${icon.src}`);
    }
  }
});

test('service worker: não ativa sozinho e expõe o SKIP_WAITING esperado pelo app', () => {
  assert.ok(!/install[\s\S]{0,300}skipWaiting\(\)/.test(sw.split('activate')[0]), 'o install não pode chamar skipWaiting');
  assert.match(sw, /SKIP_WAITING/, 'o SW precisa ouvir a mensagem SKIP_WAITING');
  assert.match(html, /SKIP_WAITING/, 'o app precisa enviar SKIP_WAITING no botão Atualizar');
});

test('contrato com o Matrix: chaves obrigatórias continuam no payload de sync', () => {
  const required = ['extraItems', 'simItems', 'overrides', 'profile', 'monthStatus'];
  for (const key of required) {
    assert.match(html, new RegExp(key + '\\s*:'), `payload de sync deve manter ${key}`);
  }
  assert.match(html, /itemCatMap\s*:/);
  assert.match(html, /purchHist\s*:/);
});
