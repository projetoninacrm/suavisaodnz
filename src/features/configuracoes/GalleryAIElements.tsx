import { useState } from "react";
import {
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleDashed,
  Clock3,
  FileText,
  Folder,
  FolderOpen,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bubble, BubbleContent } from "@/components/ui/bubble";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CodeBlock,
  CodeBlockContent,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Message, MessageContent, MessageFooter, MessageHeader } from "@/components/ui/message";
import { MessageScroller, MessageScrollerContent, MessageScrollerItem, MessageScrollerViewport } from "@/components/ui/message-scroller";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Trace, TraceCollapsible, TraceCollapsibleContent, TraceCollapsibleTrigger, TraceDescription, TraceIcon, TraceLine, TraceTitle } from "@/components/ui/trace";

const reviewSteps = [
  ["Conversa recebida", "10:42"],
  ["Campos organizados", "10:42"],
  ["Classificação sugerida", "10:43"],
] as const;

const aiPatterns = [
  "Chain of Thought",
  "Chat",
  "Checkpoint",
  "Confirmation",
  "Context",
  "File Tree",
  "Inline Citation",
  "Message",
  "Model Selector",
  "Plan",
  "Prompt Input",
  "Queue",
  "Reasoning",
  "Sources",
  "Stack Trace",
  "Subagent",
  "Suggestion",
  "Task",
  "Terminal",
  "Test Results",
  "Tool",
] as const;

