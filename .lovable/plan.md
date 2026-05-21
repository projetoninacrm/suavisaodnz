## Plano: subaba "Novos Agendamentos" na Sua Visão

### O que será feito

Hoje a aba **Sua Visão** mostra direto o conteúdo de `ConversasSection`. Vou transformar essa aba em **duas subabas**:

1. **Conversas** — exatamente o que já existe hoje (KPIs Chatlabs, status, origem, kanban). Sem mexer no comportamento.
2. **Novos Agendamentos** — nova tela alimentada pela API do Amigo.

### Comportamento da subaba "Novos Agendamentos"

- Filtro de período (Início / Fim) + botão **Hoje** e **Atualizar**, no mesmo padrão visual da subaba Conversas.
- Padrão inicial: Início = hoje, Fim = +30 dias.
- Busca atendimentos via `amigo-api` (`action: "attendances"`) no período escolhido, **sem filtro de status** (para pegar `scheduled`, `confirmed` etc.).
- Filtra somente unidade **Sua Visão – Padre Pedro Pinto** (mesmo critério do hook `useDetalhadoAmigo`).
- Mantém apenas consultas com `start_date >= agora` (consultas futuras), como você pediu.
- Descarta agendamentos cancelados (`canceled = true`).

### O que aparece na tela

- **3 KPIs no topo:**
  - **Total de agendamentos no período** (contagem de consultas marcadas)
  - **Pacientes únicos** (deduplicado por telefone)
  - **Hoje** (quantos têm `start_date` = data atual)
- **Quebra por tipo de consulta** (mini-kanban): conta por `agenda_event.name` (ex: Retorno, Consulta Particular, Exames Complementares, etc.)
- **Tabela** com as colunas: Data, Hora, Paciente, Telefone, Tipo de consulta, Médico, Status. Ordenada por data/hora crescente.

### Onde mexer

- `src/pages/Index.tsx` — no `case "Conversas"`, trocar o render direto de `<ConversasSection />` por um wrapper com subabas (`Tabs` do shadcn) que mostra Conversas ou Novos Agendamentos.
- Novo: `src/components/Dashboard/NovosAgendamentosSection.tsx` — componente da subaba.
- Novo: `src/hooks/useNovosAgendamentos.ts` — hook que chama `supabase.functions.invoke("amigo-api", { action: "attendances", params: { start_date, end_date } })`, filtra unidade + cancelados + futuras, e expõe os agrupamentos.
- **Nenhuma mudança em edge function nem no banco** — a função `amigo-api` já aceita exatamente esse payload.

### Limitação importante

A API do Amigo **não devolve a data em que o agendamento foi criado**. Portanto "novo" aqui = "tem consulta marcada no período futuro selecionado". Se mais tarde você quiser "marcados nas últimas 24h" mesmo, precisaríamos persistir os agendamentos diariamente (ex: snapshot no banco) para conseguir comparar — fica como evolução futura, fora deste plano.
