# Integração de IA

As funções usam diretamente a API Responses da OpenAI. `OPENAI_API_KEY` permanece nos secrets do Supabase `zwowpjdftalmlrocieog`, sem exposição no frontend. O cliente compartilhado usa `store: false`, timeout, respostas estruturadas e erros sanitizados.

| Função | Uso | Modelo padrão |
| --- | --- | --- |
| extract-ad-metrics | Extração de métricas de prints | gpt-4.1-mini |
| import-schedule-image | Leitura de imagem/PDF da escala | gpt-4.1 |
| summarize-conversa | Resumo das novas mensagens de automações | gpt-4.1-mini |
| whatsapp-analise | Classificação e relatório na aba Análise WhatsApp | gpt-4.1-mini |

## WhatsApp a partir da ativação

A UAZAPI DNZ entrega os eventos ao receptor `whatsapp-webhook`. O receptor exige o token da instância (`UAZAPI_TOKEN_DNZ`) no envelope; por isso ele usa `verify_jwt = false`. Os endpoints de consulta e análise exigem JWT e usuário autenticado.

A migração `20261013120000_whatsapp_forward_capture.sql` registra o instante inicial e cria uma caixa de entrada com RLS, leitura para usuários autenticados e escrita exclusiva do backend. Mensagens anteriores ao instante inicial, eventos de histórico e grupos são ignorados. A chave única de instância/mensagem impede duplicatas. O envelope e seus tokens não são armazenados.

O receptor confirma a entrega após persistir a mensagem. Resumos de automações são calculados em segundo plano; falhas preservam a mensagem na caixa de entrada. Identificadores LID são armazenados sem tentativa de adivinhar o telefone do lead. Conteúdo histórico já importado permanece no banco, mas não entra na análise nova.

A análise considera até 1.000 mensagens recentes do período, até 50 mensagens por conversa e até 20 conversas pela interface. A classificação é inferida pela IA e não altera agendas ou cadastros. Áudio e outras mídias aparecem como marcadores, sem transcrição. Respostas automáticas a clientes ainda não estão implementadas.

Os nomes `chatlabs-analise` e `chatlabs-conversas` ficam como aliases de compatibilidade para os novos endpoints. Nenhuma chamada ao ChatLabs nem `CHATLABS_TOKEN` é necessária. Os aliases retornam o novo contrato baseado nas mensagens do Supabase.

## Publicação

1. Aplicar a migração e publicar as funções pelo GitHub integrado à branch main.
2. Confirmar que `OPENAI_API_KEY` e `UAZAPI_TOKEN_DNZ` estão configurados no projeto correto.
3. Somente depois, atualizar o webhook existente da UAZAPI para `https://zwowpjdftalmlrocieog.supabase.co/functions/v1/whatsapp-webhook`, mantendo o evento messages e a exclusão de grupos.
4. Publicar o frontend na Vercel e conferir a aba Análise WhatsApp.

Overrides opcionais: `OPENAI_MODEL`, `OPENAI_METRICS_MODEL`, `OPENAI_SCHEDULE_MODEL`, `OPENAI_SUMMARY_MODEL`, `OPENAI_ANALYSIS_MODEL`.

## Validação local de 13/10/2026

TypeScript do frontend e das funções verificado, build concluída e 16 testes simulados aprovados. Os testes cobrem token, corte temporal, grupos, histórico, identificadores LID, deduplicação, persistência e falhas para retry. Nenhuma mensagem foi enviada a clientes como teste.

Referências: [OpenAI Responses](https://developers.openai.com/api/docs/guides/text), [UAZAPI webhooks](https://docs.uazapi.com/docs/integrations-webhooks), [eventos de mensagens](https://docs.uazapi.com/webhook/messages).