export default function GalleryAIElements() {
  const [reviewed, setReviewed] = useState(false);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Leitura da conversa e resultado para a equipe</CardTitle>
          <CardDescription>Chat, Message, Bubble e Message Scroller em leitura. O texto é fictício e não é enviado ao cliente.</CardDescription>
        </CardHeader>
        <CardContent>
          <MessageScroller className="h-72 rounded-md border">
            <MessageScrollerViewport aria-label="Conversa fictícia em leitura" className="h-full p-4">
              <MessageScrollerContent className="space-y-4">
                <MessageScrollerItem messageId="demo-customer" scrollAnchor>
                  <Message align="start">
                    <MessageContent className="max-w-[85%]">
                      <MessageHeader>Mensagem capturada · cliente</MessageHeader>
                      <Bubble variant="secondary"><BubbleContent>Queria saber se consigo retornar amanhã para concluir o atendimento.</BubbleContent></Bubble>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
                <MessageScrollerItem messageId="demo-analysis">
                  <Message align="end">
                    <MessageContent className="max-w-[90%]">
                      <MessageHeader><Bot className="size-4 text-primary" aria-hidden="true" />Análise para a equipe<Badge variant="secondary">Fictícia</Badge></MessageHeader>
                      <Bubble variant="outline" align="end" className="w-full max-w-full">
                        <BubbleContent>
                          <p><strong>Categoria sugerida:</strong> retorno solicitado.</p>
                          <p className="mt-1 text-muted-foreground"><strong>Resumo:</strong> cliente pretende retomar o atendimento amanhã.</p>
                        </BubbleContent>
                      </Bubble>
                      <MessageFooter>Resultado interno para revisão; nenhuma resposta foi redigida ou enviada.</MessageFooter>
                    </MessageContent>
                  </Message>
                </MessageScrollerItem>
              </MessageScrollerContent>
            </MessageScrollerViewport>
          </MessageScroller>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contexto, fontes e arquivos</CardTitle>
            <CardDescription>Context, Inline Citation, Sources, File Tree e Model Selector com referências fictícias.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium">Contexto fornecido à análise</span>
                <span className="tabular-nums text-muted-foreground">3 de 8 campos</span>
              </div>
              <Progress value={38} aria-label="Uso ilustrativo do contexto" />
              <p className="text-xs text-muted-foreground">Origem: WhatsApp · etapa: pós-venda · cliente: registro fictício</p>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Fontes da classificação</p>
              <ItemGroup className="gap-2">
                <Item variant="muted" size="sm">
                  <ItemMedia variant="icon"><FileText aria-hidden="true" /></ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      <HoverCard>
                        <HoverCardTrigger href="#fonte-ficticia-1" onClick={(event) => event.preventDefault()} className="underline decoration-dotted underline-offset-4">
                          Guia de categorias · seção 2
                        </HoverCardTrigger>
                        <HoverCardContent><p className="text-sm font-medium">Referência fictícia [1]</p><p className="mt-1 text-xs text-muted-foreground">Guia de categorias de atendimento, exemplo interno, seção 2.</p></HoverCardContent>
                      </HoverCard>
                    </ItemTitle>
                    <ItemDescription>Fonte ilustrativa, sem consulta a documentos reais.</ItemDescription>
                  </ItemContent>
                  <Badge variant="outline">[1]</Badge>
                </Item>
                <Item variant="muted" size="sm">
                  <ItemMedia variant="icon"><FileText aria-hidden="true" /></ItemMedia>
                  <ItemContent><ItemTitle>Conversa demonstrativa</ItemTitle><ItemDescription>Trecho de exemplo usado como entrada.</ItemDescription></ItemContent>
                  <Badge variant="outline">[2]</Badge>
                </Item>
              </ItemGroup>
            </div>

            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">Arquivos do registro fictício</p>
              <ul className="space-y-1 text-sm">
                <li className="flex items-center gap-2"><FolderOpen className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Atendimento</li>
                <li className="ml-5 flex items-center gap-2"><FileText className="h-4 w-4 text-muted-foreground" aria-hidden="true" />transcricao-exemplo.txt</li>
                <li className="ml-5 flex items-center gap-2"><Folder className="h-4 w-4 text-muted-foreground" aria-hidden="true" />anexos <span className="text-xs text-muted-foreground">(1 arquivo fictício)</span></li>
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Model Selector · configuração ilustrativa</p>
              <Select defaultValue="openai-analysis" disabled>
                <SelectTrigger aria-label="Modelo ilustrativo de análise">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent><SelectItem value="openai-analysis">OpenAI · análise interna</SelectItem></SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Etapas públicas e revisão humana</CardTitle>
            <CardDescription>Checkpoint, Plan, Queue, Task, Tool, Subagent, Confirmation e Suggestion sem execução real.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Trace aria-label="Etapas fictícias de uma análise">
              {reviewSteps.map(([step, time]) => (
                <TraceLine key={step}>
                  <TraceIcon><CheckCircle2 className="text-success" /></TraceIcon>
                  <TraceTitle>{step}</TraceTitle>
                  <TraceDescription>{time}</TraceDescription>
                </TraceLine>
              ))}
              <TraceCollapsible>
                <TraceCollapsibleTrigger>
                  <TraceLine>
                    <TraceIcon><LockKeyhole /></TraceIcon>
                    <TraceTitle>Raciocínio interno ocultado</TraceTitle>
                  </TraceLine>
                  <span className="text-xs">Por quê?</span>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                  <p className="text-sm">Esta interface mostra somente etapas operacionais, fontes e resultado resumido. O raciocínio privado do modelo não é exibido.</p>
                </TraceCollapsibleContent>
              </TraceCollapsible>
            </Trace>

            <div className="grid gap-2 sm:grid-cols-2">
              <Item variant="outline" size="sm">
                <ItemMedia variant="icon"><Clock3 aria-hidden="true" /></ItemMedia>
                <ItemContent><ItemTitle>Fila</ItemTitle><ItemDescription>1 análise concluída · 0 pendentes</ItemDescription></ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemMedia variant="icon"><Wrench aria-hidden="true" /></ItemMedia>
                <ItemContent><ItemTitle>Ferramenta</ItemTitle><ItemDescription>classificar_conversa · resultado fictício</ItemDescription></ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemMedia variant="icon"><CircleDashed aria-hidden="true" /></ItemMedia>
                <ItemContent><ItemTitle>Subagent</ItemTitle><ItemDescription>Unidade ilustrativa, sem execução paralela</ItemDescription></ItemContent>
              </Item>
              <Item variant="outline" size="sm">
                <ItemMedia variant="icon"><CheckCircle2 aria-hidden="true" /></ItemMedia>
                <ItemContent><ItemTitle>Task</ItemTitle><ItemDescription>Resumo produzido para revisão</ItemDescription></ItemContent>
              </Item>
            </div>

            <div className="rounded-md border p-3">
              <p className="text-sm font-medium">Confirmation · revisão humana</p>
              <p className="mt-1 text-xs text-muted-foreground">Este controle só muda o estado local da galeria.</p>
              <Button type="button" size="sm" variant={reviewed ? "secondary" : "outline"} className="mt-3" onClick={() => setReviewed((value) => !value)} aria-pressed={reviewed}>
                {reviewed ? <><Check aria-hidden="true" /> Revisado nesta demonstração</> : "Marcar exemplo como revisado"}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Suggestion · ações para a equipe</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant="outline" disabled>Revisar categoria</Button>
                <Button type="button" size="sm" variant="outline" disabled>Ajustar resumo</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Plan, Queue e resultado técnico</CardTitle>
            <CardDescription>Passos públicos e resultados sintéticos da automação.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ol className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />Extrair campos da conversa</li>
              <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />Sugerir categoria</li>
              <li className="flex items-center gap-2"><ChevronRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />Aguardar revisão da equipe</li>
            </ol>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary">2 concluídas</Badge>
              <Badge variant="outline">1 aguardando</Badge>
              <Badge variant="outline">Test Results · exemplo aprovado</Badge>
            </div>
            <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <p className="font-medium">Stack Trace · erro fictício</p>
              <p className="mt-1 font-mono text-xs text-muted-foreground">TimeoutError: source lookup exceeded 2s</p>
              <p className="mt-1 text-xs text-muted-foreground">Mensagem inventada para demonstrar o estado de falha.</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Prompt Input e Terminal</CardTitle>
            <CardDescription>Os elementos aparecem como referência visual e não aceitam envio nem executam comandos.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="block space-y-2 text-sm">
              <span className="font-medium">Prompt Input · desativado nesta plataforma</span>
              <Textarea disabled rows={2} placeholder="Esta plataforma não envia prompts nem respostas a clientes." />
            </label>
            <CodeBlock variant="default">
              <CodeBlockHeader><CodeBlockTitle>Terminal · saída fictícia</CodeBlockTitle><Badge variant="outline">somente leitura</Badge></CodeBlockHeader>
              <CodeBlockContent lineNumbers>{"$ analysis-preview --sample\nstatus: completed\ncategory: retorno solicitado\nsummary: cliente pretende retomar amanhã"}</CodeBlockContent>
              <CodeBlockFooter>Comando e saída ilustrativos; nada foi executado.</CodeBlockFooter>
            </CodeBlock>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/20 bg-primary/[0.02]">
        <CardContent className="flex items-start gap-3 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Amostras sem integração</p>
            <p className="text-sm text-muted-foreground">Os 21 padrões AI Elements estão representados visualmente. Não há conversa real, credencial, dado de cliente, chamada à OpenAI ou envio automático neste painel.</p>
            <p className="flex items-center gap-2 text-xs text-muted-foreground"><MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />Chain of Thought e Reasoning exibem apenas a regra de ocultação do raciocínio interno.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{aiPatterns.length} padrões AI Elements cobertos</CardTitle>
          <CardDescription>Amostras visuais compostas por componentes shadcn locais, sem instalar ou ativar um chat.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {aiPatterns.map((pattern) => <Badge key={pattern} variant="outline">{pattern}</Badge>)}
        </CardContent>
      </Card>

    </div>
  );
}
