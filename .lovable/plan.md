

## Plano: Observação mostra apenas resposta do cliente

### Problema
Atualmente o resumo da IA tenta avaliar a conversa inteira (vendedor + cliente). O usuário quer que a **Observação** contenha apenas um resumo da **resposta do cliente** após a automação.

### Mudanças

#### 1. Atualizar prompt do `summarize-conversa`
Alterar o `SYSTEM_PROMPT` para instruir a IA a focar exclusivamente nas mensagens do cliente, ignorando as do vendedor. O resumo deve capturar a posição do cliente (interesse, recusa, agendamento, etc.).

#### 2. Passar contexto da mensagem original
No `whatsapp-webhook`, ao chamar `summarize-conversa`, incluir a `mensagem_enviada` da automação para que a IA saiba o contexto e resuma a resposta do cliente **em relação àquela mensagem**.

#### 3. Atualizar fallback de palavras-chave
Ajustar o `smartFallback` para filtrar apenas linhas do "Cliente" no histórico, ignorando mensagens do vendedor.

#### 4. Remover filtro `resposta_cliente = false` da função SQL
Atualizar `match_disparo_by_phone` para continuar capturando mensagens mesmo após a primeira resposta (dentro de 30 dias), permitindo que o resumo se atualize conforme a conversa evolui.

### Detalhes técnicos

**Arquivos editados:**
- `supabase/functions/summarize-conversa/index.ts` — novo prompt focado no cliente + fallback filtrado
- `supabase/functions/whatsapp-webhook/index.ts` — passar `mensagem_enviada` ao summarizer
- Migration SQL — atualizar `match_disparo_by_phone` removendo filtro `resposta_cliente = false`

