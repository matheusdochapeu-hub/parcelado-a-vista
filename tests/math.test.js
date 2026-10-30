const test = require('node:test');
const assert = require('node:assert/strict');
const { loadAppContext } = require('./helpers/load-app-context');

test('parseNum: sanitização e conversão de valores PT-BR', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.parseNum('1200,50'), 1200.50);
  assert.equal(ctx.parseNum('500.25'), 500.25);
  assert.equal(ctx.parseNum(100), 100);
  assert.equal(ctx.parseNum(null), 0);
  assert.equal(ctx.parseNum(''), 0);
  assert.equal(ctx.parseNum('abc'), 0);
});

test('npv: cálculo de valor presente das parcelas', () => {
  const ctx = loadAppContext();
  const base = 1000;
  const total = 1000;
  const n = 10;
  const ar = 0.12;

  const res = ctx.npv(base, total, n, ar);
  assert.ok(res.pv < base, 'O valor presente das parcelas deve ser inferior ao total à vista');
  assert.ok(res.gain > 0, 'O ganho de rendimento da reserva deve ser positivo');
  assert.equal(res.per, 100, 'Parcela de 1000 em 10x deve ser 100');
});

test('miles e milesVal: conversão em dólares e cotação de milhas', () => {
  const ctx = loadAppContext();
  ctx.profile.cambio = 5.00;
  ctx.profile.milhas = 2.0;
  ctx.profile.milhaVal = 0.03;

  const m = ctx.miles(1000);
  assert.equal(m, 400);

  const val = ctx.milesVal(m);
  assert.equal(val, 12);
});

test('overKey: gera chave única consistente para mês e descrição', () => {
  const ctx = loadAppContext();
  assert.equal(ctx.overKey('Netflix', 2), 'Netflix__2');
});
