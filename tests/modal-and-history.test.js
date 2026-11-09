const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('modal: closeModal restaura o botão de salvar padrão', () => {
  const ctx = loadAppContext();
  const btn = ctx.document.getElementById('modalSaveBtn');

  btn.onclick = 'confirmSimAdd()';
  btn.textContent = '📅 Confirmar e Adicionar';

  ctx.closeModal();

  assert.equal(btn.textContent, '💾 Salvar');
  assert.match(String(btn.onclick || btn.getAttribute('onclick')), /saveModal/);
});

test('history: openHistToEdit não adiciona nova entrada no histórico', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Geladeira', cashPrice: 3000, winner: 'vista', winN: 1, savings: 200, miles: 500, date: '01/10/2026' }
  ];

  const initialCount = ctx.purchHist.length;
  ctx.openHistToEdit(0);

  assert.equal(ctx.purchHist.length, initialCount, 'Histórico não deve crescer ao reabrir uma simulação');
});

test('carousel: showTab aplica animação direcional de carrossel (slide-next e slide-prev)', () => {
  const ctx = loadAppContext();

  // Inicia na aba fatura (índice 0)
  ctx.showTab('fatura');
  const faturaTab = ctx.document.getElementById('tab-fatura');
  assert.ok(faturaTab.classList.contains('on'));

  // Avança para gastos (índice 1 > 0) -> slide-next
  ctx.showTab('gastos');
  const gastosTab = ctx.document.getElementById('tab-gastos');
  assert.ok(gastosTab.classList.contains('on'));
  assert.ok(gastosTab.classList.contains('slide-next'), 'Deve conter classe slide-next ao avançar de aba');

  // Volta para fatura (índice 0 < 1) -> slide-prev
  ctx.showTab('fatura');
  assert.ok(faturaTab.classList.contains('on'));
  assert.ok(faturaTab.classList.contains('slide-prev'), 'Deve conter classe slide-prev ao retroceder de aba');

  // Funções de navegação do carrossel (nextTab e prevTab)
  const canNext = ctx.nextTab();
  assert.equal(canNext, true);
  assert.equal(ctx._currentTabName, 'gastos');

  const canPrev = ctx.prevTab();
  assert.equal(canPrev, true);
  assert.equal(ctx._currentTabName, 'fatura');
});
