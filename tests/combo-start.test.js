const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

function seedCombo(ctx) {
  ctx.purchHist = [
    { name: 'Cobertura Retrátil', date: '12/11/2026', cashPrice: 6960, instTotal: 6960, winN: 10, winner: 'parc', savings: 0, miles: 0, mOff: 3 },
    { name: 'Cobertura Área Gourmet', date: '12/11/2026', cashPrice: 6770, instTotal: 6770, winN: 10, winner: 'parc', savings: 0, miles: 0, mOff: 3 }
  ];
  ctx.histSel = { 0: true, 1: true };
  ctx.comboN = {};
}

test('combo: buildComboPlan usa o mês inicial escolhido para todos os produtos', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  const items = ctx.getSelectedHistItems();

  const automatic = ctx.buildComboPlan(items, {}, null, null);
  assert.equal(Array.from(automatic.products, (p) => p.start).join(','), '3,3', 'sem override respeita o mês de cada simulação');

  const forced = ctx.buildComboPlan(items, {}, null, 5);
  assert.equal(Array.from(forced.products, (p) => p.start).join(','), '5,5');
  assert.equal(forced.monthList[0].m, 5);
  assert.equal(forced.products[0].end, 5 + forced.products[0].n - 1);
});

test('combo: mês escolhido antes do primeiro mês aberto é limitado a ele', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  const items = ctx.getSelectedHistItems();
  const firstOpen = ctx.getFirstOpenMonth();

  const plan = ctx.buildComboPlan(items, {}, null, 1);

  assert.equal(plan.products[0].start, firstOpen);
  assert.ok(plan.products[0].start >= firstOpen);
});

test('combo: renderHistCombo mostra o seletor de mês inicial e as opções abertas', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  ctx.comboStart = 4;
  ctx.renderHistCombo();

  const html = ctx.document.getElementById('histCombo').innerHTML;
  assert.match(html, /id="comboStartSel"/);
  assert.match(html, /Mês inicial/);
  assert.match(html, /Automático \(mês de cada simulação\)/);
  assert.match(html, /começa em Jan\/2027/, 'os produtos passam a começar no mês escolhido');
});

test('combo: setComboStart aceita mês aberto e ignora mês fechado', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  const firstOpen = ctx.getFirstOpenMonth();

  ctx.setComboStart(firstOpen + 2);
  assert.equal(ctx.comboStart, firstOpen + 2);

  ctx.monthStatus[firstOpen + 3] = 'fechada';
  ctx.setComboStart(firstOpen + 3);
  assert.equal(ctx.comboStart, null, 'mês fechado não pode ser escolhido');

  ctx.setComboStart('');
  assert.equal(ctx.comboStart, null);
});

test('combo: inserir nas faturas respeita o mês inicial escolhido', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  ctx.comboStart = 4;
  ctx.renderHistCombo();

  ctx.insertHistCombo();

  assert.ok(ctx.simItems.length > 0, 'deve gerar as parcelas simuladas');
  assert.equal(Math.min(...ctx.simItems.map((s) => s.de)), 4, 'a primeira parcela de cada produto começa no mês escolhido');
  const firstInstallments = ctx.simItems.filter((s) => / 1\/\d+$/.test(s.d));
  assert.ok(firstInstallments.length >= 2);
  assert.ok(firstInstallments.every((s) => s.de === 4), 'todos os produtos começam em Jan/2027');
  assert.ok(ctx.simItems.some((s) => s.ate === 4 + 10 - 1), 'a última parcela de 10x cai em Out/2027');
  assert.equal(ctx.comboStart, null, 'a escolha é limpa depois de inserir');
});

test('combo: limpar a seleção volta o mês inicial para automático', () => {
  const ctx = loadAppContext();
  seedCombo(ctx);
  ctx.comboStart = 5;

  ctx.clearHistSelection();

  assert.equal(ctx.comboStart, null);
});
