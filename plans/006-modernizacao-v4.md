# 006 — Modernização v4.0 (front-end + API v2)

**Data:** 2026-11-10
**Versão:** app `4.0.0` · Service Worker `faturas-pwa-v18` · API `2.1`
**Escopo:** `parcelado-a-vista` (sem alterar o contrato consumido pelo Matrix)

---

## 1. Motivação

O app estava funcional, mas com a linguagem visual de 2019 (hero centralizado, abas em
formato de botão, cartões de mês sem hierarquia) e um backend que lia a planilha 10 vezes
por GET, gravava chave por chave e sobrescrevia dados locais sem aviso. O Matrix
(v113–v117) e o Atendimentos (v59–v63) já tinham passado por esse ciclo; faltava nivelar
o app de faturas.

## 2. Front-end

| Área | Antes | Depois |
|---|---|---|
| Shell | Hero grande + 5 abas em botões | App bar fixa (logo, sync, privacidade) + segmented control |
| Resumo | Nenhum (só rolando a lista) | Hero com fatura atual, gauge da meta, próxima, comprometido 6m e alívio |
| Mês | Header denso, botões Fechada/Paga, rótulo fixo "Fatura atual" | Cartão com chips de estado, barra de meta, seg control Em aberto/Fechada/Paga, total correto por mês |
| Lista | Tudo aberto, sem filtro | Filtro Todas/Abertas/Encerradas, grupo "Encerradas", item com cor da categoria, colapso acessível |
| Privacidade | — | Olho que mascara todos os valores (`fmtBRL`) |
| Modais | Pop centralizado | Bottom sheet no celular, `Esc`, fundo com blur |
| Acessibilidade | Sem ARIA | `role=tablist/tab/tabpanel`, `aria-selected`, `aria-expanded`, `aria-pressed`, teclado ←/→/Home/End |
| Toque | Vários alvos < 40 px | ≥ 40 px nos controles do fluxo principal |
| Tipografia/selects | Rótulos longos truncados pelo select | Rótulos curtos + linha de apoio com ciclo/pagamento |

Arquivos: `index.html` (CSS no fim do `<style>` como camada v4 + markup + JS de render),
`sw.js`, `manifest.json`.

## 3. Back-end (API v2.1)

`apps_script.gs` reescrito mantendo o mesmo formato de planilha (A:D) e o mesmo contrato
de resposta:

- **Leitura:** um `getDataRange()` + parse único (antes: 10 leituras, uma por chave).
- **Escrita:** um `setValues()` para todas as chaves alteradas + linha `_meta`
  (`revision`, `savedAt`). Antes: um `setValues()`/`appendRow()` por chave.
- **Cache:** `CacheService` 30 s no snapshot; invalidado em toda escrita.
- **Incremental:** `GET ?since=<ISO>` devolve só chaves alteradas (`partial: true`).
- **Validação:** whitelist de chaves, tipo esperado, 45 KB por célula, 900 KB por corpo,
  remoção de `__proto__`/`constructor`/`prototype`.
- **Segurança:** comparação de token em tempo constante, 120 req/min por token, JSONP
  sanitizado, remoção do token padrão do contrato "aberto".
- **Operação:** ações `ping` e `schema`, log de escritas com poda (500 linhas) e menu
  **Faturas API** na planilha.

## 4. Sincronização do cliente

- `pv4_sync` guarda `revision`, `savedAt`, `dirty`, `lastLocalChangeAt`, `lastError`.
- `saveLocal()` marca pendência; o envio é debounced (1,2 s) e reenviado com backoff
  (4 s / 10 s) quando falha; `sendBeacon` no `pagehide` como último recurso.
- **Conflito:** se `meta.savedAt` da nuvem for mais novo que a última alteração local e
  houver pendência, aparece o banner com **Usar a nuvem** / **Manter este aparelho** —
  antes a nuvem sobrescrevia calado.
- **Confirmação:** como o POST é `no-cors` (opaco), um `ping` logo depois confirma revisão
  e data reais; a aba Perfil mostra API, revisão e "salvo em".
- **Serviço de atualização:** o SW não faz mais `skipWaiting()` automático; mostra
  "Nova versão disponível" e espera o usuário (`SKIP_WAITING`).

## 5. Validação executada

- **Testes:** 57/57 (`node --test tests/*.test.js`) — 25 originais + 12 da API + 8 do
  fluxo de sync + 12 de resumo/privacidade/render.
- **Chrome headless via CDP** (sem reduced-motion para medir o layout final):
  - 1440×1300, 390×1500 e 360×1400: `horizontalOverflow = false`, `clipped = 0`,
    `exceptions = 0`, `console errors = 0`.
  - Fluxo interativo em 390 px: abrir/fechar modal (Esc), privacidade mascarando hero e
    itens, filtro Encerradas (1) vs Todas (12), marcar Paga (hero avança para Dez/2026),
    desfazer, editor (16 linhas), importador (dropzone), teclado → aba Gastos.
  - Alvos de toque < 40 px reduzidos a casos não interativos do fluxo principal
    (switch do formulário e selects nativos).

## 6. Pendências / próximos passos

1. **Reimplantar o `apps_script.gs`** na planilha (a URL `/exec` não muda).
2. Conferir o token do Casa Maracaju/Matrix continua igual ao `SHEETS_SECRET_TOKEN` — o
   Matrix usa `matrix_faturas_token`.
3. Eventual: substituir `BASE_ITEMS` por importação real e explorar um proxy CORS para
   uma API realmente bidirecional.
