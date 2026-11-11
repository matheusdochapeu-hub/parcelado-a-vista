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

1. **Reimplantar o `apps_script.gs`** na planilha (a URL `/exec` não muda). — **feito em 2026-11-10.**
2. Conferir o token do Casa Maracaju/Matrix continua igual ao `SHEETS_SECRET_TOKEN` — o
   Matrix usa `matrix_faturas_token`.
3. Eventual: substituir `BASE_ITEMS` por importação real e explorar um proxy CORS para
   uma API realmente bidirecional.

---

## 7. Verificação da conexão com o Matrix (2026-11-10, pós-implantação)

Executada contra a API publicada (`.../exec`), lendo pelo mesmo caminho do conector do
Matrix (`action=restore` via JSONP) e rodando o `processFaturasData` real de
`../matrix/js/satellite-connectors.js`.

- **API:** `ok: true`, `api: 2.1`, `revision: 3`, `savedAt: 2026-11-10T19:26:54Z`.
  10 chaves devolvidas — `extraItems` (70), `overrides` (4), `simItems` (0),
  `purchHist`, `profile` (`meta: 3000`), `monthStatus`, `collapsedMonths`,
  `userCategories`, `userCatRules`, `itemCatMap`. Contrato validado item a item.
- **Parser do Matrix:** 15 meses. Comparação com o motor do app Faturas:
  **diferença 0,00 em todos os meses**; Nov/2026 = **R$ 4.883,05** com os mesmos
  **75 itens** nos dois lados; Dez/2026 = **R$ 1.568,05**; comprometido 6m = R$ 9.704,36.
- **UI publicada com os dados reais** (390 px): hero R$ 4.883,05 (162,8% da meta),
  14 cartões, 75 lançamentos no mês, **0 overflow, 0 texto cortado, 0 exceção**.
- **⚠️ Autenticação:** `authConfigured: false` — a API está aberta com o token padrão.
  Para fechar: definir `SHEETS_SECRET_TOKEN` no Apps Script e o mesmo valor em
  **Faturas → Perfil** e em **Matrix → Backup & Conexões** (campo de token das faturas).
  Sem o token no Matrix, o satélite para de sincronizar no momento em que a auth for ligada.

---

## 8. Correção da sincronização entre aparelhos (v4.0.1 — 2026-11-11)

### Diagnóstico
- O Perfil de um dos aparelhos estava com a **URL do Apps Script = `Matheus`** (o campo
  aceitava qualquer texto). Resultado: `jsonpGet` caía em `script error` e o `fetch` do
  backup ia para uma URL relativa (404 opaco), que o app interpretava como sucesso —
  ou seja, o aparelho achava que havia salvado sem gravar nada.
- A URL era tratada como dado **por aparelho**: a planilha já tinha a URL correta, mas
  `applyRemoteProfile` ignorava `gasUrl`, então o aparelho quebrado nunca se recuperava.
- O `gasToken` era enviado dentro do `profile` para a planilha (e devolvido no GET),
  expondo o segredo no backup.

### Correções
1. `normalizeGasUrl` / `isValidGasUrl`: aceita a URL colada no meio de texto, exige
   `https://script.google.com/macros/s/<id>/exec` e **bloqueia** sync/POST com URL inválida.
2. Banner **"A URL da planilha está inválida"** com **Abrir Perfil**, **Colar URL** e
   **Usar URL padrão**; o chip do topo mostra `URL inválida`.
3. Os campos de URL e token saíram de "Configurações & Parâmetros" e foram para o card
   **Conexão com a planilha**, com hint de validação ao vivo e diagnóstico (URL, token,
   pendências, última sync, revisão, API).
4. `applyRemoteProfile` adota a URL válida da planilha quando a local está quebrada;
   `saveProfile` normaliza ao sair do campo; `profileForSync` **remove o `gasToken`**.
5. Ao salvar uma URL válida, o app já testa a conexão e sincroniza em seguida; ao voltar
   para o app (visibilitychange), busca mudanças se a última sync tiver mais de 3 min.
6. `input[type=url]` ganhou o mesmo estilo dos demais campos (o campo aparecia "pelado").

### Validação
- **74/74 testes** (12 novos em `tests/connection.test.js`).
- Roundtrip real de escrita: POST de `collapsedMonths` → revisão **12 → 13**, dados intactos.
- Chrome headless, 390 e 1440: recuperação `Matheus` → **Usar URL padrão** → URL válida,
  banner escondido, `ping` disparado, `gasToken` fora do payload; 0 overflow, 0 erro.

---

## 9. Incidente na validação e correção de segurança (v4.1.4 — 2026-11-11)

Durante a verificação do caminho automático de recuperação, um teste de navegador com
estado semeado acabou **enviando um estado vazio** para a planilha: o app tratava qualquer
`saveProfile()` como alteração de dados e, na reconexão, um aparelho sem histórico local
fez push por cima da nuvem.

**Recuperação:** o snapshot completo foi extraído do `localStorage` de um perfil de teste
anterior (via CDP, sem rodar o app) — 70 itens, 4 overrides, 2 simulações no histórico,
21 categorias, 14 meses recolhidos — e regravado pela API. Revisão final **16**, contagens
conferidas e o Matrix voltou a bater (R$ 4.883,05 / 75 itens). Cópia de segurança fora do
repositório: `../Backups/faturas-restore-2026-11-11.json`.

**Correções**
1. Trocar URL/token **não** marca mais o dataset como pendente.
2. `saveProfile` só marca pendência quando um parâmetro de cálculo muda de fato.
3. `recoverConnection` não faz push quando o aparelho não tem histórico de sincronização
   (`revision`/`savedAt` zerados): mostra o banner de conflito e deixa o usuário decidir.
4. Com histórico e sem conflito, envia o local em vez de puxar a nuvem por cima.
5. Testes cobrindo os quatro cenários (97/97).

**Lição:** nunca rodar teste de escrita contra a planilha real; validar escrita apenas com
mocks (API em `node:vm`) ou com um snapshot explícito e restaurável.



