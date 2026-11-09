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

test('history: openHistToEdit não adiciona nova entrada no histórico e ativa modo edição', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Geladeira', cashPrice: 3000, winner: 'vista', winN: 1, savings: 200, miles: 500, date: '01/10/2026' }
  ];

  const initialCount = ctx.purchHist.length;
  ctx.openHistToEdit(0);

  assert.equal(ctx.purchHist.length, initialCount, 'Histórico não deve crescer ao reabrir uma simulação');
  assert.equal(ctx.editingHistIdx, 0, 'Deve registrar o índice 0 como item em edição');
  assert.equal(ctx.document.getElementById('pName').value, 'Geladeira');
  assert.equal(ctx.document.getElementById('pCash').value, 3000);
  assert.equal(ctx.document.getElementById('calcEditBanner').style.display, 'flex');
  assert.match(ctx.document.getElementById('btnMainCalc').innerHTML, /Salvar Alterações/);
});

test('history: calculate atualiza simulação em edição in-place sem criar duplicata', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Ar Condicionado', cashPrice: 2228, cashRaw: 2228, winner: 'parc', winN: 8, savings: 80, miles: 978, date: '09/11/2026' }
  ];

  ctx.openHistToEdit(0);
  assert.equal(ctx.purchHist.length, 1);

  // Altera os valores simulando a edição do usuário
  ctx.document.getElementById('pName').value = 'Ar Condicionado Pro';
  ctx.document.getElementById('pCash').value = '2468,00';
  ctx.document.getElementById('pMaxN').value = '8';

  // Executa o cálculo/salvamento
  ctx.calculate();

  // Histórico deve continuar com apenas 1 item atualizado
  assert.equal(ctx.purchHist.length, 1, 'Não deve criar item duplicado ao salvar edição');
  assert.equal(ctx.purchHist[0].name, 'Ar Condicionado Pro');
  assert.equal(ctx.purchHist[0].cashPrice, 2468);
  assert.equal(ctx.purchHist[0].date, '09/11/2026', 'Deve preservar a data original');
});

test('history: saveAsNewCalc salva como nova simulação mantendo a anterior intacta', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Item Original', cashPrice: 1000, cashRaw: 1000, winner: 'vista', winN: 1, savings: 50, miles: 100, date: '01/10/2026' }
  ];

  ctx.openHistToEdit(0);
  ctx.document.getElementById('pName').value = 'Item Variante';
  ctx.document.getElementById('pCash').value = '1200';

  ctx.saveAsNewCalc();

  assert.equal(ctx.purchHist.length, 2, 'Deve conter duas simulações');
  assert.equal(ctx.purchHist[0].name, 'Item Variante');
  assert.equal(ctx.purchHist[1].name, 'Item Original');
  assert.equal(ctx.editingHistIdx, null, 'Deve resetar modo edição após salvar nova');
});

test('history: cancelHistEdit desativa modo edição e delHist reajusta índices', () => {
  const ctx = loadAppContext();
  ctx.purchHist = [
    { name: 'Item 0', cashPrice: 500, cashRaw: 500 },
    { name: 'Item 1', cashPrice: 600, cashRaw: 600 }
  ];

  ctx.openHistToEdit(1);
  assert.equal(ctx.editingHistIdx, 1);

  // Cancela edição limpando o formulário
  ctx.cancelHistEdit(false);
  assert.equal(ctx.editingHistIdx, null);
  assert.equal(ctx.document.getElementById('calcEditBanner').style.display, 'none');
  assert.equal(ctx.document.getElementById('pName').value, '');

  // Reabre item 1 e exclui item 0 -> índice deve decrementar para 0
  ctx.openHistToEdit(1);
  assert.equal(ctx.editingHistIdx, 1);
  ctx.confirm = () => true;
  ctx.delHist(0);
  assert.equal(ctx.editingHistIdx, 0, 'Índice de edição deve ajustar após exclusão anterior');
  assert.equal(ctx.purchHist.length, 1);
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
