# Plano de evolução da plataforma DNZ

Data: 19/10/2026. Branch: `codex/melhorias-usabilidade`.
Estado: planejamento com a etapa 1 em implementação local. A migração aditiva está na branch e ainda não foi aplicada ao Supabase de produção.

**Decisão posterior — 20/10/2026:** Marketing e a integração Meta foram retirados do escopo. As telas, navegação e código exclusivo foram removidos; o histórico já gravado no Supabase permanece preservado como legado. Esta decisão substitui as propostas anteriores de criar Marketing, sincronizar Meta e expor métricas de anúncios pela Winners. A desativação remota das Edge Functions antigas precisa ser verificada separadamente.

A refatoração da interface está detalhada em [PLANO-REFATORACAO-LAYOUT.md](PLANO-REFATORACAO-LAYOUT.md), com os padrões obrigatórios em [DESIGN.md](../DESIGN.md). Esses documentos complementam este plano; as regras de negócio, cálculos e contratos de integração continuam definidos aqui.

## 1. Objetivo e decisões recebidas

Tornar a operação diária da loja simples, com dados consistentes entre telas, cálculos verificáveis e integração com a Winners, onde serão concentradas informações de clientes e WhatsApp.

Decisões do usuário:

- Substituir campos livres de categorias por menus selecionáveis e unificar filtros equivalentes.
- Cadastrar funcionários antes de selecioná-los nos registros.
- Decisão anterior, agora supersedida: substituir anúncios manuais por dados da Meta. Em 20/10/2026, Marketing/Meta foi retirado do escopo.
- Remover também Anúncios SV e Taxa de Retorno SV.
- Disponibilizar API para a Winners, especialmente para clientes e WhatsApp.
- Manter a OpenAI analisando, classificando e resumindo novas conversas, com resultado em Observação + badge IA. Não habilitar respostas autônomas a clientes.
- Manter o recorte de novas conversas da migração anterior, sem importar histórico do Chatlabs.

Interpretação operacional atualizada: retirar as telas antigas e Marketing. A remoção da interface não apaga os registros históricos, que permanecem como legado.

## 2. Evidências no código atual

| Evidência | Consequência para o plano |
| --- | --- |
| LeadsTable já usa Select em vários filtros, mas médico é editado livremente e vendedor usa sugestões livres | Padronizar também formulários e edição de células, além dos filtros |
| NewLeadDialog e AutomacoesTable misturam vendedores fixos, nomes dos leads e nomes dos áudios | Criar cadastro único, eliminar listas fixas e relacionar áudios pelo ID do funcionário |
| Migração de julho corrige Joyce/Joice e Rithelle/Rithielle | Manter tabela de equivalências e preservar rastreabilidade da migração |
| DetalhadoAmigoTable gera opções com Set de strings e tem origem tanto no resumo quanto na barra de filtros | Centralizar opções e estado; remover controle duplicado |
| Complementos do Amigo são relacionados por nome normalizado + data | Adotar ID externo do atendimento e resolver vínculos antigos ambíguos |
| Indicadores diários e consolidados usam fontes diferentes para vendas | Definir uma fonte de vendas e fórmulas compartilhadas antes de expor números pela API |
| PerdasSection considera todos que não compraram | Separar oportunidades abertas de perdas confirmadas |
| Metas contém datas legadas, configuração por mês e divisão semanal por quatro | Incorporar ano, calendário real e regras explícitas de distribuição |
| Anúncios depende de lançamentos/imagens; mensagens são tratadas como leads | Separar investimento, conversas, leads identificados e vendas atribuídas |
| Áudios de automações têm chaves com nomes de vendedores | Renomear funcionário não pode alterar o áudio escolhido |

Arquivos principais do inventário original: `src/pages/Index.tsx`, `LeadsTable.tsx`, `NewLeadDialog.tsx`, `DetalhadoAmigoTable.tsx`, `MultiSelectFilter.tsx`, `ScheduleTable.tsx`, `PerdasSection.tsx`, `MetasCalculator.tsx`, `AcompanhamentoDiarioSection.tsx`, `AutomacoesTable.tsx`, `AutomacaoDetailView.tsx`, `src/hooks/useIndicadoresData.ts` e `supabase/functions`.

