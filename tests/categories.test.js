const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('categories: classificação automática por palavras-chave padrão', () => {
  const ctx = loadAppContext();

  assert.equal(ctx.getItemCategory('Uber *Trip 123', 1).id, 'transp');
  assert.equal(ctx.getItemCategory('IFOOD *RESTAURANTE', 1).id, 'alim');
  assert.equal(ctx.getItemCategory('NETFLIX.COM', 1).id, 'servicos');
  assert.equal(ctx.getItemCategory('DROGASIL FARMACIA', 1).id, 'saude');
  assert.equal(ctx.getItemCategory('Item Desconhecido 999', 1).id, 'outros');
});

test('categories: regra personalizada do usuário tem precedência sobre regra padrão', () => {
  const ctx = loadAppContext();

  // "Posto" normalmente seria transp, mas o usuário cria uma regra apontando para compras
  ctx.userCatRules.push({ match: 'posto', cat: 'compras' });

  assert.equal(ctx.getItemCategory('Posto Shell', 1).id, 'compras');
});

test('categories: sobrescrita global (itemCatMap[desc]) tem precedência sobre regras automáticas', () => {
  const ctx = loadAppContext();

  // Sobrescreve Uber especificamente para casa
  ctx.itemCatMap['Uber *Trip 123'] = 'casa';

  assert.equal(ctx.getItemCategory('Uber *Trip 123', 1).id, 'casa');
  assert.equal(ctx.getItemCategory('Uber *Viagem Aeroporto', 1).id, 'transp');
});

test('categories: sobrescrita específica por mês (mIdx::desc) tem prioridade máxima', () => {
  const ctx = loadAppContext();

  ctx.itemCatMap['Loja Especial'] = 'compras';
  ctx.itemCatMap['1::Loja Especial'] = 'casa';

  assert.equal(ctx.getItemCategory('Loja Especial', 1).id, 'casa', 'Mês 1 deve usar a sobrescrita específica do mês');
  assert.equal(ctx.getItemCategory('Loja Especial', 2).id, 'compras', 'Mês 2 deve usar a sobrescrita global');
});

test('categories: reclassifyItem com applyToAll limpa todas as sobrescritas específicas de meses anteriores e futuros', () => {
  const ctx = loadAppContext();

  // Simula edições locais prévias em múltiplos meses
  ctx.itemCatMap['0::Serviço Recorrente'] = 'casa';
  ctx.itemCatMap['1::Serviço Recorrente'] = 'saude';
  ctx.itemCatMap['2::Serviço Recorrente'] = 'alim';

  // O usuário no mês 2 decide que quer aplicar 'compras' a TODAS as faturas
  ctx.reclassifyItem('Serviço Recorrente', 2, 'compras', true);

  // Verifica que o mapa global foi definido
  assert.equal(ctx.itemCatMap['Serviço Recorrente'], 'compras');

  // Verifica que TODAS as sobrescritas locais foram limpas
  assert.equal(ctx.itemCatMap['0::Serviço Recorrente'], undefined);
  assert.equal(ctx.itemCatMap['1::Serviço Recorrente'], undefined);
  assert.equal(ctx.itemCatMap['2::Serviço Recorrente'], undefined);

  // E todos os meses agora retornam 'compras'
  assert.equal(ctx.getItemCategory('Serviço Recorrente', 0).id, 'compras');
  assert.equal(ctx.getItemCategory('Serviço Recorrente', 1).id, 'compras');
  assert.equal(ctx.getItemCategory('Serviço Recorrente', 2).id, 'compras');
});

test('categories: suporte a categorias personalizadas criadas pelo usuário', () => {
  const ctx = loadAppContext();

  ctx.userCategories.push({ id: 'lazer_viagem', name: 'Lazer e Viagens', icon: '✈️' });
  ctx.userCatRules.push({ match: 'cvc turismo', cat: 'lazer_viagem' });

  const cat = ctx.getItemCategory('CVC Turismo Passagem', 1);
  assert.equal(cat.id, 'lazer_viagem');
  assert.equal(cat.name, 'Lazer e Viagens');
});
