const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('import: parseFaturaCSV com formato Nubank padrão (vírgula e ponto)', () => {
  const ctx = loadAppContext();
  const csvData = `date,title,amount
2026-10-02,Supermercado Pão de Açúcar,120.50
2026-10-03,Tennis One 01/10,157.07
2026-10-04,Pagamento de fatura,-2500.00`;

  const items = ctx.parseFaturaData(csvData, 'csv');
  assert.equal(items.length, 3);
  
  assert.equal(items[0].desc, 'Supermercado Pão de Açúcar');
  assert.equal(items[0].val, 120.50);
  assert.equal(items[0].isPayment, false);

  assert.equal(items[1].desc, 'Tennis One 01/10');
  assert.equal(items[1].val, 157.07);
  assert.equal(items[1].curInstallment, 1);
  assert.equal(items[1].totalInstallments, 10);

  assert.equal(items[2].isPayment, true);
});

test('import: parseFaturaCSV com formato ponto-e-vírgula e vírgula decimal (bancos brasileiros)', () => {
  const ctx = loadAppContext();
  const csvData = `Data;Estabelecimento;Valor;Categoria
15/10/2026;Drogaria São Paulo;88,28;Saúde
16/10/2026;Restaurante Almoço;45,00;Alimentação`;

  const items = ctx.parseFaturaData(csvData, 'csv');
  assert.equal(items.length, 2);
  assert.equal(items[0].desc, 'Drogaria São Paulo');
  assert.equal(items[0].val, 88.28);
  assert.equal(items[1].val, 45.00);
});

test('import: parseFaturaOFX padrão bancário', () => {
  const ctx = loadAppContext();
  const ofxData = `<OFX>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261012120000
<TRNAMT>-66.00
<MEMO>Gelatto Borelli
</STMTTRN>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20261013120000
<TRNAMT>-39.80
<MEMO>Shopping Ribeirao
</STMTTRN>
</OFX>`;

  const items = ctx.parseFaturaData(ofxData, 'ofx');
  assert.equal(items.length, 2);
  assert.equal(items[0].desc, 'Gelatto Borelli');
  assert.equal(items[0].val, 66.00);
  assert.equal(items[1].desc, 'Shopping Ribeirao');
  assert.equal(items[1].val, 39.80);
});

test('import: normalização de descrição e detecção de duplicatas exatas e semelhantes', () => {
  const ctx = loadAppContext();
  
  // Itens já existentes na fatura de Outubro (mIdx = 1)
  const existing = [
    { desc: 'Tennis One 1/10', val: 157.07, isBase: true, key: 'Tennis One 1/10__1' },
    { desc: 'Uber', val: 17.50, isBase: true, key: 'Uber__1' },
    { desc: 'Almoço Avulso', val: 45.00, tag: 'extra', isExtra: true }
  ];

  // 1. Mesmo valor e nome similar ("TENNIS ONE 01/10" vs "Tennis One 1/10")
  const match1 = ctx.detectItemMatch({ desc: 'TENNIS ONE 01/10', val: 157.07 }, existing);
  assert.equal(match1.type, 'exact');
  assert.equal(match1.matchedItem.desc, 'Tennis One 1/10');

  // 2. Mesmo valor e substring no nome ("Uber *Trip SP" vs "Uber")
  const match2 = ctx.detectItemMatch({ desc: 'Uber *Trip SP', val: 17.50 }, existing);
  assert.equal(match2.type, 'exact');
  assert.equal(match2.matchedItem.desc, 'Uber');

  // 3. Mesmo valor exato, mas nome totalmente diferente (alerta de possível sobreposição)
  const match3 = ctx.detectItemMatch({ desc: 'Restaurante Por Quilo', val: 45.00 }, existing);
  assert.equal(match3.type, 'similar_val');
  assert.equal(match3.matchedItem.desc, 'Almoço Avulso');

  // 4. Item 100% novo
  const match4 = ctx.detectItemMatch({ desc: 'Cafeteira Nespresso', val: 399.00 }, existing);
  assert.equal(match4.type, 'none');
  assert.equal(match4.matchedItem, null);
});

test('import: detecção de parcelamento inteligente (ex: 1/10, 02/06)', () => {
  const ctx = loadAppContext();

  const info1 = ctx.extractInstallmentInfo('Magazine Luiza 01/10');
  assert.equal(info1.isInstallment, true);
  assert.equal(info1.current, 1);
  assert.equal(info1.total, 10);
  assert.equal(info1.cleanDesc, 'Magazine Luiza');

  const info2 = ctx.extractInstallmentInfo('Zara Brasil - 2 de 5');
  assert.equal(info2.isInstallment, true);
  assert.equal(info2.current, 2);
  assert.equal(info2.total, 5);

  const info3 = ctx.extractInstallmentInfo('Supermercado Extra');
  assert.equal(info3.isInstallment, false);
});