Esta revisão usa o checkout atual. O inventário de valores reais e consumidores das funções em produção será realizado na etapa de execução correspondente.

## 3. Regra comum de filtros e preenchimento

Uma barra por tela: período, funcionário responsável e demais filtros aplicáveis. Busca por nome/telefone continua sendo texto. Categorias e pessoas cadastradas usam seleção com busca; a busca dentro do menu não cria valores novos.

| Campo/conceito | Comportamento proposto |
| --- | --- |
| Período | Calendário com Hoje, últimos 7 dias, este mês e intervalo; mês sempre acompanhado do ano |
| Funcionário responsável | Menu de funcionários cadastrados; mesma identidade usada para vendedor em vendas e automações |
| Médico | Cadastro de profissionais separado de funcionários da loja, vinculado ao ID Amigo quando disponível |
| Canal do lead | Categorias canônicas com ID; manter suborigem para Facebook/Instagram/Google, sem perder detalhe ao agrupar em Internet |
| Origem do atendimento | Vocabulário normalizado, mas dimensão distinta do canal comercial; pode receber mapeamento explícito para uma categoria de relatório |
| Situação comercial | Enum controlado: Em atendimento, Perdido, Venda realizada/Pós-venda; orçamento é uma etapa/evento próprio |
| Receita, visita, orçamento e resposta | Sim, Não e Não informado; valor vazio não deve virar Não automaticamente |
| Cliente | Busca única por nome ou telefone normalizado; seleção do cliente cadastrado quando houver vínculo |
| Observações | Texto livre; observação humana e resumo IA armazenados separadamente |

Semântica: opções do mesmo filtro combinam por OU; filtros diferentes combinam por E. “Todos” significa ausência de restrição; “Não informado” é uma opção real e separada. Opções vêm do cadastro, incluindo inativos quando necessários para pesquisar o histórico, e não apenas das linhas atualmente carregadas.

Unificar caixa, acentos e espaços para busca. Usar aliases explicitamente mapeados para correções de grafia. Não unir homônimos ou categorias de negócio apenas por similaridade textual. Preservar o valor original durante a migração e apresentar pendências de associação.

Mostrar filtros ativos em etiquetas removíveis, quantidade de resultados e Limpar filtros. Preservar o estado ao abrir um registro e voltar. Usar parâmetros de URL para categorias/datas sem dados pessoais; busca por nome/telefone fica no estado da sessão. Compartilhar componentes e contratos, mantendo o estado de filtros específico de cada tela.

Tabelas, cards, exportações e API devem consumir a mesma consulta e os mesmos filtros aplicáveis. Indicadores de contexto que deliberadamente usem uma base diferente devem mostrar essa base. Campo sem suporte em uma tela fica ausente; a API rejeita parâmetros inválidos em vez de ignorá-los.

Componentes propostos: FilterBar, DateRangeFilter, SearchableSelect, EmployeeSelect, DoctorSelect, CategorySelect e FilterChips. Reutilizar Radix, cmdk, date-fns, React Query e Zod já instalados. Garantir teclado, foco, labels, seleção por Enter/Espaço e layout móvel.

## 4. Cadastros e identidade dos dados

Modelos propostos, a ajustar ao inventário antes das migrações:

- Funcionários: ID, nome de exibição, ativo/inativo, função e usuário de login opcional. Gestor administra cadastro; funcionários usam opções existentes. Conta de acesso e cadastro de funcionário são entidades relacionadas, não sinônimos.
- Profissionais: ID interno, ID Amigo quando conhecido, nome e situação.
- Categorias/aliases: domínio, ID canônico, rótulo, valor legado e origem. Listas distintas por significado de negócio.
- Clientes: ID estável, nome, contatos normalizados e referências externas. Um cliente pode ter várias oportunidades, atendimentos e vendas.
- Oportunidades: cliente, canal/suborigem, funcionário responsável, situação, orçamento e próximos contatos.
- Vendas: ID, oportunidade/cliente, responsável pela venda, valor, data da venda e situação de cancelamento. A atribuição de venda não muda só porque o responsável atual do cliente mudou.
- Eventos: data de criação, orçamento, visita, venda, perda e reabertura. `updated_at` indica edição técnica, sem substituir data de venda ou perda.

