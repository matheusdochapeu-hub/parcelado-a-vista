# AGENTS.md — Faturas (parcelado-a-vista)

> Contexto para agentes de IA. Escopo: **esta pasta**.

## O que é

PWA de controle de faturas de cartão de crédito (Nubank Ultravioleta/Black, BB Ourocard)
e calculadora de decisão financeira **à vista com desconto × parcelado sem juros**,
considerando rendimento (Selic/CDI), milhas e meta de gastos mensal.

## Stack

- PWA em HTML/CSS/vanilla JS. Gráficos em SVG puro (donut e barras), sem bibliotecas.
- Backend: Google Apps Script (`apps_script.gs`) **API v2** + Google Sheets.
- Sem frameworks e sem build.
- Design system **v4** dentro do próprio `index.html` (camada de override no fim do `<style>`).

## Rodar localmente

```powershell
python -m http.server 8000   # abrir http://localhost:8000
```

## Testes

```powershell
node --test tests/*.test.js   # 75 testes (a pasta chama "tests", no plural)
```

- `tests/backend-api.test.js` sobe o `apps_script.gs` em `node:vm` com mocks do Apps Script
  e prova leitura única, escrita em lote, validação, token, JSONP, rate limit e log.
- `tests/sync-flow.test.js` cobre snapshot remoto, incremental (`since`), conflito
  nuvem × aparelho e diagnóstico por `ping`.
- `tests/sync-and-summary.test.js` cobre o resumo do topo, privacidade e render dos meses.

## Deploy

- GitHub Pages a partir da `main`:
  <https://matheusdochapeu-hub.github.io/parcelado-a-vista/>
- CI de testes em `.github/workflows/test.yml`.
- ⚠️ Existia um clone duplicado da pasta (`Parcelado a vista`) que já foi removido.
  **Esta é a única cópia canônica.**

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `index.html` | SPA (faturas, gastos, calculadora, histórico) + design system v4 |
| `sw.js` | Service Worker (`faturas-pwa-v19`), fluxo de banner de atualização |
| `apps_script.gs` | API v2 do Sheets (leitura única, escrita em lote, cache, revisão, log) |
| `manifest.json` | Manifesto PWA com atalhos |
| `tests/` | Suíte de testes (cálculos, itens, modais, histórico, API, sync) |
| `plans/` | Planos e auditorias (o `006` documenta a v4.0) |

## Regras críticas

1. **A matemática financeira é o coração do app.** Qualquer mudança em VPL, CDI/Selic,
   milhas ou meta precisa de teste novo em `tests/` antes do commit.
2. **Não duplicar itens no histórico** ao editar uma simulação existente (já houve bug
   corrigido em `77ab52f`). A simulação editada deve substituir, não acrescentar.
3. Categorização de gastos é **aprendida por palavras-chave** e pode ser reclassificada
   à mão — preserve as regras do usuário.
4. **Ao publicar assets, suba as três versões juntas:** `APP_VERSION` e `SW_CACHE_NAME`
   no `index.html` **e** `CACHE_NAME` no `sw.js`. O `?v=` dos ícones no `<head>` também
   acompanha a versão. Divergência entre eles faz o celular rodar código velho.
5. **O app é a fonte da verdade das faturas: o Matrix puxa esses valores.** O contrato
   consumido por `../matrix/js/satellite-connectors.js` é `extraItems` (`{desc,val,de,ate}`),
   `overrides` (`"<desc>__<mIdx>"`), `simItems` (`{d,v,de,ate}`) e `profile.meta`.
   **Não renomeie nem remova essas chaves** sem atualizar o Matrix no mesmo commit.
6. **Banco de dados = planilha `Backup`, colunas A:D** (`chave`, `valor_json`,
   `atualizado_em`, `registros`). A linha `_meta` guarda `revision`/`savedAt` e é ignorada
   na leitura. Não mude o layout sem migração.
7. **O backend é publicado à mão.** Alterar `apps_script.gs` no repositório **não** altera
   o Apps Script em produção: é preciso colar na planilha e implantar uma nova versão.
   Sem isso, `ping` responde `1.x` e os recursos da v2 ficam inativos (o app continua
   funcionando em modo compatível).
8. **Privacidade não pode virar dado.** `showToast` é `(msg, ms|variant, variant)`;
   `fmtBRL` mascara quando `privacyOn`, então rótulos **persistidos** (ex.: `simLabel`)
   usam `fmtBRLraw`. Nunca grave string mascarada no Sheets/localStorage.
9. **UX: informação nunca é cortada.** Nada de `text-overflow: ellipsis` em textos
   informativos; alvos de toque ≥ 40 px no celular; conferir 1440, 768, 390 e 360 px sem
   overflow horizontal. Validado com Chrome headless via CDP (`_qa/` fora do repositório).

## Dívida técnica conhecida

- **Resposta do POST é opaca (CORS).** O Apps Script não envia
  `Access-Control-Allow-Origin`, então o app grava com `mode:'no-cors'` e confirma a
  gravação chamando `ping` depois (`verifyPush`). Uma API bidirecional de verdade exigiria
  um proxy com CORS.
- **Conflito é detectado por horário, não por CRDT.** Se a planilha for gravada com o
  relógio adiantado, o banner pode aparecer sem necessidade; o usuário escolhe a versão e
  o dado local não é descartado automaticamente.
- **Log de escritas não é auditado por usuário.** A API registra quando/ação/chaves/tamanho/
  revisão; não há identidade por dispositivo (`client` é informativo).
- **`BASE_ITEMS` ainda é dado embutido** das faturas reais (Out–Dez/2026 em diante). É
  histórico, não cálculo: substituir por importação real quando a planilha evoluir.
- **Cache do Service Worker é versionado por `CACHE_NAME`**, mas o app não tem `preload`
  de abas: a primeira abertura de uma aba pesada ainda renderiza no clique.

## Vizinhança (ecossistema)

- `../matrix` — consome as faturas via `js/satellite-connectors.js` (Nubank Matheus,
  Nubank Scarlet, BB).
- Gastos do cartão da Scarlet são lançados **só aqui** e chegam ao Matrix por satélite.
