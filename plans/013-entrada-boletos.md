# 013 — Entrada + boletos na calculadora (v4.7.0)

**Data:** 2026-11-19
**Versão:** app `4.7.0` · Service Worker `faturas-pwa-v34`
**Escopo:** Calculadora (`index.html`)

---

## 1. Pedido

Orçamento real recebido:

- À vista: R$ 11.500 (entrada R$ 4.600 + 2 boletos de R$ 3.450 em 30/60 dias);
- A prazo: R$ 12.600 em 10x de R$ 1.260.

> “Adicionar um modo ‘Entrada + boletos’ nativo na calculadora (entrada, nº de boletos e
> prazo) para ela comparar exatamente esse formato.”

O modo “Forma do à vista” só tinha **Cartão 1x** e **PIX**, ambos pagamento único. O fluxo
escalonado era aproximado (“valor à vista” todo hoje) ou calculado à mão.

## 2. O que mudou

- Nova opção **🏦 Entrada + boletos (fornecedor)** na “Forma do à vista”.
- Campos: **Entrada (R$)**, **Nº de boletos** (1–24) e **Intervalo** (15/30/60 dias).
- Prévia ao vivo: “2 boletos de R$ 3.450,00 a cada 30 dias · total R$ 11.500,00 ·
  vencimentos em 30, 60 dias.”
- O app calcula o **valor presente** do fluxo (entrada em t=0, boletos em t = i × intervalo)
  pela taxa da reserva e usa esse valor como “custo real” do lado à vista.
- Sem milhas e sem float de cartão nesse modo.
- **Fatura inicial padrão corrigida**: agora é a fatura que recebe a compra
  (`getDefaultInvoiceMonth`: após o dia 9 cai na fatura seguinte; nunca volta para uma
  fatura encerrada), em vez da primeira opção (Out/2026).
- Histórico guarda `entrada`, `boletos` e `boletoInterval`; editar restaura os campos.

## 3. Exemplo validado (o orçamento real)

| | Entrada + boletos | 10x cartão |
|---|---|---|
| Nominal | R$ 11.500,00 | R$ 12.600,00 |
| Valor presente (Selic 13,75%) | **R$ 11.389,87** | R$ 11.883,18 |
| PV com milhas (R$ 0,03/mi) | R$ 11.389,87 | **R$ 11.717,19** |
| Veredito | **✅ Entrada + boletos** | — |
| Economia | **R$ 327,32** | — |

Taxa efetiva do 10x contra o fluxo entrada+boletos: **2,04% a.m. (27,4% a.a.)**, contra
1,08% a.m. da Selic.

## 4. Implementação

- `getEntradaPlan()` — lê/valida entrada, boletos e intervalo (entrada < total).
- `entradaPV(plan, mr)` — desconta cada boleto por `(1+mr)^(i × intervalo/30)`.
- `calculate()` — novo ramo `isEntradaCash`; `cPv = entradaPV(...)`, `cMi = 0`; guarda os
  campos no `lastCalc` e no `purchHist`.
- `updateCashMethodHint()` mostra/esconde os campos e atualiza a prévia.
- `renderResults()` — título “🏦 Entrada + boletos”, linha “Entrada R$ X + Nx R$ Y a cada
  Z dias” e “Sem milhas e sem float de cartão”.
- `getDefaultInvoiceMonth()` + `_pMonthUserSet` — fatura inicial padrão correta e escolha
  do usuário preservada; `startNewSim` volta ao padrão.

## 5. Validação

- **125/125 testes** (11 novos em `tests/entrada-boletos.test.js`): plano/validação, PV,
  comparação com 10x, recusa de entrada inválida, render, mostra/esconde campos, histórico
  e fatura inicial padrão.
- Chrome headless 1000 px e 390 px: campos visíveis só no modo entrada, prévia correta,
  resultado “Entrada + boletos / economia R$ 327,32”, fatura inicial Dez/2026, 0 overflow,
  0 texto cortado, 0 exceção.
