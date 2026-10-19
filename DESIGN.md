# Diretrizes de interface — Gerencia DNZ

Data: 19/10/2026. Estado: referência visual aplicada parcialmente na branch `codex/melhorias-usabilidade`; veja o [andamento](docs/PLANO-REFATORACAO-LAYOUT.md#12-estado-desta-entrega).
Escopo: toda a aplicação, incluindo autenticação, navegação, tabelas, formulários, relatórios, automações e configurações.

Este arquivo define a direção visual. O roteiro, o catálogo completo e os critérios de entrega estão em [PLANO-REFATORACAO-LAYOUT.md](docs/PLANO-REFATORACAO-LAYOUT.md). As regras de negócio permanecem no [plano de evolução](docs/PLANO-EVOLUCAO-PLATAFORMA.md).

## 1. Referência obrigatória

Preset solicitado: [shadcn/create — b1sRltPJg](https://ui.shadcn.com/create?preset=b1sRltPJg). Configuração conferida no navegador em 19/10/2026:

| Propriedade | Valor observado |
| --- | --- |
| Biblioteca base | Base UI |
| Estilo | Vega |
| Cor base | Neutral |
| Tema | Blue |
| Gráficos | Cyan |
| Fonte do corpo e dos títulos | Inter |
| Ícones | Lucide |
| Raio | Default |
| Menu | Default / Solid |
| Destaque do menu | Subtle |

Usar os valores exportados pelo preset como fonte dos tokens. “Default” é a opção do preset, não uma autorização para inventar um raio numérico. Registrar a exportação e a versão do gerador na implementação. As medidas de layout abaixo são decisões do DNZ, não propriedades inferidas do preset.

Destino técnico: shadcn sobre Base UI, React/TypeScript e Vite. O checkout atual usa Radix, Tailwind 3 e Plus Jakarta Sans: essa diferença exige migração explícita de APIs e estilos.

## 2. Tokens e linguagem visual

- Centralizar cores em variáveis semânticas: superfície, texto, borda, ação primária, destaque, foco, erro e gráficos. O shadcn documenta esse contrato em [Theming](https://ui.shadcn.com/docs/theming).
- Azul indica ação principal e seleção. Ciano identifica séries de gráficos. Sucesso, atenção e erro terão pares próprios de fundo/texto; não reutilizar `accent` como “sucesso”.
- Estados sempre combinam texto com ícone ou formato. Evitar depender só de vermelho/verde ou da cor do dia da semana.
- Superfícies neutras, borda discreta e sombras pequenas nos elementos flutuantes. Sem gradientes decorativos, cards aninhados ou paletas distintas por tela.
- Fonte Inter em toda a aplicação. Números de valores, datas e tabelas usam algarismos tabulares; valores monetários ficam alinhados à direita.
- Tipografia proposta: título de página 24/32 px, seção 18/28 px, corpo e tabela 14/20 px, apoio 12/16 px. Campos em celulares usam 16 px para evitar zoom de preenchimento. Texto de apoio não carrega a única informação necessária.
- Espaçamento em escala de 4 px: 4, 8, 12, 16, 24, 32 e 48. Recuo de página: 16 px no celular, 24 px no desktop; entre seções: 24 px.
- Ícones Lucide de 16 px em controles e 20 px em navegação. Ícones isolados têm nome acessível e Tooltip; ações frequentes exibem rótulo.
- Usar variantes compartilhadas para estados, tamanhos e densidade. Evitar classes de cor e raios arbitrários dentro de páginas.

## 3. Estrutura da aplicação

- Sidebar recolhível no desktop, proposta de 240 px aberta e 64 px recolhida. Em telas abaixo de 768 px, abrir navegação por Sheet.
- Cabeçalho de 64 px com acionador do menu, Breadcrumb, nome da página e menu da conta. “Gerencia DNZ” identifica o produto; “Escala de Trabalho” fica restrito à escala.
- Conteúdo principal fluido, com largura máxima proposta de 1600 px. Formulários extensos usam coluna de até 720 px.
- Cabeçalho da página: título, descrição curta quando necessária, estado da fonte e uma ação principal contextual. Ex.: “Novo lead”, “Cadastrar funcionário”, “Configurar meta”.
- Ordem comum: cabeçalho → filtros → resumo compacto → conteúdo → paginação. Cards e tabela respondem ao mesmo filtro, salvo base diferente explicitamente rotulada.
- Tabs apenas dentro de um domínio. Navegação entre módulos usa rotas e links, preservando voltar/avançar, atualização da página e link direto.
- Metas, filtros e tabelas continuam operáveis a 200% de zoom. Nenhum header fixo pode cobrir foco ou conteúdo.

## 4. Padrão de filtros

- Uma `FilterBar` por tela: período, busca por nome/telefone, funcionário e filtros específicos. “Mais filtros” reúne dimensões secundárias.
- Texto livre apenas na busca. Categorias, pessoas, origem, situação e respostas usam Select ou Combobox com pesquisa.
- Todos = ausência de restrição. Não informado = valor ausente. Sim, Não e Não informado permanecem distintos.
- Várias opções da mesma dimensão combinam por OU; dimensões diferentes combinam por E.
- Combobox usa ID do cadastro; nomes aparecem só como rótulos. Funcionários inativos continuam disponíveis nos filtros históricos.
- Período com início e fim, atalhos Hoje/7 dias/Este mês e ano sempre visível. Data de referência é rotulada: criação, atendimento, venda ou envio.
- Filtros ativos aparecem como Badges removíveis. Exibir quantidade filtrada e Limpar filtros. Ação de limpar não modifica registros.
- No celular: busca e período visíveis; demais filtros em Sheet com Aplicar/Limpar. O rascunho só altera os resultados ao aplicar.
- Preservar estado ao abrir/fechar detalhes. URL guarda filtros não pessoais; busca por cliente/telefone permanece na sessão.

## 5. Tabelas e detalhes

- Um padrão `DataTable` com configuração de colunas por domínio, ordenação, visibilidade, paginação e estados de carregamento/erro/vazio.
- Densidade padrão proposta de 48 px por linha. Modo compacto opcional de 40 px no desktop; controles de toque com área útil de pelo menos 44 × 44 px.
- Primeira coluna identifica a entidade; última reúne ações em Dropdown Menu. Status usa Badge; data e moeda têm formatação comum.
- No Comercial, colunas iniciais: cliente, situação, funcionário, canal, próximo contato e ações. Observações extensas abrem detalhe.
- No histórico de automações, “Observação” + Badge “IA” fica visível com resumo de até duas linhas e “Ver análise”. Data da análise e anotação humana ficam no detalhe.
- Linha não deve parecer um formulário permanentemente aberto. Edição rápida fica explícita em campos simples; edição completa abre Sheet.
- Formulários monetários, mudança de etapa e ações com vários campos usam confirmação de salvar. Não gravar valor parcial a cada tecla.
- Ordenação/filtro/paginação no servidor quando necessário ao volume. Total não pode ser calculado só com a página carregada; seleção em lote declara seu alcance.
- Em telas pequenas, reduzir colunas e usar uma lista de itens com detalhes. Grades que exigem comparação, como escala e acompanhamento, podem rolar horizontalmente dentro de região rotulada.
- Toda função disponível por hover ou clique direito também tem acesso por botão/teclado.

## 6. Formulários e feedback

- Field + controle + descrição + erro; label persistente associado ao campo. Placeholder nunca substitui label.
- Uma coluna em celulares; duas colunas somente para pares curtos relacionados em telas largas.
- Select para poucas opções, Combobox para catálogos extensos, Radio Group para escolha curta explícita, Checkbox para seleção múltipla, Switch para preferência binária imediata.
- Textarea fica para observação, motivo detalhado e template de mensagem. Datas, pessoas e categorias têm controles próprios.
- Sheet: detalhe/edição de registro. Dialog: tarefa curta. Alert Dialog: ação destrutiva ou consequência que precisa de confirmação. Drawer: interação curta no celular.
- Salvar exibe andamento, impede submissão duplicada e mantém os campos se houver erro. Erro de campo fica no campo; erro geral persistente usa Alert.
- Padronizar uma única infraestrutura de notificações na nova base. O adapter temporário deve atender os consumidores de `useToast` e Sonner sem emitir duas notificações.
- Mensagens em português: “Salvando…”, “Salvo”, “Não foi possível salvar”, “Tentar novamente”. Erros não expõem payloads, credenciais ou detalhes internos.
- Loading com Skeleton para estrutura, Spinner para ação e Progress apenas quando existir progresso mensurável. Nunca simular porcentagem.
- Empty diferencia primeira utilização, filtro sem resultado, fonte desconectada, acesso indisponível e falha de carregamento.

## 7. Métricas, IA e fontes

- Até quatro métricas principais por bloco inicial; demais dados em tabela ou expansão. Gráficos respondem a uma pergunta concreta e possuem alternativa tabular.
- Valores realizados, metas e simulações têm rótulos distintos. Mostrar período, unidade, fonte e última atualização.
- Uma taxa informa sua base; “Sem base” difere de 0%. Não recalcular regras comerciais apenas para adaptar a interface.
- Observação IA exibe resumo, classificação e horário; anotação humana permanece separada. Estados: aguardando, processando, concluída e falhou.
- OpenAI analisa, classifica e resume; este layout não cria respostas automáticas nem editor de atendimento por IA.
- Marketing sem conta conectada exibe configuração pendente. Winners sem API publicada exibe indisponibilidade real. Nenhuma tela deve apresentar conexão fictícia.

## 8. Acessibilidade e desempenho

- Navegação completa por teclado, foco visível, Escape fecha overlays, foco retorna ao acionador e erros são anunciados.
- Contraste alvo: 4,5:1 em texto normal e 3:1 em texto grande/elementos de controle; verificar as combinações reais exportadas pelo preset.
- `prefers-reduced-motion` respeitado. Transições funcionais curtas, propostas entre 120 e 180 ms.
- Verificar 360, 390, 768, 1024, 1440 e 1920 px; nenhum overflow horizontal da página inteira.
- Rotas e gráficos pesados carregam sob demanda. A galeria de todos os componentes não entra no carregamento inicial dos funcionários.
- A troca de layout não deve provocar consultas a todos os módulos na abertura da aplicação. Cada rota carrega sua necessidade; cache e invalidação são compartilhados.

## 9. Regra de conclusão visual

Uma tela está pronta quando utiliza shell, filtros, tabela/formulário e estados comuns; funciona em teclado/celular; preserva as regras e os totais anteriores ou documenta a mudança de negócio; e não mantém um segundo controle para a mesma ação.

Todos os componentes do catálogo shadcn escolhido terão exemplo real com dados fictícios na galeria interna de interface. Os módulos operacionais usam os componentes mapeados no plano, evitando acrescentar etapas só para exibir uma peça do catálogo.
