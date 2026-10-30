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
