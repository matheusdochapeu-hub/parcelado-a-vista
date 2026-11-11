const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

const ITEMS = [
  { histIdx: 0, name: 'TV', cashPrice: 2400, instTotal: 2400, winN: 12, winner: 'parc', mOff: 3, date: '01/11/2026' },
  { histIdx: 1, name: 'Sofá', cashPrice: 1200, instTotal: 1200, winN: 6, winner: 'parc', mOff: 3, date: '01/11/2026' },
  { histIdx: 2, name: 'Fone', cashPrice: 300, instTotal: 300, winN: 1, winner: 'vista', mOff: 4, date: '01/11/2026' }
];

test('combo: soma as parcelas das simulações mês a mês', () => {
  const ctx = loadAppContext();
  const plan = ctx.buildComboPlan(ITEMS, {}, 3);

  assert.equal(plan.products.length, 3);
  assert.equal(plan.total, 3900);
  assert.equal(plan.products[0].per, 200);
  assert.equal(plan.products[1].per, 200);
  assert.equal(plan.products[2].n, 1, 'simulação vencedora à vista entra em 1x');
  assert.equal(plan.products[2].per, 300);

  assert.equal(plan.months[3], 400); // TV + Sofá
  assert.equal(plan.months[4], 700); // TV + Sofá + Fone
  assert.equal(plan.months[9], 200); // só TV
  assert.equal(plan.maxEnd, 14);     // 3 + 12 - 1
  assert.equal(plan.affected, 12);
  assert.equal(plan.peak.added, 700);
  assert.equal(plan.peak.m, 4);
});

test('combo: trocar o número de parcelas recalcula o plano', () => {
  const ctx = loadAppContext();
  const plan = ctx.buildComboPlan(ITEMS, { 0: 6 }, 3);

  assert.equal(plan.products[0].n, 6);
  assert.equal(plan.products[0].per, 400);
  assert.equal(plan.products[0].end, 8);
  assert.equal(plan.months[3], 600); // TV 6x + Sofá 6x
  assert.ok(!plan.months[9], 'TV já terminou em Ago (índice 8)');
  assert.equal(plan.maxEnd, 8);      // TV 3..8 + Sofá 3..8 + Fone 4
});

test('combo: inserir como fatura real cria lançamentos manuais e como simulação cria grupo removível', () => {
  const ctx = loadAppContext();
  const products = [
    { name: 'TV', n: 2, per: 150, start: 3, end: 4 },
    { name: 'Sofá', n: 1, per: 300, start: 3, end: 3 }
  ];

  ctx.addComboToFaturas(products, true);
  assert.equal(ctx.extraItems.length, 2, 'cada produto vira um lançamento manual');
  assert.equal(ctx.extraItems[0].val, 150);
  assert.equal(ctx.extraItems[0].de, 3);
  assert.equal(ctx.extraItems[0].ate, 4);
  assert.match(ctx.extraItems[0].desc, /TV \(2x R\$.*150,00\)/);

  ctx.extraItems = [];
  ctx.simItems = [];
  const res = ctx.addComboToFaturas(products, false);
  assert.equal(ctx.simItems.length, 3, '2 parcelas da TV + 1 do Sofá');
  assert.equal(ctx.simItems[0].group, res.group);
  assert.equal(ctx.simItems[0].v, 150);
  assert.ok(ctx.simItems.every((item) => item.isSimul === true));
  assert.equal(ctx.simItems[2].d, 'Sofá (à vista)');
});
