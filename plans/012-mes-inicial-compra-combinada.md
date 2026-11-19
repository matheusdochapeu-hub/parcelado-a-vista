# 012 — Mês inicial da compra combinada (v4.3.0)

**Data:** 2026-11-19
**Versão:** app `4.3.0` · Service Worker `faturas-pwa-v25`
**Escopo:** Histórico → Compra combinada (`index.html`)

---

## 1. Pedido

> “Aqui no app faturas eu gostaria de escolher o mês inicial da simulação. Por padrão ele
> coloca o mês vigente.”

A compra combinada somava as parcelas a partir do mês de cada simulação (ou do primeiro mês
aberto), sem controle na tela. Quem queria jogar a compra para Jan/2027 não tinha como.

## 2. O que mudou

- Novo seletor **“Mês inicial”** no topo do painel da compra combinada, com:
  - **Automático (mês de cada simulação)** — comportamento anterior, padrão;
  - todos os meses **abertos** a partir do primeiro mês em aberto (até +24 meses).
- Ao escolher um mês, **todos os produtos** da combinação passam a começar nele; os cards
  de mês, o KPI “até …”, o “começa em …” de cada produto e o lançamento final usam o mês
  escolhido.
- Meses fechados/pagos não podem ser escolhidos; se o mês escolhido fechar, volta para
  automático.
- `comboStart` é zerado ao **limpar a seleção** e após **inserir nas faturas**.
- O lançamento (simulação ou fatura real) respeita o mês escolhido.

## 3. Implementação

- `comboStart` (estado da tela) + `setComboStart`, `comboStartOptionsHtml`.
- `buildComboPlan(items, nMap, firstOpen, startOverride)` — o 4º parâmetro força o início;
  sem ele, mantém o `mOff` de cada simulação (limitado ao primeiro mês aberto).
- `renderHistCombo` injeta o seletor no cabeçalho e repassa `comboStart` ao plano.
- `insertHistCombo` repassa `comboStart` e limpa a escolha depois.

## 4. Validação

- **114/114 testes** (6 novos em `tests/combo-start.test.js`): override no plano, clamp no
  primeiro mês aberto, seletor renderizado, mês fechado recusado, inserção no mês escolhido
  e reset ao limpar.
- Chrome headless 988 px e 390 px: seletor presente com 36 opções, “Dez/2026” → escolher
  **Jan/2027** move o primeiro card de mês, o “começa em” e o “até Out/2027”; 0 overflow,
  0 texto cortado, 0 exceção.
