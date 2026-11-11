# Memória do Projeto: Parcelado a Vista (Faturas PWA)

Este arquivo é a memória viva e persistente do projeto, lida pelo agente em novos chats para manter o contexto das decisões tomadas, regras consolidadas e histórico de correções.

---

## 📌 Diretrizes Globais do Projeto
- **Arquitetura**: PWA Vanilla JS / HTML5 / CSS3 de arquivo único (`index.html`) com zero dependências de build ou bundlers externos (`node_modules`).
- **Testes**: Executados via runner nativo do Node (`node --test tests/**/*.test.js`), sem bibliotecas de terceiros (Jest/Vitest).
- **Offline First**: Service Worker gerencia cache estático (`sw.js`). Qualquer alteração estrutural no `index.html` deve ter a versão do cache incrementada.
- **Sincronização Google Apps Script**: Utiliza autenticação estrita (`SHEETS_SECRET_TOKEN`). Tokens placeholder são bloqueados por segurança.

---

## 📜 Histórico de Correções e Melhorias

### [2026-11-10] - v4.1: Comprometido 12m + compra combinada no histórico
- **Comprometido**: `getFaturasSummary()` agora soma os próximos 12 meses em aberto
  (antes 6) e o card mostra “12 meses à frente”.
- **Histórico multi-seleção**: cada simulação tem checkbox; 2+ selecionadas abrem a
  prévia “Compra combinada” com soma das parcelas mês a mês, pico, impacto na meta e
  seletor de parcelas por produto (`buildComboPlan`).
- **Inserção opcional**: o combinado pode entrar como `simItems` (📅 simulação,
  removível) ou como `extraItems` (💾 lançamento real/manual, contrato do Matrix) —
  ou ser fechado sem inserir (`addComboToFaturas` / `insertHistCombo`).
- **Versões**: app 4.1.0 · SW `faturas-pwa-v19`.
- **Planos 006–008 aplicados**: `isAuthorized` exige token não-padrão; `reclassifyItem`
  limpa todas as chaves de mês ao aplicar globalmente; `inferTargetMonthFromItems`
  pré-seleciona a fatura na importação. Suíte: **75/75**.
- **Atenção**: o `apps_script.gs` publicado continua com a versão anterior até ser
  reimplantado na planilha; com a nova versão, configure `SHEETS_SECRET_TOKEN` antes.

### [2026-11-04] - Implementação dos Planos 006 a 009
- **Segurança (Plano 006)**:
  - Removido fallback vulnerável em `apps_script.gs` que autorizava requisições quando o segredo era o padrão.
  - Adicionada suíte de testes em `tests/security.test.js`.
- **Categorização & Regras (Plano 007)**:
  - Corrigido `reclassifyItem(..., applyToAll = true)`: agora expurga todas as chaves específicas de meses anteriores/futuros (`mIdx::desc`), garantindo que a nova regra global prevaleça em todo o histórico.
  - Criada suíte completa em `tests/categories.test.js` cobrindo a hierarquia de 4 níveis de precedência.
- **Importação CSV/OFX (Plano 008)**:
  - Criada função `inferTargetMonthFromItems(items)` que analisa as datas das transações e pré-seleciona automaticamente a fatura correta de destino, respeitando o ciclo de fechamento.
- **Performance & Limpeza (Plano 009)**:
  - `toggleMonthCollapse` refatorado para alternar classes no DOM diretamente via `#marrow-{mIdx}` e `#mbody-{mIdx}`, eliminando o re-render total via `innerHTML` e evitando layout thrashing.
  - Removida função morta `delExtra`.
  - Cache do Service Worker atualizado para `faturas-pwa-v13`.

### [2026-11-01] - Conciliação e Anti-Duplicação de Extratos
- Implementada detecção inteligente de duplicatas (`exact` e `similar_val`) no modal de importação de faturas.
- Suporte a normalização de descrições e detecção de parcelamento inteligente (`01/10`, `1 de 5`).
