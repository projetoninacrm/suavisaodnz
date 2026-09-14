# Corrigir inclusão do Detalhado em Leads

## Alterações
- Encaminhar a inclusão do contato pelo mesmo fluxo central usado pela aba Leads, para atualizar a lista em memória imediatamente após salvar.
- Usar a data atual no novo lead, garantindo que ele apareça no filtro mensal padrão da aba Leads.
- Manter somente nome e telefone preenchidos; os demais campos continuarão para preenchimento manual.
- Validar a compilação e o fluxo visível entre as duas abas.

## Detalhes técnicos
- Passar uma função de inclusão de `Index.tsx` para `DetalhadoAmigoTable.tsx`.
- Remover a gravação direta isolada do componente Detalhado e reutilizar `useLeads.addLead`.
