const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

test('finishing-items: isItemFinishing identifica parcelas que encerram (ex: 4/4, 2/2, 10/10)', () => {
  const ctx = loadAppContext();

  // Caso do usuário: Tennis One 4/4
  const res1 = ctx.isItemFinishing({ desc: 'Tennis One 4/4', val: 49.99 }, 2);
  assert.equal(res1.finishing, true);
  assert.equal(res1.current, 4);
  assert.equal(res1.total, 4);
  assert.equal(res1.label, '4/4');
  assert.equal(res1.cleanDesc, 'Tennis One');

  // Variações de formato
  const res2 = ctx.isItemFinishing({ desc: 'Casas Bahia 10/10', val: 203.95 }, 1);
  assert.equal(res2.finishing, true);
  assert.equal(res2.label, '10/10');
  assert.equal(res2.cleanDesc, 'Casas Bahia');

  const res3 = ctx.isItemFinishing({ desc: 'Zara Brasil 5 de 5', val: 120.00 }, 1);
  assert.equal(res3.finishing, true);
  assert.equal(res3.label, '5/5');

  const res4 = ctx.isItemFinishing({ desc: 'Black Creek 4/4 (2)', val: 64.48 }, 2);
  assert.equal(res4.finishing, true);
  assert.equal(res4.label, '4/4');

  // Parcela intermediária (NÃO finaliza)
  const resNot1 = ctx.isItemFinishing({ desc: 'Tennis One 3/4', val: 49.99 }, 1);
  assert.equal(resNot1.finishing, false);

  const resNot2 = ctx.isItemFinishing({ desc: 'Globoplay 8/12', val: 22.90 }, 1);
  assert.equal(resNot2.finishing, false);

  // Gasto avulso (NÃO é parcela)
  const resAvulso = ctx.isItemFinishing({ desc: 'Gelatto Borelli', val: 66.00 }, 1);
  assert.equal(resAvulso.finishing, false);
});

test('finishing-items: isItemFinishing identifica itens recorrentes de período que atingem o último mês', () => {
  const ctx = loadAppContext();

  // Item com período de: 1, ate: 4
  const recurring = { desc: 'Assinatura Semestral', val: 100, de: 1, ate: 4 };

  // Mês 4 é o último
  const resFinal = ctx.isItemFinishing(recurring, 4);
  assert.equal(resFinal.finishing, true);
  assert.equal(resFinal.reason, 'recurring_end');

  // Mês 2 ainda está em andamento
  const resMid = ctx.isItemFinishing(recurring, 2);
  assert.equal(resMid.finishing, false);
});

test('finishing-items: getFinishingItems lista contas e calcula somatória correta no mês vigente e outros meses', () => {
  const ctx = loadAppContext();

  // Mês 2 (Novembro/2026): possui Tennis One 4/4, Converse Dom Pedro 6/6, Bagaggio 2/2, Tennis One 5/5, Black Creek 4/4, Black Creek 4/4 (2)
  const resNov = ctx.getFinishingItems(2);
  assert.equal(resNov.mIdx, 2);
  assert.ok(resNov.count >= 6, `Esperava pelo menos 6 parcelas finalizando em Nov/2026, obteve ${resNov.count}`);

  // Verifica que Tennis One 4/4 está presente
  const tennis4 = resNov.items.find(it => it.desc.includes('Tennis One 4/4'));
  assert.ok(tennis4, 'Tennis One 4/4 deve constar nos lançamentos finalizando');
  assert.equal(tennis4.val, 49.99);
  assert.equal(tennis4.parcelLabel, '4/4');

  // Verifica somatória positiva e ordenada por valor descrescente
  assert.ok(resNov.totalVal > 400, 'Somatória das parcelas finalizando deve ser calculada');
  for (let i = 0; i < resNov.items.length - 1; i++) {
    assert.ok(resNov.items[i].val >= resNov.items[i + 1].val, 'Itens devem estar ordenados por valor decrescente');
  }

  // Mês 1 (Outubro/2026): possui Casa Almeida 5/5, Casas Bahia 10/10, etc.
  const resOut = ctx.getFinishingItems(1);
  assert.ok(resOut.count > 0);
  assert.ok(resOut.items.some(it => it.desc.includes('Casa Almeida 5/5')));
  assert.ok(resOut.items.some(it => it.desc.includes('Casas Bahia 10/10')));
});

test('finishing-items: renderFinishingItemsCard e renderGastosView geram o card em evidência com somatória', () => {
  const ctx = loadAppContext();

  ctx.renderGastosView();

  const card = ctx.document.getElementById('finishingItemsCard');
  assert.ok(card.innerHTML.includes('Contas &amp; Parcelas Finalizando'), 'Deve conter cabeçalho de parcelas finalizando');
  assert.ok(card.innerHTML.includes('Somatória Liberada:'), 'Deve exibir somatória em evidência');
  assert.ok(card.innerHTML.includes('Tennis One'), 'Deve listar itens que finalizam no mês de referência');
});
