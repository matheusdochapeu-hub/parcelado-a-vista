const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('replication: buildNextInstallmentDesc incrementa corretamente parcelas em múltiplos formatos', () => {
  const ctx = loadAppContext();

  assert.equal(
    ctx.buildNextInstallmentDesc('Shopee *Samsung - Parcela 1/10', 2, 10),
    'Shopee *Samsung - Parcela 2/10'
  );
  assert.equal(
    ctx.buildNextInstallmentDesc('Shopee *Samsung - Parcela 1/10', 10, 10),
    'Shopee *Samsung - Parcela 10/10'
  );

  // Preserva dois dígitos (01/10 -> 02/10)
  assert.equal(
    ctx.buildNextInstallmentDesc('Shopee *Samsung - Parcela 01/10', 2, 10),
    'Shopee *Samsung - Parcela 02/10'
  );
  assert.equal(
    ctx.buildNextInstallmentDesc('Shopee *Samsung - Parcela 01/10', 10, 10),
    'Shopee *Samsung - Parcela 10/10'
  );

  // Formato direto sem a palavra "Parcela"
  assert.equal(
    ctx.buildNextInstallmentDesc('Máquina de lavar Eletrolux 1/10', 2, 10),
    'Máquina de lavar Eletrolux 2/10'
  );

  // Formato com parênteses (02/06 -> 03/06)
  assert.equal(
    ctx.buildNextInstallmentDesc('Mercado Livre (02/06)', 3, 6),
    'Mercado Livre (03/06)'
  );
});

test('replication: openReplicateModal abre o modal e updateRepPreview monta o resumo', () => {
  const ctx = loadAppContext();
  ctx.extraItems = [
    { desc: 'Shopee *Samsung - Parcela 1/10', val: 225.37, de: 3, ate: 3, tag: 'extra', isExtra: true }
  ];

  // Localiza o índice do item nos itens do mês 3
  const items = ctx.getMonthItems(3);
  const rowIdx = items.findIndex(x => x.desc.includes('Shopee *Samsung'));
  assert.ok(rowIdx !== -1, 'Deve encontrar o item no mês 3');

  // Abre modal de replicação
  ctx.openReplicateModal(rowIdx, 3);

  const repBg = ctx.document.getElementById('repModalBg');
  assert.ok(repBg.classList.contains('on'), 'Modal de replicação deve abrir com a classe on');
  assert.ok(ctx._activeRepData, 'Deve registrar dados da replicação ativa');
  assert.equal(ctx._activeRepData.desc, 'Shopee *Samsung - Parcela 1/10');
  assert.equal(ctx._activeRepData.currentN, 1);
  assert.equal(ctx._activeRepData.val, 225.37);

  const preview = ctx.document.getElementById('repPreviewList');
  assert.ok(preview.innerHTML.includes('Parcela 2/10'), 'Preview deve conter a Parcela 2/10');
  assert.ok(preview.innerHTML.includes('Parcela 10/10'), 'Preview deve conter a Parcela 10/10');
});

test('replication: commitReplication cria as parcelas subsequentes até a última sem duplicar', () => {
  const ctx = loadAppContext();
  // Item inicial no mês 3 (Dez/2026)
  ctx.extraItems = [
    { desc: 'Shopee *Samsung - Parcela 1/10', val: 225.37, de: 3, ate: 3, tag: 'extra', isExtra: true }
  ];

  const items = ctx.getMonthItems(3);
  const rowIdx = items.findIndex(x => x.desc.includes('Shopee *Samsung'));

  ctx.openReplicateModal(rowIdx, 3);
  ctx.commitReplication();

  // Devem existir 10 parcelas no total: a original (1/10) + 9 replicadas (2/10 até 10/10)
  assert.equal(ctx.extraItems.length, 10, 'Deve gerar exatamente 10 itens em extraItems');

  // Verifica meses e descrições das parcelas geradas
  for (let k = 2; k <= 10; k++) {
    const targetMonth = 3 + (k - 1);
    const item = ctx.extraItems.find(x => x.de === targetMonth && x.desc.includes(`Parcela ${k}/10`));
    assert.ok(item, `Deve existir Parcela ${k}/10 no mês ${targetMonth}`);
    assert.equal(item.val, 225.37);
    assert.equal(item.de, targetMonth);
    assert.equal(item.ate, targetMonth);
  }

  // Tenta replicar novamente: não deve gerar duplicatas
  const updatedItems = ctx.getMonthItems(3);
  const updatedIdx = updatedItems.findIndex(x => x.desc.includes('Shopee *Samsung - Parcela 1/10'));
  ctx.openReplicateModal(updatedIdx, 3);
  ctx.commitReplication();
  assert.equal(ctx.extraItems.length, 10, 'Não deve duplicar parcelas já existentes');
});

test('import: projeção de parcelamento gera descrições incrementais por mês', () => {
  const ctx = loadAppContext();
  ctx.currentImportTargetMonth = 3; // Dez/2026
  ctx.currentImportItems = [
    {
      desc: 'Shopee *Samsung - Parcela 1/10',
      val: 225.37,
      isInstallment: true,
      current: 1,
      totalInstallments: 10,
      projectInstallments: true,
      checked: true
    }
  ];

  ctx.commitFaturaImport();

  // Deve ter gerado 10 parcelas sequenciais
  assert.equal(ctx.extraItems.length, 10);
  assert.equal(ctx.extraItems[0].desc, 'Shopee *Samsung - Parcela 1/10');
  assert.equal(ctx.extraItems[0].de, 3);

  assert.equal(ctx.extraItems[1].desc, 'Shopee *Samsung - Parcela 2/10');
  assert.equal(ctx.extraItems[1].de, 4);

  assert.equal(ctx.extraItems[9].desc, 'Shopee *Samsung - Parcela 10/10');
  assert.equal(ctx.extraItems[9].de, 12);
});