Migração aditiva: adicionar IDs e novos campos, gerar proposta de associação, preencher correspondências inequívocas, revisar casos ambíguos e só depois tornar o novo contrato obrigatório para novos registros. Renomear/inativar funcionário preserva vínculos históricos. Manter auditoria de quem alterou, quando e qual valor anterior.

Nunca deduplicar cliente apenas pelo nome. Priorizar IDs de origem e contatos confirmados; números compartilhados ou identificadores WhatsApp LID sem correspondência ficam pendentes. A migração não deve criar leads comerciais a partir de todo disparo de automação.

## 5. Lógica por funcionalidade e navegação

Navegação proposta: Hoje; Comercial (Leads e Perdas); Atendimentos; Resultados (Indicadores, Metas e Acompanhamento); Automações. Escala médica, Cadastros e Configurações ficam acessíveis em uma área secundária.

| Funcionalidade | Lógica aplicável | Critério de conclusão |
| --- | --- | --- |
| Hoje | Próximos contatos, atrasados, dados pendentes e desempenho do dia; cada card abre a lista correspondente | Contagem corresponde à lista aberta, com base de data visível |
| Escala médica | Selecionar profissional por turno; mês/ano; modelos de semana configuráveis | Mesmo médico em escala e filtros; nenhum cruzamento entre anos |
| Leads | Selecionar cliente, funcionário e categorias; formulário curto; venda abre registro com valor/data | Salvar uma vez atualiza todas as visões relacionadas |
| Perdas | Somente oportunidades Perdido, motivo estruturado e data da perda; aguardando fica no comercial aberto | Aberto não entra na quantidade de perdas |
| Atendimentos Sua Visão | Renomear Detalhado; integrar por ID Amigo; complementar receita/visita e vincular oportunidade/venda | Mesmo atendimento não ganha complemento duplicado |
| Indicadores | Fonte única por métrica, filtro explícito, composição clicável | Totais diários e mensais conciliam quando medem os mesmos eventos |
| Metas | Metas por ano/mês, parâmetros compartilhados, distribuição por calendário/peso | Soma de metas diárias fecha com o mês; zeros não são tratados como ausência |
| Acompanhamento | Realizado derivado das vendas registradas; fechamento manual legado fica identificado e conciliado | Não somar fechamento manual e vendas detalhadas referentes ao mesmo valor |
| Automações | Público elegível por evento/data, funcionário e template; execução existente preservada | Migração não dispara mensagens nem cria fila retroativa |
| Observação IA | Resumo, classificação e data; abrir detalhe; anotação manual separada | Falha na análise não substitui observação válida; reprocessamento não envia mensagem |
| Cadastros | Funcionários, profissionais, canais e motivos | Edições de catálogo refletem em toda seleção |
| Winners | API de clientes, oportunidades, mensagens e análises com sincronização incremental | Repetir uma sincronização não duplica dados |

Outras simplificações: retirar Nova Linha/Atualizar genéricos onde não funcionam, reduzir cards repetidos, mostrar Salvando/Salvo/Erro, proteger valores calculados, mover simulador para Planejamento e retirar inferência de gênero por nome do fluxo principal.

## 6. Contrato dos cálculos

Separar dois tipos de análise: movimento do período (vendas feitas naquele período) e funil de uma base de oportunidades/atendimentos (o que aconteceu com aquele grupo). Não dividir vendas de um grupo por visitas de outro.

