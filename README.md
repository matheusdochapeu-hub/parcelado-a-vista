# 💳 Faturas (Controle de Faturas & Calculadora Financeira)

Aplicativo web progressivo (PWA) e calculadora de inteligência financeira voltada para otimização de faturas de cartão de crédito (Nubank Ultravioleta / Black), controle orçamentário mensal e tomada de decisão entre compras à vista com desconto versus parcelamento sem juros aplicando o capital à taxa Selic e acumulando milhas.

---

## ✨ Novidades da versão 4.1 (2026-11-10)

- **Comprometido de 12 meses** no resumo do topo: soma o saldo previsto dos próximos
  12 meses (antes eram 6).
- **Compra combinada no histórico**: marque 2 ou mais simulações e veja as parcelas
  somadas mês a mês, o pico da parcela combinada e o impacto de cada fatura na meta.
  O número de parcelas de cada produto pode ser ajustado na própria prévia.
- **Inserir o combinado nas faturas**: como **📅 simulação** (previsão removível) ou
  como **💾 lançamento real/manual** (sincroniza com a planilha) — ou apenas visualizar,
  sem inserir nada.
- Correções pendentes dos planos 006–008 aplicadas: token explícito no Apps Script,
  reclassificação global limpando todas as sobrescritas de mês e inferência do mês da
  fatura na importação CSV/OFX. Suíte com **75 testes**.

---

## ✨ Novidades da versão 4.0 (2026-11-10)

Modernização de front-end e back-end alinhada ao que já foi validado no **Matrix**
(v113–v117) e no **Atendimentos** (v59–v63).

**Interface**
- App bar compacta e fixa (logo, status de sincronização e botão de privacidade).
- **Hero de resumo**: fatura atual, gauge de uso da meta, próxima fatura, comprometido
  de 6 meses e alívio das parcelas que estão terminando.
- Cartões de mês redesenhados: status em *segmented control* (Em aberto / Fechada / Paga),
  barra de meta, chips de "Atual" e "N finalizando", e lista de itens com cor da categoria.
- Filtro **Todas / Abertas / Encerradas** e legenda recolhível.
- **Modo privacidade** (olho): esconde todos os valores monetários na hora.
- Modais em formato *bottom sheet* no celular, fechamento por `Esc` e navegação por
  teclado nas abas (setas/Home/End) com ARIA correto.
- Alvos de toque ≥ 40 px, zero truncamento por `ellipsis` e zero overflow horizontal em
  1440, 768, 390 e 360 px.
- Textos longos de select foram encurtados; o detalhe do ciclo da fatura aparece em uma
  linha de apoio abaixo do campo.

**Sincronização**
- API v2 com **revisão** por gravação, leitura em passada única e escrita em lote.
- Sync **incremental** (`since`) e cache de 30 s no servidor.
- **Detecção de conflito**: se a planilha estiver mais nova que as alterações locais, o app
  mostra um banner para escolher "Usar a nuvem" ou "Manter este aparelho" (antes a nuvem
  sobrescrevia o local silenciosamente).
- Reenvio automático com backoff, beacon ao sair da página, fila offline e confirmação
  real por `ping` (a resposta do POST é opaca por CORS).
- Banner **"Nova versão disponível"** com botão Atualizar (o Service Worker não troca mais
  de versão sozinho no meio do uso).

**Back-end (`apps_script.gs`)**
- Leitura do snapshot inteiro com **um único** `getDataRange()` (antes eram 10 leituras).
- Gravação de todas as chaves com **um único** `setValues()` (antes era uma por chave).
- Validação de chaves/tipos, limite de 45 KB por célula e 900 KB por requisição.
- Token comparado em tempo constante, rate limit de 120 req/min e log de escritas.
- Ações `ping`, `schema` e `restore`/`load` (compatível com o conector do Matrix).
- Menu **Faturas API** na planilha para diagnóstico e limpeza do log.

> ⚠️ **Ação necessária uma vez:** depois de puxar esta versão, reimplante o
> `apps_script.gs` (Extensões → Apps Script → Deploy → Gerenciar implantações → Nova versão).
> A URL `/exec` não muda. Use **Perfil → Testar conexão** para conferir `API 2.x` e a revisão.

### 🔄 Sincronização entre computador e celular (v4.0.1)

- A **URL do Apps Script agora viaja junto com o backup**: você configura em um aparelho e os
  outros adotam a URL válida da planilha ao sincronizar.
- O **token nunca é enviado para a planilha** — cada aparelho guarda o seu.
- Se a URL estiver inválida (ex.: um texto qualquer colado no campo), o app **não tenta
  sincronizar** e mostra um banner com **Usar URL padrão** e **Colar URL**, além de um
  diagnóstico em *Perfil → Conexão com a planilha*.
- Ao voltar para o app (trocar de aba, desbloquear o celular), se houver mais de 3 minutos
  desde a última sincronização, ele busca as mudanças automaticamente. Alterações locais
  pendentes são reenviadas em segundo plano.

---

## 🚀 Principais Funcionalidades

