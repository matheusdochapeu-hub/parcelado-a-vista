const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('calendar: getMonthName formata corretamente meses dentro e além do ano âncora', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.getMonthName(0), 'Set/2026');
  assert.equal(ctx.getMonthName(1), 'Out/2026');
  assert.equal(ctx.getMonthName(3), 'Dez/2026');
  assert.equal(ctx.getMonthName(4), 'Jan/2027');
  assert.equal(ctx.getMonthName(15), 'Dez/2027');
  assert.equal(ctx.getMonthName(16), 'Jan/2028');
  assert.equal(ctx.getMonthName(28), 'Jan/2029');
});

test('calendar: addSimulation distribui parcelas de 24x em 24 meses distintos', () => {
  const ctx = loadAppContext();
  ctx.simItems = [];
  ctx.addSimulation('TV 8K', 200, 1, 24);

  assert.equal(ctx.simItems.length, 24);
  const monthIndices = ctx.simItems.map(item => item.de);
  const uniqueMonths = new Set(monthIndices);

  assert.equal(uniqueMonths.size, 24, 'Cada parcela deve ocupar um mês diferente de 1 a 24');
  assert.equal(ctx.simItems[23].de, 24, 'A 24ª parcela deve estar no índice 24');
  assert.equal(ctx.getMonthName(ctx.simItems[23].de), 'Set/2028');
});

test('calendar: getMaxActiveMonth expande além do padrão quando há parcelas longas', () => {
  const ctx = loadAppContext();
  ctx.simItems = [];
  ctx.addSimulation('Curso', 100, 1, 24);

  const maxMonth = ctx.getMaxActiveMonth();
  assert.ok(maxMonth >= 24, 'getMaxActiveMonth deve ser pelo menos 24');
});