| Métrica | Regra proposta |
| --- | --- |
| Vendas do período | Quantidade de vendas válidas pela data de venda; cancelamentos identificados |
| Faturamento | Soma de valores das vendas válidas do período; dinheiro em decimal/centavos, sem soma de orçamento aberto |
| Ticket médio | Faturamento / quantidade dessas mesmas vendas |
| Conversão de orçamento | Oportunidades com orçamento que tiveram venda / oportunidades com orçamento da mesma base |
| Potencial Sua Visão | Atendimentos com receita / atendimentos elegíveis da mesma base |
| Presença DNZ | Atendimentos com receita vinculados a visita / atendimentos com receita da base |
| Conversão de visita | Visitas elegíveis com venda vinculada / visitas elegíveis da mesma base |
| Meta prevista de vendas | Períodos × média de atendimentos × taxa de receita × taxa de visita × taxa de conversão + previsão de loja/internet |
| Meta diária | Meta mensal × peso do dia / soma dos pesos; regra única para ausência de escala |
| Meta semanal | Soma das metas dos dias da semana dentro do mês, substituindo divisão fixa por quatro |
| Supermeta | Meta × 1,20, preservando o fator atual até alteração explícita |
| Cumprimento | Realizado / meta; mostrar dias encerrados, dias sem lançamento e comparação até hoje |

Para funil, cada atendimento/oportunidade contribui uma vez por etapa, mesmo com múltiplas vendas; mostrar data de corte dos resultados. Venda em outubro de lead criado em setembro pertence ao movimento de outubro e pode aparecer no funil de setembro. Esses dois relatórios terão nomes distintos.

Denominador zero produz “Sem base” (null na API), sem infinito. Taxa com base válida e nenhum resultado pode ser 0%. Totais são recalculados a partir de numeradores e denominadores somados, não pela média simples das porcentagens. Dados desconhecidos não viram zeros silenciosos. Valores antigos sem data/fonte comprovada mantêm marcação de legado; não inventar data de venda a partir da criação do lead.

Migrar configuração de metas para chave ano/mês e datas para ISO, apresentadas em português. Datas de negócio seguem America/Sao_Paulo; instantes ficam em UTC. Centralizar consultas/funções de métricas no backend e retornar versão da regra, filtros, data de corte e atualização das fontes, permitindo que painel e Winners exibam a mesma definição.

## 7. Escopo retirado — Marketing e anúncios

Em 20/10/2026, Marketing e a integração Meta foram cancelados. As interfaces de Anúncios DNZ, Anúncios SV, Taxa de Retorno SV e Marketing saem da operação; o histórico do banco permanece preservado. O código local das funções exclusivas `extract-ad-metrics` e `return-rate` foi removido. Antes de considerar a remoção completa em produção, confirmar se essas Edge Functions ou agendamentos ainda existem no projeto Supabase; não apagar tabelas ou registros históricos.

## 8. API para Winners

Primeira versão de leitura, com credencial própria da Winners. DNZ permanece responsável pelos registros operacionais e UAZAPI pela captura; Winners consome as informações. Escrita de volta ou envio pelo WhatsApp exigem contrato posterior, evitando dois sistemas decidindo o estado do mesmo atendimento.

Implementação proposta: Edge Function `platform-api`, rotas internas versionadas `/v1/...`. URL base proposta: `https://zwowpjdftalmlrocieog.supabase.co/functions/v1/platform-api/v1`. Não é um endpoint já publicado.

| Recurso GET proposto | Conteúdo | Escopo sugerido |
| --- | --- | --- |
| `/customers` e `/customers/:id` | Cliente, contatos e IDs de referência | customers:read |
| `/opportunities` | Canal, etapa, responsável e próximo contato | opportunities:read |
| `/employees` | ID, nome, ativo e função operacional | employees:read |
| `/sales` | Venda, valor, data, cliente e responsável | sales:read |
| `/conversations` | Conversa, instância, cliente vinculado, última atividade | conversations:read |
| `/conversations/:id/messages` | Mensagens capturadas, direção, horário e ID de origem | messages:read |
| `/conversations/:id/analysis` | Resumo/classificação IA, versão e período analisado | analysis:read |
| `/automation-events` | Disparos, respostas e vínculo com cliente/conversa | automations:read |
| `/metrics` | Agregados pelas definições compartilhadas | metrics:read |
| `/changes` | Inclusões, alterações e exclusões lógicas por cursor | Restrito aos escopos da credencial |

O núcleo inicial da Winners é cliente + conversa + mensagem + análise. Vendas, funcionários e agregados são liberados por necessidade do consumidor. Dados clínicos, notas livres completas e mídia não entram implicitamente no escopo inicial; definir campos exatos com a Winners antes de habilitar o acesso.

