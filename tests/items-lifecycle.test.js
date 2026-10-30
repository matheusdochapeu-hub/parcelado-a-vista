const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('lifecycle: exclusão em um mês ajusta o intervalo ou divide o item recorrente', () => {
  const ctx = loadAppContext();
  
  ctx.extraItems = [
    { desc: 'Internet', val: 100, de: 1, ate: 4, tag: 'extra', isExtra: true }
  ];

  ctx.deleteOrSplitExtraItem(0, 1);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 2);
  assert.equal(ctx.extraItems[0].ate, 4);

  ctx.deleteOrSplitExtraItem(0, 4);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 2);
  assert.equal(ctx.extraItems[0].ate, 3);

  ctx.deleteOrSplitExtraItem(0, 2);
  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].de, 3);
  assert.equal(ctx.extraItems[0].ate, 3);

  ctx.deleteOrSplitExtraItem(0, 3);
  assert.equal(ctx.extraItems.length, 0);
});

test('lifecycle: exclusão no meio do intervalo divide em dois itens', () => {
  const ctx = loadAppContext();
  ctx.extraItems = [
    { desc: 'Assinatura', val: 50, de: 1, ate: 5, tag: 'extra', isExtra: true }
  ];

  ctx.deleteOrSplitExtraItem(0, 3);
  assert.equal(ctx.extraItems.length, 2);
  assert.equal(ctx.extraItems[0].de, 1);
  assert.equal(ctx.extraItems[0].ate, 2);
  assert.equal(ctx.extraItems[1].de, 4);
  assert.equal(ctx.extraItems[1].ate, 5);
});