- **💳 Controle Mensal de Faturas:**
  - Acompanhamento mês a mês das faturas reais e parcelas futuras.
  - Marcação de status da fatura: **Em aberto** 🟢, **Fechada** 🟡 e **Paga** 🟢.
  - Ordenação automática (faturas fechadas e pagas vão para o fim da lista; fatura corrente sempre em evidência).
  - Recolhimento e expansão ágil de lançamentos mensais com seta indicativa.
  - **Editor de fatura aprimorado:** total e sobra na meta recalculados **ao vivo** enquanto você edita, **busca** por nome do item, **contador** de itens/alterações, remoção com **desfazer** (↩) antes de salvar, selos de tipo (Planilha / Estimado / Manual / Simulada) e bloco recolhível para adicionar lançamentos.

- **📊 Categorizador de Gastos & Análise Financeira Anual:**
  - **🏁 Painel de Parcelas Finalizando (Alívio Futuro no Orçamento):**
    - Identificação inteligente de lançamentos que encerram no mês de referência (ex: `Tennis One 4/4`, `5 de 5`, `10/10` ou fim de recorrência).
    - Somatória do valor total liberado no orçamento a partir da fatura seguinte.
    - Card em destaque na aba Gastos com o mês de referência (inclusive indicativo de **Mês Vigente**), badge de quitação e grade com as contas encerradas.
    - Selo visual `🏁 Última (X/Y)` em destaque na lista de lançamentos e na aba Faturas.
    - Coluna de acompanhamento no Extrato Geral consolidado mês a mês.
  - **Categorização Automática Inteligente:** Classificação instantânea de lançamentos reais e futuros em categorias (Alimentação, Vestuário & Moda, Saúde & Fitness, Casa, Assinaturas, Pets, Transporte, Compras).
  - **Personalização Total:** Crie novas categorias com emoji e cor própria, crie regras por palavras-chave e reclassifique qualquer item diretamente na lista com 1 clique.
  - **Gráfico Donut (Rosca) Interativo:** Gráfico vetorial SVG puro responsivo com cálculo exato de proporções e centro interativo.
  - **Visualizador Anual das Faturas:** Gráfico de barras verticais SVG mês a mês com linha pontilhada da meta orçamentária, identificando faturas pagas (verde), fechadas (amarelo) e abertas (azul/vermelho).
  - **Rastreador de Milhas Ganhas:** Contabilização de milhas acumuladas em faturas pagas vs. projeção de faturas futuras e equivalência estimada em R$.
  - **Painel de Faturas Pagas e a Vencer:** Cards de resumo (KPIs) e tabela consolidada mês a mês com status, % da meta e milhas.

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
├── manifest.json           # Manifesto PWA (atalhos, cores e ícones)
├── sw.js                   # Service Worker v18 (Network-First HTML, SWR nos estáticos)
├── apps_script.gs          # API v2 do Google Sheets (lote, cache, revisão, validação)
├── favicon.ico             # Ícone do navegador (16x16, 32x32, 48x48)
├── robots.txt              # Diretrizes para indexadores de busca
├── icon-192.png            # Ícone PWA (192x192)
├── icon-512.png            # Ícone PWA (512x512)
├── apple-touch-icon.png    # Ícone para iOS
├── tests/                  # Suíte Node (87 testes): cálculos, API v2, sync, conexão
├── scripts/                # Geração de ícones PWA
└── plans/                  # Planos e auditorias técnicas
```

---

## 🧪 Testes

```powershell
# dentro desta pasta (Node >= 20)
node --test tests/*.test.js
```

A suíte cobre: matemática financeira (VPL, CDP/Selic, milhas), ciclo e recorrência de
parcelas, importação CSV/OFX, histórico sem duplicação, carrossel de abas, o contrato da
**API v2** (leitura única, escrita em lote, validação, token, JSONP, rate limit, log), o
**motor de sincronização** (snapshot, incremental, conflito nuvem × aparelho, ping) e a
**conexão** (validação da URL, recuperação por URL padrão e token fora do backup).

A CI (`.github/workflows/test.yml`) roda a suíte em todo push/PR para `main`.

---

## 🔑 Configuração do Google Sheets e Token de Segurança

Para conectar o app a uma planilha Google privada:

1. Crie uma planilha no Google Sheets. O script cria sozinho as abas **`Backup`** (dados) e
   **`Log`** (auditoria das gravações) na primeira execução.
2. Acesse **Extensões → Apps Script**, apague o conteúdo e cole o `apps_script.gs`.
3. (Recomendado) Em **Configurações do Projeto (ícone de engrenagem) → Propriedades do script**, adicione:
   - **Propriedade:** `SHEETS_SECRET_TOKEN`
   - **Valor:** `uma-senha-ou-token-forte-aqui`
   - Se preferir, ajuste a constante `SHARED_SECRET` no topo do arquivo (menos seguro,
     porque o repositório é público).
4. Clique em **Implantar → Nova implantação**:
   - Tipo: **App da Web**
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
5. Copie a URL do App da Web gerada.
6. No app **Faturas**, vá na aba **Perfil**:
   - Cole a URL do App da Web em **URL do Google Apps Script**.
   - Digite o mesmo token no campo **Token Secreto de Acesso**.
   - Clique em **📡 Testar conexão** — deve responder `API 2.x` + número da revisão.
7. **Ao atualizar o `apps_script.gs` no futuro:** Extensões → Apps Script → cole a versão
   nova → **Implantar → Gerenciar implantações → ✏️ → Versão: "Nova versão" → Implantar**.
   A URL `/exec` não muda e o app continua funcionando sem reconfigurar.

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
