# 💳 Parcelado ou À Vista? (Faturas & Calculadora Financeira)

Aplicativo web progressivo (PWA) e calculadora de inteligência financeira voltada para otimização de faturas de cartão de crédito (Nubank Ultravioleta / Black), controle orçamentário mensal e tomada de decisão entre compras à vista com desconto versus parcelamento sem juros aplicando o capital à taxa Selic e acumulando milhas.

---

## 🚀 Principais Funcionalidades

- **💳 Controle Mensal de Faturas:**
  - Acompanhamento mês a mês das faturas reais e parcelas futuras.
  - Marcação de status da fatura: **Em aberto** 🟢, **Fechada** 🟡 e **Paga** 🟢.
  - Ordenação automática (faturas fechadas e pagas vão para o fim da lista; fatura corrente sempre em evidência).
  - Recolhimento e expansão ágil de lançamentos mensais com seta indicativa.
  - **Editor de fatura aprimorado:** total e sobra na meta recalculados **ao vivo** enquanto você edita, **busca** por nome do item, **contador** de itens/alterações, remoção com **desfazer** (↩) antes de salvar, selos de tipo (Planilha / Estimado / Manual / Simulada) e bloco recolhível para adicionar lançamentos.

- **📋 Histórico de Simulações:**
  - Reabrir qualquer simulação com um toque para editar na calculadora.
  - **Excluir simulações individualmente** (✕ em cada item) ou **limpar todas** de uma vez.

- **🧮 Calculadora de Inteligência Financeira:**
  - Simulações comparativas: À Vista com Desconto vs. Parcelado Sem Juros.
  - Cálculo de rendimento real de aplicações (100% CDI / Tesouro Selic) resgatando mês a mês para pagamento das parcelas.
  - Pontuação de milhas (2.2 milhas/dólar no Nubank Black).
  - Projeção de impacto visual direto nas faturas futuras antes de efetivar a compra.
  - Botão para adicionar a simulação diretamente na previsão das faturas com um clique.

- **📱 PWA Nativo para Celular:**
  - Totalmente responsivo para computador e smartphone.
  - Ícone de aplicativo dedicado e funcionamento em tela cheia (standalone).
  - Suporte a cache offline com Service Worker.
  - Ajuste a entalhes de tela (*safe-area-insets* para iOS e Android).

- **🎨 Interface refinada (foco mobile):**
  - Navegação em *segmented control* fixa no topo (abas sempre acessíveis ao rolar).
  - Valores financeiros com **números tabulares** e colunas alinhadas à direita no comparativo.
  - Cartões de fatura com faixa colorida por status, micro-interações suaves e respeito a `prefers-reduced-motion`.
  - Escala tipográfica e tokens de design (raios/sombras/espaços) para consistência em todo o app.
  - Layout mobile ajustado: cabeçalho de faturas empilhado com botão largura total, legenda em lista legível, campos com seta própria no `select`, barra de ações do modal fixa ao rolar, e áreas de toque ≥ 44px.

- **☁️ Sincronização e Backup com Google Sheets:**
  - Backup contínuo via Google Apps Script (POST em HTTPS, com fallback JSONP para `file://`).
  - Sincroniza também as **configurações do Perfil** (meta, Selic, câmbio, milhas) entre dispositivos.
  - Armazenamento local redundante no `localStorage`.
  - **Exportar / Importar backup em JSON** (aba Perfil) — um clique para salvar ou restaurar todos os dados sem depender do Sheets.

- **📆 Calendário que acompanha o tempo:**
  - O "mês atual" avança automaticamente conforme a data real — faturas de meses já passados vão para o fim da lista sozinhas, sem precisar marcar manualmente.

---

## 📂 Estrutura do Projeto

```
├── index.html              # Aplicação completa (HTML, CSS e JS)
├── manifest.json           # Manifesto PWA para instalação no celular
├── sw.js                   # Service Worker para cache e uso offline
├── icon-192.png            # Ícone PWA (192x192)
├── icon-512.png            # Ícone PWA (512x512)
├── apple-touch-icon.png    # Ícone para iOS
├── apps_script.gs          # Código de integração do Google Sheets
└── generate_pwa_icons.py   # Script de geração dos ícones gráficos
```

---

## 📲 Como Instalar no Celular

1. Acesse o link da aplicação no navegador do celular (Chrome no Android ou Safari no iPhone).
2. **No Android**: Toque no menu de 3 pontinhos (`⋮`) e selecione **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
3. **No iPhone**: Toque no botão de **Compartilhar** (`⎋`) e selecione **"Adicionar à Tela de Início"**.

---

## 🌐 Hospedagem no GitHub Pages

O app é 100% estático (HTML/CSS/JS, PWA) e usa **caminhos relativos** em todo lugar
(`manifest.json`, `sw.js`, ícones), então roda perfeitamente a partir de um
subdiretório do GitHub Pages — sem nenhuma alteração de código.

### Como ativar o GitHub Pages (passo único, feito pelo dono do repositório)

1. No GitHub, abra o repositório `parcelado-a-vista`.
2. Vá em **Settings → Pages**.
3. Em **Build and deployment → Source**, escolha **Deploy from a branch**.
4. Em **Branch**, selecione `main` e a pasta `/ (root)`. Clique em **Save**.
5. Aguarde ~1 minuto. O app ficará disponível em:
   **https://matheusdochapeu-hub.github.io/parcelado-a-vista/**

Esse endereço funciona como PWA instalável, exatamente como no tiiny.host —
basta abri-lo no celular e usar "Instalar aplicativo" / "Adicionar à Tela de Início".

> O arquivo `.nojekyll` na raiz garante que o Pages sirva todos os arquivos sem
> processamento Jekyll. Ao publicar mudanças de assets, lembre-se de incrementar o
> `CACHE_NAME` em `sw.js` para invalidar o cache antigo.
