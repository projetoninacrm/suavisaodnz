# Auditoria dos cálculos

**Data da leitura:** 20/10/2026  
**Escopo:** rastrear fórmulas, fontes e grãos de agregação para orientar a refatoração visual. Esta auditoria descreve o código existente; não altera regras nem valores.

Fontes principais: `src/hooks/useIndicadoresData.ts`, `src/components/Dashboard/IndicadoresTable.tsx`, `src/components/Dashboard/MetasCalculator.tsx`, `src/components/Dashboard/AcompanhamentoDiarioSection.tsx`, `src/components/Dashboard/GoalSimulator.tsx` e `src/components/Dashboard/DetalhadoAmigoTable.tsx`.

## Visão geral dos resultados

O período é formado por mês(es) e ano selecionados. A grade gera os dias do período e exclui domingos. Para cada dia, a tela consulta atendimentos concluídos do Amigo na unidade cujo nome contém “Sua Visão” e “Padre Pedro Pinto”. Complementos da tabela `detalhado` são associados pelo nome normalizado e pela data `DD/MM/YYYY`.

| Indicador | Regra implementada | Fonte e grão |
| --- | --- | --- |
| Atendimentos | Quantidade de registros do Amigo filtrados para unidade, status e dia | Amigo, por atendimento/dia |
| Receitas | Atendimentos combinados com `detalhado.receita = Sim` | Amigo + `detalhado`, por atendimento/dia |
| Potencial | Receitas ÷ atendimentos × 100; zero se não há atendimentos | Razão dos totais do dia/período |
| Leads com orçamento | Leads com canal contendo “sua vis”, orçamento `Sim` e data de registro naquele dia | `leads`, por data de registro |
| Taxa de presença | Leads com orçamento ÷ receitas × 100; zero se não há receitas | Razão de fontes e eventos diferentes |
| Vendas do dia | Atendimentos combinados com `detalhado.venda = Sim` | Amigo + `detalhado`, por atendimento/dia |
| Conversão diária | Vendas do dia ÷ leads com orçamento × 100; zero se não há leads com orçamento | Razão de fontes e eventos diferentes |
| Faturamento | `acompanhamento_diario.faturamento_realizado`, pela chave ISO ou `DD/mmm`; ausência vira zero | Acompanhamento manual, por data |
| Ticket diário | Faturamento ÷ vendas do dia; zero se não há vendas | Fontes combinadas |

No consolidado, atendimentos, receitas, leads com orçamento e faturamento são somados pelos dias. O total de vendas é substituído pela contagem de leads `Sua Visão` com `venda = Sim` no período. Potencial, presença, conversão e ticket são recalculados sobre esses totais, não pela média dos percentuais diários. A visualização semanal também conta vendas a partir desses leads; a média por dia da semana considera apenas dias com faturamento maior que zero.

## Metas

As configurações são carregadas por mês (`jan` a `dez`). Quando há escala no mês, a quantidade de períodos considera cada turno preenchido; um dia com manhã e tarde pesa 1, um dia com um único turno pesa 0,5 e sem turno pesa 0. Sem turnos preenchidos, a previsão de atendimentos mantém os períodos da configuração do mês, enquanto a distribuição diária da meta de faturamento usa os dias exibidos, que são todos os dias do mês exceto domingos.

| Valor | Regra implementada |
| --- | --- |
| Atendimentos previstos | períodos × média de atendimentos configurada |
| Atendimentos com receita | atendimentos previstos × percentual de receita |
| Atendimentos com comparecimento à loja | atendimentos com receita × percentual de comparecimento |
| Meta Sua Visão | atendimentos com comparecimento à loja × percentual de conversão |
| Meta total de vendas | meta Sua Visão + vendas configuradas para Loja + vendas configuradas para Internet |
| Supermeta | meta total de vendas × 1,2 |
| Meta de faturamento | valor mensal configurado |
| Ticket médio planejado | meta de faturamento ÷ meta total de vendas; zero se não há vendas previstas |
| Meta diária completa | meta mensal ÷ peso total do mês |
| Meta diária de meio período | meta diária completa × 0,5 |
| Meta semanal | meta mensal ÷ 4 |

No acompanhamento, a meta de cada dia é mensal × peso do dia ÷ peso total. O consolidado soma a meta base e o realizado dos dias que têm pelo menos um dos dois campos preenchido. Um campo nulo no dia preenchido soma como zero. Os tickets do consolidado são faturamento ÷ vendas, com zero como resultado quando o denominador é zero.

## Simulador

Os valores simulados ficam no `localStorage` deste navegador. A tela calcula faturamento = vendas × ticket médio; visitas = vendas ÷ conversão; receitas = visitas ÷ taxa de presença; atendimentos = receitas ÷ potencial. As quantidades de visitas, receitas e atendimentos são arredondadas ao inteiro mais próximo. Taxas iguais a zero resultam em quantidade zero. A simulação não grava metas nem realizado.

## Métricas do detalhado Amigo

Consultas e Receitas Totais consideram os registros do período e os filtros de cliente, profissional e receita; ignoram origem, tipo de atendimento, venda e visita à loja. A busca por cliente aceita parte do nome sem diferenciar maiúsculas e minúsculas, ou parte do telefone após remover caracteres de formatação. Receitas potenciais, visitas à loja e vendas usam todos os filtros da lista, inclusive origem, tipo, venda e visita. Taxa de presença = visitas à loja ÷ receitas potenciais; conversão = vendas ÷ visitas à loja; receitas × consultas = receitas potenciais ÷ consultas. A média de idade usa somente registros de venda com idade preenchida. As fórmulas e as bases percentuais permanecem iguais.

