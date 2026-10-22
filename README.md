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
  - Método de pagamento à vista configurável: **PIX / Dinheiro** (débito imediato no momento $t=0$) ou **Cartão de Crédito 1x** (com float de 1 mês no CDI e acúmulo de milhas).
  - Cálculo de rendimento real de aplicações (100% CDI / Tesouro Selic) resgatando mês a mês para pagamento das parcelas via VPL/VP.
  - Pontuação de milhas configurável (ex: 2.2 milhas/dólar no Nubank Ultravioleta).
  - Respeito à chave de "Considerar meta de gastos": penalizações de orçamento só são aplicadas se a opção estiver ativada.
  - Projeção de impacto visual direto nas faturas futuras antes de efetivar a compra.
  - Botão para adicionar a simulação diretamente na previsão das faturas com um clique.

- **📱 PWA Nativo & Navegação Mobile:**
  - Totalmente responsivo para computador e smartphone.
  - Ícone de aplicativo dedicado, `favicon.ico` multi-resolução e funcionamento em tela cheia (standalone).
  - Suporte a cache offline com Service Worker (estratégia **Network-First** para atualizações transparentes do app e **Cache-First** para assets estáticos).
  - Ajuste a entalhes de tela (*safe-area-insets* para iOS e Android).
  - Suporte completo ao botão "Voltar" do navegador/celular via **History API** (fecha modais abertos e navega entre abas sem fechar o app).
  - Campos numéricos com `inputmode="decimal"` tolerantes à vírgula brasileira (PT-BR).

- **🎨 Interface refinada (foco mobile & acessibilidade):**
  - Navegação em *segmented control* fixa no topo (abas sempre acessíveis ao rolar).
  - Valores financeiros com **números tabulares** e colunas alinhadas à direita no comparativo.
  - Cartões de fatura com faixa colorida por status, micro-interações suaves e respeito a `prefers-reduced-motion`.
  - Contraste aprimorado de cores atendendo às diretrizes de acessibilidade WCAG AA (texto secundário e badges).
  - Escala tipográfica e tokens de design (raios/sombras/espaços) para consistência em todo o app.
  - Layout mobile com áreas de toque mínimas de 44x44px em todos os controles interativos.

- **🔒 Segurança & Sincronização com Google Sheets:**
  - **Autenticação por Token Secreto:** Suporte a `SHARED_SECRET` configurado no Apps Script e no Perfil do app.
  - **Proteção de Dados:** Envio exclusivo via `HTTP POST` (JSON no corpo da requisição), eliminando o vazamento de dados financeiros em URLs ou logs de proxy.
  - **Controle de Concorrência:** `LockService` no Google Apps Script evitando race conditions e sobreposição em gravações simultâneas.
  - **Content Security Policy (CSP):** Cabeçalho de segurança reforçado contra injeção e XSS.
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
├── sw.js                   # Service Worker (Network-First para HTML, Cache-First para estáticos)
├── favicon.ico             # Ícone do navegador (16x16, 32x32, 48x48)
├── robots.txt              # Diretrizes para indexadores de busca
├── icon-192.png            # Ícone PWA (192x192)
├── icon-512.png            # Ícone PWA (512x512)
├── apple-touch-icon.png    # Ícone para iOS
├── apps_script.gs          # Script de integração Google Sheets (com LockService e Auth)
└── scripts/
    └── generate_pwa_icons.py # Script de geração de ícones PWA
```

---

## 🔑 Configuração do Google Sheets e Token de Segurança

Para conectar o app a uma planilha Google privada:

1. Crie uma planilha no Google Sheets com as abas `Faturas` e `Config`.
2. Acesse **Extensões → Apps Script** e cole o código de `apps_script.gs`.
3. (Opcional, recomendado) Em **Configurações do Projeto (ícone de engrenagem) → Propriedades do script**, adicione:
   - **Propriedade:** `SHEETS_SECRET_TOKEN`
   - **Valor:** `uma-senha-ou-token-forte-aqui`
4. Clique em **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL do App da Web gerada.
6. No app **Parcelado ou À Vista?**, vá na aba **Perfil**:
   - Cole a URL do App da Web em **URL do Google Apps Script**.
   - Digite o mesmo token no campo **Token de Segurança (opcional)**.
   - Clique em **Salvar Dados do Perfil**.

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