Credencial por consumidor com token de alta entropia mostrado uma vez, armazenado como hash, escopos, expiração, revogação e identificação em auditoria. A Winners usa a chave em seu backend. Nunca entregar `service_role` nem secrets de UAZAPI ou OpenAI. Validar autorização no servidor inclusive ao consultar um ID específico, aplicar limites por chave e registrar acessos sem conteúdo das mensagens. Não depender de CORS como autenticação.

Contrato: JSON, IDs imutáveis, paginação por cursor (100 por padrão, limite máximo definido), ISO 8601, moeda explícita, valores monetários em centavos, erros padronizados, limites de período, ordenação estável e campos de atualização. Entregar OpenAPI, exemplos com dados fictícios e instruções de consumo.

Sincronização inicial: exportação paginada com marco de corte e posterior captura de alterações. Sincronizações seguintes retomam por cursor; alterações incluem exclusões lógicas e fusões de clientes com ID de destino. Usar sobreposição/reconciliação e deduplicação por ID/versão para não perder gravações concorrentes, inclusive mensagens recebidas fora de ordem. Validar o mecanismo de cursor com casos reais de concorrência antes do corte.

Mensagens são únicas por instância + ID externo; o vínculo de cliente precisa considerar número normalizado e instância, sem casamento apenas por últimos dígitos. IDs LID não mapeados permanecem identificáveis, mas sem vínculo inventado. Não confundir resumo “pronto” com mensagem “capturada”: a Winners pode receber a mensagem antes da análise e obter a análise em uma atualização posterior.

Histórico: expor `capture_started_at` e disponibilidade por fonte. Entregar apenas o histórico realmente disponível, respeitando a decisão de não importar Chatlabs. Webhooks DNZ→Winners ficam como evolução opcional após o polling funcionar: eventos mínimos, assinatura, ID idempotente e tentativas; URLs e destinatário precisam ser definidos. Nenhum dado foi transmitido para Winners neste planejamento.

## 9. Execução por etapas

| Etapa | Entrega concreta | Dependências | Critério de aceite |
| --- | --- | --- | --- |
| 0 — Inventário | Mapa de campos, valores legados, funções usadas, contagens e contratos de data/métrica | Checkout e consulta de leitura ao projeto correto | Categorias, conflitos e fontes documentados; procedimento de recuperação definido |
| 1 — Cadastros | Funcionários/profissionais, aliases, IDs, administração mínima e migração compatível | Etapa 0 | Mesmo funcionário aparece uma vez; renomear/inativar preserva dados e áudios |
| 2 — Filtros e formulários | Barra única, menus com busca, edição por seleção, chips e estados de salvamento | Etapa 1 | Filtrar por pessoa/categoria inclui variantes migradas; cards e tabelas conciliam |
| 3 — Eventos e cálculos | Cliente/oportunidade/venda ligados, datas próprias, perdas corretas, metas por ano/mês | Etapas 0–2 | Um conjunto de casos conhecidos gera valores iguais na tela e no backend |
| 4 — Navegação e exclusões | Hoje, nomes claros, Resultados; retirar Anúncios DNZ/SV e Taxa Retorno SV | Etapa 2; cards de Hoje dependem de 3 | Sem links mortos; arquivo legado recuperável; funções obsoletas desativadas após mapa de consumidores |
| 5 — Marketing Meta | Cancelada em 20/10/2026; não implementar nem expor dados de anúncios | Fora do escopo | Nenhuma rota ou integração ativa; históricos legados preservados |
| 6 — Automações e IA | IDs de funcionário/cliente, datas de evento, vínculo correto de resposta, análise reprocessável | Etapas 1 e 3 | Migração não altera elegibilidade retroativamente; nenhuma mensagem real enviada por testes |
| 7 — API Winners | Rotas, autenticação por escopo, OpenAPI, snapshot e alterações incrementais | Modelo estável da 3 e conversas da 6 | Teste de consumo com dados fictícios; escopos/revogação/retomada funcionam; IDs coincidem com DNZ |
| 8 — Publicação gradual | Prévia, migrações aditivas, ativação por módulo e acompanhamento | Aceite técnico de cada entrega | Verificar Vercel e Supabase, conciliar amostra de produção e manter reversão possível |