## Referência numérica sintética para a interface

Este cenário é fictício e serve para conferir rótulos, bases e agregações sem consultar ou modificar dados reais. Considere dois dias úteis de outubro de 2026:

| Data | Atendimentos Amigo | Receitas no detalhado | Leads Sua Visão com orçamento Sim | Vendas nos atendimentos | Vendas nos leads | Faturamento manual |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 05/10/2026 | 4 | 3 | 2 | 1 | 2 | R$ 800,00 |
| 06/10/2026 | 2 | 1 | 1 | 1 | 2 | R$ 900,00 |

Resultados diários esperados: em 05/10, potencial 75%, presença 66,67%, conversão 50% e ticket R$ 800,00; em 06/10, potencial 50%, presença 100%, conversão 100% e ticket R$ 900,00. Presença usa leads com orçamento marcado ÷ receitas do Amigo/detalhado; conversão diária usa vendas dos atendimentos ÷ esses leads.

No consolidado mensal esperado: 6 atendimentos, 4 receitas, potencial 66,67%, 3 leads com orçamento marcado, presença 75%, 4 vendas dos leads, conversão 133,33%, faturamento R$ 1.700,00 e ticket R$ 425,00. O resultado de conversão acima de 100% é possível na regra atual porque numerador e denominador vêm de eventos/fontes diferentes. As vendas diárias somam 2, enquanto o cartão mensal mostra 4; essa divergência documenta a origem atual, não uma falha de soma.

O faturamento semanal esperado para a semana 2 é R$ 1.700,00. A média por dia da semana considera apenas dias com faturamento positivo: segunda-feira R$ 800,00 e terça-feira R$ 900,00. Para conferir Metas, com 10 períodos, média de 3 atendimentos, percentuais de receita/comparecimento/conversão de 60%/50%/66%, 2 vendas de Loja, 3 de Internet e R$ 60.000,00 de faturamento mensal, os resultados esperados são 30 atendimentos previstos, 18 com receita, 9 comparecimentos, 5,94 vendas previstas de Sua Visão, 10,94 vendas totais, supermeta 13,128 e ticket planejado de aproximadamente R$ 5.484,46. No Simulador, 8 vendas, ticket R$ 400, potencial 75%, presença 60% e conversão 50% resultam em R$ 3.200,00, 16 leads com orçamento, 27 receitas e 36 atendimentos após os arredondamentos implementados.

## Pontos para validar antes de qualquer mudança de regra

- As métricas diárias usam vendas dos registros de atendimento; o consolidado e os totais semanais usam vendas de leads. Os números podem divergir. Confirmar qual fonte representa a venda oficial e se o cartão mensal deve reconciliar com a soma diária.
- A métrica “Leads com orçamento” conta leads com orçamento `Sim` pela data de cadastro; isso não confirma uma visita física à loja. Confirmar se a regra deve representar visita efetiva e usar data de atendimento.
- A associação Amigo ↔ `detalhado` usa nome e dia e escolhe a primeira correspondência. Homônimos no mesmo dia podem compartilhar complemento e afetar receitas/vendas.
- Configurações e acompanhamento são filtrados por mês sem ano em partes do fluxo; a lista de metas também é indexada pelo nome do mês. Confirmar se os dados devem se repetir entre anos ou se o ano precisa fazer parte da chave. A interface agora avisa quando o mês selecionado reúne anos diferentes ou datas sem ano explícito, sem alterar a apuração.
- A tela Escala seleciona mês e ano, mas `MetasCalculator` ainda filtra escalas e acompanhamentos apenas pelo mês; o ano usado para gerar placeholders é inferido do primeiro registro daquele mês. Bases com mais de um ano podem misturar dados na meta. Confirmar a semântica anual antes de alterar essa regra.
- A fórmula semanal `ceil((dia + diaDaSemanaDoPrimeiroDia)/7)` usa semanas de calendário iniciadas no domingo e considera o deslocamento do primeiro dia para a semana parcial inicial. A interface agora explicita esse agrupamento; confirmar se corresponde à regra desejada antes de alterar a fórmula.
- A média de faturamento por dia da semana exclui dias com valor zero; confirmar se o rótulo deve representar apenas dias com faturamento ou todos os dias da semana.
- `useMetasConfig` usa `Number(valor) || padrão`, então uma configuração explicitamente salva como zero volta ao padrão ao carregar. Confirmar se zero é um valor permitido antes de corrigir a leitura.
- Comentários do acompanhamento mencionam redistribuição dinâmica para dias futuros, mas a implementação atual exibe a distribuição uniforme e calcula os valores restantes sem usá-los. Alinhar comentário e comportamento após validar a regra esperada.

## Estado da refatoração

Nenhuma fórmula foi alterada nesta etapa. O catálogo de categorias afeta apenas a seleção e o agrupamento de origens no filtro de atendimentos; aliases explícitos podem agrupar registros que antes eram filtrados separadamente. A comparação numérica de referência deve ser registrada antes de qualquer correção dos pontos acima, usando o mesmo período, filtros e snapshot de dados.

## Verificação automatizada dos contratos

As fórmulas puras do consolidado de Resultados, da projeção mensal de Metas, da distribuição diária ponderada e do Simulador ficam em `src/lib/reportCalculations.ts`, importadas pelas telas que as usam. `npm run test:calculations` executa cinco cenários sintéticos em `tests/calculation-contracts.test.ts`, incluindo o consolidado com conversão acima de 100%, as metas com peso completo/meio período, o simulador e denominadores zerados. Esses testes protegem os resultados documentados; não resolvem as decisões de regra listadas acima nem substituem a comparação com snapshot autenticado de dados reais.
