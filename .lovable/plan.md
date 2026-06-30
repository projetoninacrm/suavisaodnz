## 1) Importar agenda do mês por imagem ou documento

Adicionar, na aba **Agenda**, um botão **"Importar Agenda"** ao lado de "Gerar Escala", abrindo um modal com área de drag-and-drop (arrastar imagem PNG/JPG ou PDF, ou clicar para selecionar).

Fluxo:

1. Usuário arrasta a foto/print da planilha de escala.
2. Frontend envia o arquivo (base64) para uma nova edge function `import-schedule-image`.
3. A função usa o **Lovable AI Gateway** (modelo Gemini com visão) para extrair, em JSON, cada linha da escala:
   - `date` (no formato `YYYY-MM-DD`, usando o mês selecionado)
   - `day_of_week` (`SEG`, `TER`, …)
   - `morning_shift` (nome do médico das 8h–12h, vazio se "—")
   - `afternoon_shift` (nome do médico das 13h–18h, vazio se "—")
4. A função apaga os schedules existentes do mês selecionado e insere as linhas novas em `schedules`, replicando exatamente a imagem.
5. Frontend mostra toast e recarrega a tabela.

Prompt do modelo deixa claro: ignorar domingos, usar maiúsculas, traços (`-`, `—`) viram string vazia, datas só do mês alvo.

## 2) Corrigir aba Metas quando o mês ainda não tem escala

Hoje, com `pesoTotalDias = 0` (mês sem escala — caso de Julho no print), todos os cálculos da seção **Acompanhamento Diário** ficam zerados, mesmo após salvar a Meta de Faturamento Mensal.

Ajustes em `MetasCalculator.tsx` + `AcompanhamentoDiarioSection.tsx`:

- Quando `pesoTotalDias === 0`, usar como denominador a quantidade de dias úteis exibidos (`displaySchedules.length`, todos os dias do mês exceto domingo) com peso 1 cada, ainda aplicando a regra 60/40 por quinzena.
- Com isso:
  - `Meta Faturamento` (card verde) passa a exibir o valor configurado mesmo sem escala.
  - Cada linha diária recebe uma meta proporcional (em vez de R$ 0).
  - `Meta Vendas` continua dependendo de períodos × média (só passa a ter valor depois que a escala for importada/gerada).
- Manter o rótulo "s/ médico" e o comportamento de não exigir escala para registrar vendas externas.

## Arquivos afetados

- `supabase/functions/import-schedule-image/index.ts` (novo)
- `supabase/config.toml` (registrar a função sem JWT)
- `src/components/Dashboard/ScheduleTable.tsx` (botão + modal de importação)
- `src/components/Dashboard/MetasCalculator.tsx` (fallback de peso)
- `src/components/Dashboard/AcompanhamentoDiarioSection.tsx` (fallback de peso)

## Pontos a confirmar

- Posso apagar e recriar os registros do mês selecionado ao importar (substituição total), ou prefere que a importação só adicione dias que ainda não existem?
- Para PDFs com várias páginas, considero apenas a primeira página da escala — ok?
