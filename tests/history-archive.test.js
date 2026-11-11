const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

function seed(ctx, extra) {
  ctx.purchHist = [
    { name: 'Nutri 2027', date: '11/11/2026', cashPrice: 3960, instTotal: 3960, winN: 12, winner: 'parc', savings: 316.56, miles: 1739, mOff: 2 },
    { name: 'Sapateira', date: '11/11/2026', cashPrice: 792.97, instTotal: 792.97, winN: 12, winner: 'parc', savings: 63.39, miles: 348, mOff: 2 },
    { name: 'Máquina de lavar', date: '11/11/2026', cashPrice: 2749, instTotal: 2749, winN: 10, winner: 'parc', savings: 192.61, miles: 1207, mOff: 2 }
  ];
  if (extra) extra(ctx);
  ctx.renderHist();
}

test('arquivo: archiveHist marca, tira da seleção e persiste', () => {
  const ctx = loadAppContext();
  seed(ctx, (c) => { c.histSel[0] = true; c.comboN[0] = 6; });

  const ok = ctx.archiveHist(0);

  assert.equal(ok, true);
  assert.equal(ctx.purchHist[0].archived, true);
  assert.ok(ctx.purchHist[0].archivedAt, 'guarda a data do arquivamento');
  assert.equal(ctx.histSel[0], undefined);
  assert.equal(ctx.comboN[0], undefined);
  const stored = JSON.parse(ctx.localStorage.getItem('pv4_hist'));
  assert.equal(stored[0].archived, true);
});

test('arquivo: unarchiveHist devolve a simulação ao histórico ativo', () => {
  const ctx = loadAppContext();
  seed(ctx);
  ctx.archiveHist(0, true);

  ctx.unarchiveHist(0);

  assert.equal(ctx.purchHist[0].archived, false);
  assert.equal('archivedAt' in ctx.purchHist[0], false);
});

test('arquivo: renderHist separa ativas e arquivadas com contagem', () => {
  const ctx = loadAppContext();
  seed(ctx);
  ctx.archiveHist(1, true);
  ctx.renderHist();

  const list = ctx.document.getElementById('histList').innerHTML;
  const sub = ctx.document.getElementById('histSub').textContent;

  assert.match(sub, /2 ativas/);
  assert.match(sub, /1 arquivada/);
  assert.match(list, /Arquivadas \(1\)/);
  assert.match(list, /class="hitem archived"/);
  // Ativas continuam com checkbox de combinação; arquivada não.
  const activeChecks = (list.match(/hcheck-input/g) || []).length;
  assert.equal(activeChecks, 2);
});

test('arquivo: simulação aplicada mostra vínculo com as faturas', () => {
  const ctx = loadAppContext();
  seed(ctx);

  ctx.markHistApplied(0, { n: 12, per: 330, start: 2, group: 'sim_123' });
  ctx.renderHist();

  const item = ctx.purchHist[0];
  assert.ok(item.appliedAt);
  assert.equal(item.appliedN, 12);
  assert.equal(item.appliedPer, 330);
  assert.equal(item.appliedStart, 2);
  const list = ctx.document.getElementById('histList').innerHTML;
  assert.match(list, /Aplicada às faturas/);
  assert.match(list, /12x de/);
});

test('arquivo: compra combinada ignora simulações arquivadas', () => {
  const ctx = loadAppContext();
  seed(ctx);
  ctx.archiveHist(0, true);
  ctx.histSel[0] = true; // seleção forçada (não deve entrar)
  ctx.histSel[1] = true;

  const selected = ctx.getSelectedHistItems();
  assert.equal(selected.length, 1);
  assert.equal(selected[0].name, 'Sapateira');
});

test('arquivo: limpar arquivadas remove só as arquivadas', () => {
  const ctx = loadAppContext();
  seed(ctx);
  ctx.archiveHist(0, true);
  ctx.archiveHist(2, true);
  ctx.confirm = () => true;

  ctx.clearArchivedHist();

  assert.equal(ctx.purchHist.length, 1);
  assert.equal(ctx.purchHist[0].name, 'Sapateira');
});

test('arquivo: itens antigos sem o campo archived continuam ativos', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [{ name: 'Antiga', date: '01/11/2026', cashPrice: 100, instTotal: 100, winN: 2, winner: 'parc', savings: 1, miles: 10, mOff: 2 }];
  ctx.renderHist();

  const list = ctx.document.getElementById('histList').innerHTML;
  const sub = ctx.document.getElementById('histSub').textContent;
  assert.match(sub, /1 ativa/);
  assert.ok(!/Arquivadas/.test(list));
  assert.match(list, /Antiga/);
});
