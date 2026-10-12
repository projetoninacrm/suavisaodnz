# Integração de IA

As quatro funções de IA usam diretamente `https://api.openai.com/v1/responses`.
A chave `OPENAI_API_KEY` fica nos secrets do Supabase, nunca no frontend ou na Vercel.
O cliente REST compartilhado usa `store: false`, timeout e tratamento de recusa,
resposta incompleta, chave inválida, cota esgotada e limite temporário de requisições.
Logs não incluem prompts, arquivos, respostas do modelo ou credenciais.

| Função | Como é usada | Resultado | Modelo padrão / secret opcional |
| --- | --- | --- | --- |
| `extract-ad-metrics` | `useAnuncios.ts` envia um print de Meta/Google Ads | JSON com investimento, mensagens e cliques; o dashboard calcula conversão/CPL e salva as métricas | `gpt-4.1-mini` / `OPENAI_METRICS_MODEL` |
| `import-schedule-image` | `ScheduleTable.tsx` envia imagem/PDF da escala mensal | JSON com dias e médicos; a função substitui a escala do mês/aba no banco | `gpt-4.1` / `OPENAI_SCHEDULE_MODEL` |
| `summarize-conversa` | `whatsapp-webhook` envia histórico e mensagem original para resumir respostas do cliente | `{ summary, provider }`; preserva o fallback local por palavras-chave quando a API falha | `gpt-4.1-mini` / `OPENAI_SUMMARY_MODEL` |
| `chatlabs-analise` | Endpoint com período e amostra; busca conversas agendadas/não agendadas no ChatLabs | Relatório de padrões, perdas, scripts e treinamento; exige também `CHATLABS_TOKEN` | `gpt-4.1-mini` / `OPENAI_ANALYSIS_MODEL` |

Não foi encontrada chamada de `chatlabs-analise` no frontend atual. O endpoint
continua disponível para seus consumidores existentes. Os plugins Vite e o
adaptador de autenticação de preview do Lovable não são modelos de IA.

As extrações de métricas e escala usam JSON Schema estrito. Os contratos existentes
do dashboard foram mantidos. Na escala, dias inválidos/duplicados e resultados
sem dias úteis são rejeitados antes de modificar o banco. O resumo continua
priorizando a posição do cliente, e informa `provider: "fallback"` quando usa
regras locais em vez da OpenAI.

## Configuração e publicação

Projeto: `zwowpjdftalmlrocieog` (`suavisaodnz`).

1. Salve `OPENAI_API_KEY` nos secrets desse projeto. A conta da API precisa ter
   crédito/cota e acesso aos modelos. A assinatura ChatGPT não substitui a chave da API.
2. Os secrets por função são opcionais. `OPENAI_MODEL` é um override global;
   um override específico por função tem prioridade sobre ele.
3. Autentique a CLI do Supabase com uma conta que acessa a organização Nina.
   Confira o acesso e o secret antes de publicar:

```sh
npx supabase projects list
npx supabase secrets list --project-ref zwowpjdftalmlrocieog
npx supabase functions deploy extract-ad-metrics --project-ref zwowpjdftalmlrocieog --use-api
npx supabase functions deploy import-schedule-image --project-ref zwowpjdftalmlrocieog --use-api
npx supabase functions deploy summarize-conversa --project-ref zwowpjdftalmlrocieog --use-api
npx supabase functions deploy chatlabs-analise --project-ref zwowpjdftalmlrocieog --use-api
```

O JWT das funções permanece habilitado conforme `supabase/config.toml`.
Essas alterações não exigem migração de tabelas nem mudança de variáveis na Vercel.
A implantação das Edge Functions é separada do deploy do frontend na Vercel.
O secret antigo do Lovable não é usado pelo código migrado; mantenha-o enquanto
uma versão antiga puder precisar de rollback.

## Validação

```sh
npx deno check --no-lock --node-modules-dir=none supabase/functions/extract-ad-metrics/index.ts supabase/functions/import-schedule-image/index.ts supabase/functions/summarize-conversa/index.ts supabase/functions/chatlabs-analise/index.ts
npx deno test --no-lock --node-modules-dir=none --allow-env supabase/functions/_shared/
npm run build
```

Os testes do cliente usam apenas conteúdo fictício e rede simulada. Para validar
a API real após publicação, comece com um resumo fictício e um print de métricas
fictício; confirme `provider: "openai"` no resumo. Não use a importação de escala
em produção como teste: ela substitui registros do mês selecionado. A integração
ChatLabs busca conversas reais; sua validação deve respeitar o escopo autorizado.

Referências: [Responses](https://developers.openai.com/api/docs/guides/text),
[Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs),
[arquivos e PDFs](https://developers.openai.com/api/docs/guides/file-inputs).

## Publicação e evidências de 12/10/2026

- `OPENAI_API_KEY` salva nos secrets de `zwowpjdftalmlrocieog`.
- As quatro funções foram publicadas no projeto de produção pelo dashboard.
  O código anterior baixado de cada função correspondia à versão do repositório
  antes da migração. Foram preservados ZIPs locais para rollback.
- Para publicar pelo editor, cada `index.ts` inclui o conteúdo do helper
  compartilhado; o repositório mantém o helper separado. O código completo no
  editor foi conferido antes de cada publicação. A publicação pela CLI inclui
  normalmente o helper através do import relativo.
- TypeScript das quatro funções verificado, 10 testes fictícios aprovados e
  build Vite concluído. A build manteve avisos existentes de CSS e tamanho de bundle.
- API OpenAI real: GPT-4.1 mini retornou JSON estrito correto; GPT-4.1 leu um PDF
  fictício e preservou o dia e os nomes esperados.
- Endpoint `summarize-conversa` em produção: HTTP 200, resumo do conteúdo fictício
  e `provider: "openai"`.
- Endpoint `extract-ad-metrics` em produção: HTTP 200; print fictício retornou
  investimento `10.5`, mensagens `3` e cliques `25`, conforme a imagem.
- Não foi executada importação de escala no banco como teste, pois ela substitui
  os registros do mês. O caminho de PDF foi verificado diretamente na API e a
  validação anterior à escrita foi coberta por testes simulados.
- `CHATLABS_TOKEN` não está configurado no projeto. O código de `chatlabs-analise`
  já usa OpenAI, mas a análise real de ChatLabs depende desse secret. Não foram
  enviadas conversas reais do ChatLabs durante a validação.