O contrato de campos com Winners pode começar na etapa 0, enquanto cadastros/filtros são desenvolvidos. A API da Winners não depende de integrações de anúncios.

Separar entregas revisáveis na branch existente; não acumular toda a mudança em um deploy. Migração do banco primeiro em formato compatível, frontend depois, remoção de compatibilidade antiga só após conciliação. Não usar a branch de trabalho para apontar uma prévia mutável ao banco de produção sem avaliar o isolamento disponível.

## 10. Validação e recuperação

Casos obrigatórios: variantes de nome e homônimos; funcionário inativo no histórico; vários filtros combinados; sem resultados; Sim/Não/não informado; teclado e celular; dois funcionários editando; dezembro/janeiro e ano bissexto; venda posterior à criação; perda reaberta; edição que não muda data da perda; cancelamento de venda; ausência de escala; meta zero; lançamento vazio versus zero; denominador zero; arredondamento; conciliação de total diário/mensal.

Winners: chave ausente/inválida/revogada, escopo insuficiente, acesso por ID, limite de página, cursor/retomada, mensagens repetidas ou fora de ordem, análise atrasada e exclusão/fusão de cliente. Testar com fixtures sintéticas antes de usar leitura de produção; não enviar mensagens reais para validar código.

Executar build e checagens de tipos; testes focados nas regras alteradas, migrações e contrato API. Conciliar contagens, IDs, somas e pendências antes/depois da migração. Manter mapa de migração e cópia recuperável dos campos antigos; não depender apenas de rollback do frontend para reverter mudança de dados. Revogar acesso Winners independentemente do restante do app.

## 11. Informações necessárias durante a execução

- Winners: backend consumidor, campos necessários, se precisa do texto integral das mensagens ou apenas análises, frequência esperada, contato técnico/contrato e ambiente de homologação. A credencial real será emitida somente após contrato e autorização dos campos de destino.
- Negócio: resolver associações ambíguas de funcionários e clientes; conciliar datas de venda desconhecidas; definir tratamento de cancelamentos/devoluções e fonte dos fechamentos antigos.

Primeira entrega recomendada: etapas 0, 1 e 2, acompanhadas da remoção das abas antigas na etapa 4. Depois, consolidar eventos/cálculos e estabilizar conversas para publicar a API da Winners.

## 12. Estado atual — 19/10/2026

- A carga incremental de novos dados do Lovable foi reconciliada por ID no projeto Supabase `zwowpjdftalmlrocieog`. Foram adicionados 41 leads, 11 registros de acompanhamento diário, 311 linhas de detalhado e 24 disparos de automação. As outras tabelas não tinham IDs novos; a configuração singleton divergente não foi duplicada.
- Os campos `historico_conversa` dos novos disparos não foram importados, conforme a decisão de não trazer histórico do Chatlabs. Os `lead_id` importados foram conferidos depois de inserir os novos leads.
- A etapa 1 está iniciada na branch: cadastros de funcionários e profissionais, seletores de busca, IDs em leads/escala, filtros por IDs e seleção de funcionários para os áudios das automações. Nomes legados permanecem preenchidos para compatibilidade.
- A migração `20261019090000_employee_and_professional_directories.sql` e a interface ainda são apenas alterações locais revisáveis; não houve push, deploy de aplicação nem alteração de schema no banco nesta etapa.
- Verificação local: `npm run build` e `npx tsc -b` passaram. O build ainda alerta que o bundle principal excede 500 kB; o aviso de ordem do `@import` do Google Fonts foi corrigido.
- `npm audit fix` atualizou somente resoluções compatíveis no `package-lock.json`. A auditoria ainda indica 13 vulnerabilidades no grafo completo e 9 no relatório de produção; as correções restantes propostas exigem saltos maiores para Tailwind 4, Vite 8 ou React Router 7 e ficam para uma migração de dependências revisada separadamente.
