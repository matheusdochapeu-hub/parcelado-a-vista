# 011 — Arquivar simulações depois de lançar nas faturas (v4.2.0)

**Data:** 2026-11-11
**Versão:** app `4.2.0` · Service Worker `faturas-pwa-v24`
**Escopo:** Histórico de simulações (`index.html`, `purchHist`)

---

## 1. Pedido

> “Depois que eu simular e adicionar as faturas reais, permita eu arquivar a simulação.”

O histórico crescia com simulações já convertidas em compra. Excluir perdia o registro;
manter poluía a lista e a seleção da compra combinada.

## 2. Modelo de dados

Cada item de `purchHist` (sincronizado no Sheets) ganhou campos opcionais:

| Campo | Significado |
|---|---|
| `archived` + `archivedAt` | simulação fora da lista ativa, disponível em “Arquivadas” |
| `appliedAt` | quando foi lançada nas faturas |
| `appliedN`, `appliedPer` | parcelas e valor lançados |
| `appliedStart` | mês da 1ª parcela (link “Ver fatura”) |
| `appliedGroup` | grupo de `simItems` criado no lançamento |

Compatível com itens antigos (sem os campos = ativos). O Matrix ignora campos extras no
`purchHist`; o contrato `extraItems/overrides/simItems/profile` não mudou.

## 3. UX

- **Ao confirmar “Adicionar às faturas”**: checkbox **“Arquivar esta simulação depois de
  adicionar”** (marcado por padrão). O item recebe o selo verde
  **✅ Aplicada às faturas · Nx de R$ X · início Mês/AAAA** com atalho **Ver fatura**.
- **Toast com ação**: “✅ adicionadas · 📦 simulação arquivada” + botão **Desfazer**
  (desarquiva na hora). Se o checkbox for desmarcado, o toast oferece **📦 Arquivar**.
- **Botão 📦** em cada simulação ativa para arquivar a qualquer momento.
- **Seção “📦 Arquivadas (N)”** recolhível, com **↩️ Restaurar**, **Ver fatura** e
  **🗑️ Limpar arquivadas** (exclusão definitiva, com confirmação).
- Arquiva também **cancela o modo de edição** e **remove da seleção** da compra combinada.
- Editar uma simulação aplicada/arquivada **preserva** os metadados de vínculo.
- Contador do cabeçalho: “X ativas · Y arquivadas · marque 2+ para combinar”.

## 4. Implementação

- `renderHist` separa ativos/arquivados e delega o HTML a `histItemHtml(x, i, archived)`.
- Novas funções: `archiveHist`, `archiveHistItem`, `unarchiveHist`, `clearArchivedHist`,
  `markHistApplied`.
- `lastCalc.histIdx` liga o cálculo ao item do histórico; `confirmSimAdd` usa esse índice
  para marcar o vínculo e (opcionalmente) arquivar.
- `showToast` ganhou o 4º parâmetro `{label, onClick}` (botão de ação no toast).
- Arquivadas não entram em `getSelectedHistItems` (compra combinada).

## 5. Validação

- **104/104 testes** (7 novos em `tests/history-archive.test.js`): arquivar/restaurar,
  separação e contagem, vínculo com faturas, combinação ignorando arquivadas, limpar
  arquivadas e compatibilidade com itens antigos.
- Chrome headless 870 px e 390 px: sem overflow horizontal, sem texto cortado, 0 exceção.
- Fluxo clicado: arquivar (contador 4→3 ativas, 1 arquivada), abrir “Arquivadas”,
  restaurar (3→4), e “Adicionar às faturas” com arquivamento automático + toast **Desfazer**.
