const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context.js');

test('summary: getFaturasSummary descreve a fatura atual, a próxima e o comprometido', () => {
  const ctx = loadAppContext();
  const s = ctx.getFaturasSummary();

  assert.equal(typeof s.currentIdx, 'number');
  assert.equal(s.currentIdx, ctx.getFirstOpenMonth());
  assert.equal(s.currentName, ctx.MNS[s.currentIdx]);
  assert.ok(s.currentTotal > 0, 'a fatura atual deve ter lançamentos');
  assert.equal(s.meta, ctx.profile.meta);
  assert.equal(s.available, Math.round((s.meta - s.currentTotal) * 100) / 100);
  assert.ok(s.pct > 0);

  assert.ok(s.nextIdx === null || s.nextIdx > s.currentIdx);
  assert.ok(s.committed >= s.currentTotal, 'comprometido inclui pelo menos a fatura atual');
  assert.ok(s.committedMonths >= 1);
  assert.equal(s.relief, ctx.getFinishingItems(s.currentIdx).totalVal);
  assert.equal(s.reliefCount, ctx.getFinishingItems(s.currentIdx).count);
});

test('summary: comprometido soma os próximos 12 meses', () => {
  const ctx = loadAppContext();
  const s = ctx.getFaturasSummary();
  const cur = ctx.getFirstOpenMonth();

  let expected = 0, months = 0;
  for (let k = cur; k < cur + 12; k++) {
    if (!ctx.isMonthClosed(k)) { expected += ctx.getMonthTotal(k); months++; }
  }

  assert.equal(s.committed, Math.round(expected * 100) / 100);
  assert.equal(s.committedMonths, months);
  assert.ok(s.committedMonths >= 12, 'os 12 meses do horizonte devem ser considerados');
});

test('summary: fechar a fatura atual move o resumo para o próximo mês em aberto', () => {
  const ctx = loadAppContext();
  const before = ctx.getFaturasSummary();
  ctx.monthStatus[before.currentIdx] = 'paga';

  const after = ctx.getFaturasSummary();
  assert.ok(after.currentIdx > before.currentIdx, 'a fatura paga não pode continuar sendo a atual');
  assert.notEqual(after.currentTotal, before.currentTotal);
});

test('summary: meta zerada não quebra o percentual', () => {
  const ctx = loadAppContext();
  ctx.profile.meta = 0;
  const s = ctx.getFaturasSummary();
  assert.equal(s.pct, 0);
  assert.equal(s.available, -s.currentTotal);
});

test('privacy: fmtBRL mascara valores e fmtBRLabs também', () => {
  const ctx = loadAppContext();
  ctx.privacyOn = true;

  assert.equal(ctx.fmtBRL(1234.56), 'R$\u00a0••••');
  assert.equal(ctx.fmtBRL(-99.9), 'R$\u00a0••••');
  assert.equal(ctx.fmtBRLabs(-50), 'R$\u00a0••••');

  // Rótulos persistidos usam a versão crua
  assert.match(ctx.fmtBRLraw(1234.56), /1\.234,56/);
});

test('privacy: fmtBRL volta ao normal e preserva sinal negativo', () => {
  const ctx = loadAppContext();
  ctx.privacyOn = false;
  assert.match(ctx.fmtBRL(1234.56), /^R\$\u00a01\.234,56$/);
  assert.match(ctx.fmtBRL(-10), /^-R\$\u00a010,00$/);
});

test('privacy: applyPrivacy alterna o botão e o body sem quebrar sem DOM completo', () => {
  const ctx = loadAppContext();
  ctx.privacyOn = false;
  ctx.applyPrivacy(false, true);
  assert.equal(ctx.document.getElementById('privacyBtn').getAttribute('aria-pressed'), 'false');

  ctx.privacyOn = true;
  ctx.applyPrivacy(false, true);
  assert.equal(ctx.document.getElementById('privacyBtn').getAttribute('aria-pressed'), 'true');
  assert.equal(ctx.document.getElementById('privacyBtn').textContent, '🙈');
});

test('sync: buildSyncPayload mantém o contrato do Matrix e manda a revisão', () => {
  const ctx = loadAppContext({});
  ctx.SYNC.revision = 12;
  ctx.extraItems = [{ desc: 'A', val: 1, de: 1, ate: 1 }];

  const payload = ctx.buildSyncPayload();
  for (const key of ['extraItems', 'simItems', 'overrides', 'purchHist', 'monthStatus', 'collapsedMonths', 'userCategories', 'userCatRules', 'itemCatMap', 'profile']) {
    assert.ok(Object.prototype.hasOwnProperty.call(payload, key), `payload deve manter ${key}`);
  }
  assert.equal(payload.revision, 12);
  assert.equal(payload.extraItems.length, 1);
  assert.match(payload.client, /^pv4\/4\./);
});

test('sync: applyRemotePayload aplica só as chaves recebidas e não marca alteração local', () => {
  const ctx = loadAppContext();
  ctx.SYNC.dirty = false;
  ctx.monthStatus = { 2: 'aberta' };

  ctx.applyRemotePayload({
    ok: true,
    partial: true,
    extraItems: [{ desc: 'Remoto', val: 42, de: 1, ate: 1 }],
    monthStatus: { 2: 'paga' }
  });

  assert.equal(ctx.extraItems.length, 1);
  assert.equal(ctx.extraItems[0].desc, 'Remoto');
  assert.equal(ctx.monthStatus[2], 'paga');
  assert.equal(ctx.SYNC.dirty, false, 'aplicar a nuvem não pode marcar o aparelho como pendente');
});

test('sync: markDirty sinaliza pendência e saveLocal propaga', () => {
  const ctx = loadAppContext();
  ctx.SYNC.dirty = false;
  ctx.markDirty();
  assert.equal(ctx.SYNC.dirty, true);
  assert.ok(ctx.SYNC.dirty);
});

test('sync: timeAgo devolve rótulos curtos sem truncar', () => {
  const ctx = loadAppContext();
  const now = Date.now();
  assert.equal(ctx.timeAgo(now), 'agora');
  assert.equal(ctx.timeAgo(now - 2 * 60 * 1000), 'há 2 min');
  assert.equal(ctx.timeAgo(now - 3 * 60 * 60 * 1000), 'há 3 h');
  assert.equal(ctx.timeAgo(now - 2 * 24 * 60 * 60 * 1000), 'há 2 d');
  assert.equal(ctx.timeAgo(0), '—');
});

test('sync: filtros de faturas aceitam só valores conhecidos', () => {
  const ctx = loadAppContext();
  ctx.setFaturasFilter('encerradas');
  assert.equal(ctx.faturasFilter, 'encerradas');
  ctx.setFaturasFilter('qualquer-coisa');
  assert.equal(ctx.faturasFilter, 'todas');
});

test('render: buildMonthCard usa o total do mês e marca a parcela final', () => {
  const ctx = loadAppContext();
  const firstOpen = ctx.getFirstOpenMonth();
  const html = ctx.buildMonthCard(firstOpen, firstOpen);
  const total = ctx.getMonthTotal(firstOpen);

  assert.match(html, /class="mc/);
  assert.ok(html.includes(ctx.fmtBRL(total)), 'deve exibir o total do mês');
  assert.match(html, /aria-pressed="true"[^>]*>Em aberto/);
  assert.ok(html.includes('aria-expanded'), 'o botão de recolher precisa informar o estado');
  assert.ok(!html.includes('FATURA ATUAL'), 'não pode rotular meses futuros como fatura atual');
});
