# AGENTS.md — Faturas (parcelado-a-vista)

> Contexto para agentes de IA. Escopo: **esta pasta**.

## O que é

PWA de controle de faturas de cartão de crédito (Nubank Ultravioleta/Black, BB Ourocard)
e calculadora de decisão financeira **à vista com desconto × parcelado sem juros**,
considerando rendimento (Selic/CDI), milhas e meta de gastos mensal.

## Stack

- PWA em HTML/CSS/vanilla JS. Gráficos em SVG puro (donut e barras), sem bibliotecas.
- Backend: Google Apps Script (`apps_script.gs`) + Google Sheets.
- Sem frameworks e sem build.

## Rodar localmente

```powershell
python -m http.server 8000   # abrir http://localhost:8000
```

## Testes

```powershell
node --test tests/**/*.test.js   # 25 testes (a pasta chama "tests", no plural)
```

## Deploy

- GitHub Pages a partir da `main`:
  <https://matheusdochapeu-hub.github.io/parcelado-a-vista/>
- CI de testes em `.github/workflows/test.yml`.
- ⚠️ Existia um clone duplicado da pasta (`Parcelado a vista`) que já foi removido.
  **Esta é a única cópia canônica.**

## Arquivos-chave

| Arquivo | Papel |
|---|---|
| `index.html` | SPA (faturas, gastos, calculadora, histórico) |
| `sw.js` | Service Worker (`faturas-pwa-vN`) |
| `apps_script.gs` | Backend do Sheets |
| `tests/` | Suíte de testes (cálculos, itens, modais, histórico) |
| `plans/` | Planos e auditorias |

## Regras críticas

1. **A matemática financeira é o coração do app.** Qualquer mudança em VPL, CDI/Selic,
   milhas ou meta precisa de teste novo em `tests/` antes do commit.
2. **Não duplicar itens no histórico** ao editar uma simulação existente (já houve bug
   corrigido em `77ab52f`). A simulação editada deve substituir, não acrescentar.
3. Categorização de gastos é **aprendida por palavras-chave** e pode ser reclassificada
   à mão — preserve as regras do usuário.
4. Ao publicar assets, **incrementar `CACHE_NAME`** no `sw.js`.
5. O app é a fonte da verdade das faturas: o Matrix puxa esses valores. Não invente
   total de fatura em outro projeto.

## Vizinhança (ecossistema)

- `../matrix` — consome as faturas via `js/satellite-connectors.js` (Nubank Matheus,
  Nubank Scarlet, BB).
- Gastos do cartão da Scarlet são lançados **só aqui** e chegam ao Matrix por satélite.
