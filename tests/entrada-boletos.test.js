const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

function setInputs(ctx, values) {
  for (const [id, value] of Object.entries(values)) {
    ctx.document.getElementById(id).value = String(value);
  }
}

function prepararCalculadora(ctx) {
  ctx.profile.selic = 13.75;
  ctx.profile.cambio = 5.01;
  ctx.profile.milhas = 2.2;
  ctx.profile.milhaVal = 0.03;
  ctx.profile.meta = 3000;
  ctx.useMiles = true;
  ctx.useBudget = false;
  setInputs(ctx, {
    pName: 'Cobertura telhado + telha sanduiche',
    pCash: '11500',
    pDisc: '0',
    pCashMethod: 'entrada',
    pEntrada: '4600',
    pBoletos: '2',
    pBoletoIntervalo: '30',
    pInst: '12600',
    pMaxN: '10',
    pInvest: 'selic',
    pMonth: '3'
  });
}

test('entrada: getEntradaPlan calcula boleto e valida o fluxo', () => {
  const ctx = loadAppContext();
  setInputs(ctx, { pCash: '11500', pDisc: '0', pEntrada: '4600', pBoletos: '2', pBoletoIntervalo: '30' });

  const plan = ctx.getEntradaPlan();
  assert.equal(plan.valid, true);
  assert.equal(plan.entrada, 4600);
  assert.equal(plan.n, 2);
  assert.equal(plan.per, 3450);
  assert.equal(plan.total, 11500);

  ctx.document.getElementById('pEntrada').value = '11500';
  assert.equal(ctx.getEntradaPlan().valid, false, 'entrada igual ao total não pode');
});

test('entrada: entradaPV desconta os boletos pela taxa mensal', () => {
  const ctx = loadAppContext();
  setInputs(ctx, { pCash: '11500', pDisc: '0', pEntrada: '4600', pBoletos: '2', pBoletoIntervalo: '30' });
  const plan = ctx.getEntradaPlan();
  const mr = Math.pow(1.1375, 1 / 12) - 1;

  const pv = ctx.entradaPV(plan, mr);
  assert.ok(Math.abs(pv - 11389.87) < 0.05, 'PV esperado ~11.389,87; obtido ' + pv.toFixed(2));
  assert.ok(pv < plan.total, 'PV tem que ser menor que o total nominal');
});

test('entrada: calculate compara entrada+boletos com 10x no cartão', () => {
  const ctx = loadAppContext();
  prepararCalculadora(ctx);

  ctx.calculate(true);

  const d = ctx.lastCalc;
  assert.equal(d.isEntradaCash, true);
  assert.equal(d.entrada, 4600);
  assert.equal(d.boletos, 2);
  assert.equal(d.entradaPer, 3450);
  assert.ok(Math.abs(d.cPv - 11389.87) < 0.05, 'PV da entrada+boletos');
  assert.ok(Math.abs(d.cNet - 11389.87) < 0.05, 'entrada não acumula milhas');
  assert.ok(Math.abs(d.bestNet - 11717.19) < 0.05, 'PV do 10x com milhas');
  assert.ok(Math.abs(d.savings - 327.32) < 0.05, 'economia esperada ~327,32');
  assert.equal(d.vistaWins, true);
});

test('entrada: calculate recusa entrada maior/igual ao valor à vista', () => {
  const ctx = loadAppContext();
  prepararCalculadora(ctx);
  ctx.document.getElementById('pEntrada').value = '12000';

  ctx.calculate(true);

  assert.ok(!ctx.lastCalc, 'não deve calcular com plano inválido');
  assert.match(ctx.document.getElementById('resultArea').innerHTML, /entrada/i);
});

test('entrada: renderResults mostra o formato entrada + boletos', () => {
  const ctx = loadAppContext();
  prepararCalculadora(ctx);
  ctx.calculate(true);

  const html = ctx.document.getElementById('resultArea').innerHTML;
  assert.match(html, /Entrada \+ boletos/);
  assert.match(html, /2x R\$\s?3\.450,00/);
  assert.match(html, /a cada 30 dias/);
});

test('entrada: updateCashMethodHint mostra/esconde os campos', () => {
  const ctx = loadAppContext();
  const box = ctx.document.getElementById('entradaFields');
  const sel = ctx.document.getElementById('pCashMethod');

  sel.value = 'entrada';
  ctx.updateCashMethodHint();
  assert.equal(box.style.display, '');

  sel.value = 'pix';
  ctx.updateCashMethodHint();
  assert.equal(box.style.display, 'none');
});

test('entrada: histórico guarda e restaura entrada, boletos e intervalo', () => {
  const ctx = loadAppContext();
  prepararCalculadora(ctx);
  ctx.calculate(false);

  const item = ctx.purchHist[0];
  assert.equal(item.cashMethod, 'entrada');
  assert.equal(item.entrada, 4600);
  assert.equal(item.boletos, 2);
  assert.equal(item.boletoInterval, 30);

  ctx.document.getElementById('pEntrada').value = '';
  ctx.openHistToEdit(0);
  assert.equal(String(ctx.document.getElementById('pEntrada').value), '4600');
  assert.equal(String(ctx.document.getElementById('pBoletos').value), '2');
  assert.equal(String(ctx.document.getElementById('pBoletoIntervalo').value), '30');
});

test('fatura inicial: padrão é a fatura que recebe a compra (após o dia 9)', () => {
  const ctx = loadAppContext();
  const cur = ctx.getCurrentMonthIndex();
  const first = ctx.getFirstOpenMonth();
  const expected = Math.max(cur + (new Date().getDate() >= 10 ? 1 : 0), first);

  assert.equal(ctx.getDefaultInvoiceMonth(), expected);
  assert.ok(ctx.getDefaultInvoiceMonth() >= first);
});

test('fatura inicial: seletor não quebra quando o mês corrente está fechado', () => {
  const ctx = loadAppContext();
  const cur = ctx.getCurrentMonthIndex();
  ctx.monthStatus[cur] = 'fechada';
  ctx.monthStatus[cur + 1] = 'fechada';

  assert.doesNotThrow(() => ctx.updateMonthSelects());
});

test('fatura inicial: padrão é a fatura da compra, não a primeira opção', () => {
  const ctx = loadAppContext();
  ctx.document.getElementById('pMonth').value = '1';
  ctx._pMonthUserSet = false;

  ctx.updateMonthSelects();

  const def = ctx.getDefaultInvoiceMonth();
  const details = ctx._cycleDetails || [];
  assert.ok(def >= 2, 'o padrão não pode ser Out/2026');
  assert.equal(ctx.document.getElementById('pMonthHint').textContent, details[def] || '');
});

test('fatura inicial: escolha do usuário é preservada', () => {
  const ctx = loadAppContext();
  ctx.document.getElementById('pMonth').value = '1';
  ctx._pMonthUserSet = true;

  ctx.updateMonthSelects();

  const details = ctx._cycleDetails || [];
  assert.equal(ctx.document.getElementById('pMonthHint').textContent, details[1]);
});
