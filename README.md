# 💳 Parcelado ou À Vista? (Faturas & Calculadora Financeira)

Aplicativo web progressivo (PWA) e calculadora de inteligência financeira voltada para otimização de faturas de cartão de crédito (Nubank Ultravioleta / Black), controle orçamentário mensal e tomada de decisão entre compras à vista com desconto versus parcelamento sem juros aplicando o capital à taxa Selic e acumulando milhas.

---

## 🚀 Principais Funcionalidades

- **💳 Controle Mensal de Faturas:**
  - Acompanhamento mês a mês das faturas reais e parcelas futuras.
  - Marcação de status da fatura: **Em aberto** 🟢, **Fechada** 🟡 e **Paga** 🟢.
  - Ordenação automática (faturas fechadas e pagas vão para o fim da lista; fatura corrente sempre em evidência).
  - Recolhimento e expansão ágil de lançamentos mensais com seta indicativa.
  - Edição, exclusão e adição rápida de novos lançamentos e parcelamentos.

- **🧮 Calculadora de Inteligência Financeira:**
  - Simulações comparativas: À Vista com Desconto vs. Parcelado Sem Juros.
  - Cálculo de rendimento real de aplicações (100% CDI / Tesouro Selic) resgatando mês a mês para pagamento das parcelas.
  - Pontuação de milhas (2.2 milhas/dólar no Nubank Black).
  - Projeção de impacto visual direto nas faturas futuras antes de efetivar a compra.
  - Botão para adicionar a simulação diretamente na previsão das faturas com um clique.

- **📋 Histórico de Simulações:**
  - Salva as últimas simulações realizadas.
  - Permite clicar em qualquer simulação passada para reabrir e editar na calculadora.

- **📱 PWA Nativo para Celular:**
  - Totalmente responsivo para computador e smartphone.
  - Ícone de aplicativo dedicado e funcionamento em tela cheia (standalone).
  - Suporte a cache offline com Service Worker.
  - Ajuste a entalhes de tela (*safe-area-insets* para iOS e Android).

- **☁️ Sincronização e Backup com Google Sheets:**
  - Backup contínuo via Google Apps Script (JSONP).
  - Armazenamento local redundante no `localStorage`.

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
