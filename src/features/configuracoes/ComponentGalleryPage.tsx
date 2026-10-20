import { lazy, Suspense, useMemo, useState, type FormEvent } from "react";
import { ArrowUpRight, CalendarDays, Check, CheckCircle2, ChevronDown, CircleHelp, FileText, Image as ImageIcon, MoreHorizontal, Sparkles, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "@/hooks/use-toast";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DataState } from "@/components/data/DataState";
import { SearchInput } from "@/components/data/SearchInput";
import { TableScrollArea } from "@/components/data/TableScrollArea";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Combobox, ComboboxContent, ComboboxEmpty, ComboboxInput, ComboboxItem, ComboboxList } from "@/components/ui/combobox";
import { Direction, type TextDirection } from "@/components/ui/direction";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { InputGroup, InputGroupAddon, InputGroupInput, InputGroupText } from "@/components/ui/input-group";
import { Item, ItemContent, ItemDescription, ItemGroup, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Kbd, KbdGroup } from "@/components/ui/kbd";
import { Label } from "@/components/ui/label";
import { Marker } from "@/components/ui/marker";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerFooter, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { PageHeader } from "@/components/app/PageHeader";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NativeSelect } from "@/components/ui/native-select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Typeset } from "@/components/ui/typeset";
import {
  Attachment,
  AttachmentAction,
  AttachmentActions,
  AttachmentContent,
  AttachmentDescription,
  AttachmentGroup,
  AttachmentMedia,
  AttachmentTitle,
} from "@/components/ui/attachment";
import {
  CodeBlock,
  CodeBlockActions,
  CodeBlockContent,
  CodeBlockCopyButton,
  CodeBlockFooter,
  CodeBlockHeader,
  CodeBlockTitle,
} from "@/components/ui/code-block";
import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Toggle } from "@/components/ui/toggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  Menubar,
  MenubarContent,
  MenubarItem,
  MenubarMenu,
  MenubarSeparator,
  MenubarTrigger,
} from "@/components/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";

type CatalogEntry = { name: string; slug: string; group: "Componentes" | "AI Elements"; area: string };
const GalleryChartDemo = lazy(() => import("./GalleryChartDemo"));
const GalleryAIElements = lazy(() => import("./GalleryAIElements"));

const catalog: CatalogEntry[] = [
  ["Accordion", "accordion", "Componentes", "Ajuda e parâmetros avançados"],
  ["Alert", "alert", "Componentes", "Erros e avisos persistentes"],
  ["Alert Dialog", "alert-dialog", "Componentes", "Confirmação de ações com consequência"],
  ["Aspect Ratio", "aspect-ratio", "Componentes", "Prévia de imagem e anexo"],
  ["Attachment", "attachment", "Componentes", "Arquivos disponíveis no registro"],
  ["Avatar", "avatar", "Componentes", "Pessoas e conta"],
  ["Badge", "badge", "Componentes", "Situação, canal e classificação"],
  ["Breadcrumb", "breadcrumb", "Componentes", "Hierarquia da página"],
  ["Bubble", "bubble", "Componentes", "Mensagens capturadas em leitura"],
  ["Button", "button", "Componentes", "Ações principais e secundárias"],
  ["Button Group", "button-group", "Componentes", "Ações relacionadas e períodos"],
  ["Calendar", "calendar", "Componentes", "Datas e períodos"],
  ["Card", "card", "Componentes", "Métricas e seções"],
  ["Carousel", "carousel", "Componentes", "Prévia de várias imagens, quando útil"],
  ["Chart", "chart", "Componentes", "Indicadores com alternativa em tabela"],
  ["Checkbox", "checkbox", "Componentes", "Seleção múltipla"],
  ["Code Block", "code-block", "Componentes", "Exemplos de contratos sem credenciais"],
  ["Collapsible", "collapsible", "Componentes", "Detalhes opcionais"],
  ["Combobox", "combobox", "Componentes", "Seleção de cadastro com busca"],
  ["Command", "command", "Componentes", "Busca e navegação por ações"],
  ["Context Menu", "context-menu", "Componentes", "Atalhos com alternativa visível"],
  ["Data Table", "data-table", "Componentes", "Listagens operacionais"],
  ["Date Picker", "date-picker", "Componentes", "Escolha de data"],
  ["Dialog", "dialog", "Componentes", "Tarefas curtas"],
  ["Direction", "direction", "Componentes", "Direção da interface"],
  ["Drawer", "drawer", "Componentes", "Interações móveis"],
  ["Dropdown Menu", "dropdown-menu", "Componentes", "Ações secundárias"],
  ["Empty", "empty", "Componentes", "Primeiro uso e ausência de resultados"],
  ["Field", "field", "Componentes", "Campos acessíveis com ajuda e erro"],
  ["Hover Card", "hover-card", "Componentes", "Prévia breve complementar"],
  ["Input", "input", "Componentes", "Busca, nome, telefone e valores"],
  ["Input Group", "input-group", "Componentes", "Campo com prefixo ou unidade"],
  ["Input OTP", "input-otp", "Componentes", "Código de verificação, se adotado"],
  ["Item", "item", "Componentes", "Pessoas, integrações e filas"],
  ["Kbd", "kbd", "Componentes", "Atalhos realmente disponíveis"],
  ["Label", "label", "Componentes", "Rótulos associados aos campos"],
  ["Marker", "marker", "Componentes", "Trecho destacado com significado"],
  ["Menubar", "menubar", "Componentes", "Referência de menu"],
  ["Message", "message", "Componentes", "Mensagens capturadas, somente leitura"],
  ["Message Scroller", "message-scroller", "Componentes", "Histórico disponível em leitura"],
  ["Native Select", "native-select", "Componentes", "Seleção curta e simples"],
  ["Navigation Menu", "navigation-menu", "Componentes", "Navegação auxiliar"],
  ["Pagination", "pagination", "Componentes", "Paginação com total"],
  ["Popover", "popover", "Componentes", "Calendário e filtros compactos"],
  ["Progress", "progress", "Componentes", "Progresso mensurável"],
  ["Questionnaire", "questionnaire", "Componentes", "Formulário guiado, se necessário"],
  ["Radio Group", "radio-group", "Componentes", "Escolha única"],
  ["Resizable", "resizable", "Componentes", "Lista e detalhe em telas largas"],
  ["Scroll Area", "scroll-area", "Componentes", "Conteúdo lateral limitado"],
  ["Select", "select", "Componentes", "Seleção curta"],
  ["Separator", "separator", "Componentes", "Separação de grupos"],
  ["Sheet", "sheet", "Componentes", "Detalhe completo"],
  ["Sidebar", "sidebar", "Componentes", "Navegação principal"],
  ["Skeleton", "skeleton", "Componentes", "Carregamento que preserva espaço"],
  ["Slider", "slider", "Componentes", "Cenários com valor exato disponível"],
  ["Spinner", "spinner", "Componentes", "Ação em andamento"],
  ["Switch", "switch", "Componentes", "Preferência binária"],
  ["Table", "table", "Componentes", "Dados tabulares simples"],
  ["Tabs", "tabs", "Componentes", "Visões internas de módulo"],
  ["Textarea", "textarea", "Componentes", "Observação e justificativa"],
  ["Toast", "toast", "Componentes", "Resultado transitório"],
  ["Toggle", "toggle", "Componentes", "Alternância de apresentação"],
  ["Toggle Group", "toggle-group", "Componentes", "Modo de apresentação relacionado"],
  ["Tooltip", "tooltip", "Componentes", "Ajuda curta também acessível por foco"],
  ["Trace", "trace", "Componentes", "Etapas técnicas públicas e autorizadas"],
  ["Typography", "typography", "Componentes", "Hierarquia e formatos de texto"],
  ["Chain of Thought", "chain-of-thought", "AI Elements", "Não exibir raciocínio privado"],
  ["Chat", "chat", "AI Elements", "Sem novo chat operacional nesta plataforma"],
  ["Checkpoint", "checkpoint", "AI Elements", "Etapas públicas de execução"],
  ["Confirmation", "confirmation", "AI Elements", "Aprovação humana de ações"],
  ["Context", "context", "AI Elements", "Contexto explicitamente fornecido"],
  ["File Tree", "file-tree", "AI Elements", "Estrutura de arquivos"],
  ["Inline Citation", "inline-citation", "AI Elements", "Fontes verificáveis"],
  ["Message", "message", "AI Elements", "Análise e resumo, sem resposta automática"],
  ["Model Selector", "model-selector", "AI Elements", "Configuração técnica, se necessária"],
  ["Plan", "plan", "AI Elements", "Etapas públicas da automação"],
  ["Prompt Input", "prompt-input", "AI Elements", "Não habilitar envio ao cliente"],
  ["Queue", "queue", "AI Elements", "Fila de processamento"],
  ["Reasoning", "reasoning", "AI Elements", "Exibir apenas resultado resumido"],
  ["Sources", "sources", "AI Elements", "Fontes consultadas pela análise"],
  ["Stack Trace", "stack-trace", "AI Elements", "Diagnóstico técnico"],
  ["Subagent", "subagent", "AI Elements", "Execuções técnicas autorizadas"],
  ["Suggestion", "suggestion", "AI Elements", "Sugestão para revisão humana"],
  ["Task", "task", "AI Elements", "Status de uma tarefa de análise"],
  ["Terminal", "terminal", "AI Elements", "Saída técnica controlada"],
  ["Test Results", "test-results", "AI Elements", "Resultado de validação"],
  ["Tool", "tool", "AI Elements", "Ferramentas chamadas no servidor"],
].map(([name, slug, group, area]) => ({ name, slug, group: group as CatalogEntry["group"], area }));

const localFileNames = new Set([
  "attachment",
  "accordion",
  "alert-dialog",
  "alert",
  "aspect-ratio",
  "avatar",
  "badge",
  "breadcrumb",
  "button",
  "calendar",
  "card",
  "carousel",
  "chart",
  "checkbox",
  "collapsible",
  "code-block",
  "combobox",
  "bubble",
  "message",
  "message-scroller",
  "direction",
  "typography",
  "command",
  "context-menu",
  "dialog",
  "drawer",
  "dropdown-menu",
  "form",
  "empty",
  "hover-card",
  "input-group",
  "input-otp",
  "input",
  "item",
  "kbd",
  "label",
  "menubar",
  "marker",
  "navigation-menu",
  "pagination",
  "popover",
  "progress",
  "radio-group",
  "resizable",
  "scroll-area",
  "select",
  "separator",
  "sheet",
  "sidebar",
  "skeleton",
  "slider",
  "switch",
  "synced-horizontal-scrollbar",
  "table",
  "tabs",
  "textarea",
  "trace",
  "toast",
  "toaster",
  "toggle-group",
  "toggle",
  "tooltip",
  "use-toast",
]);
const coreFileAliases: Record<string, string> = {
  "alert-dialog": "alert-dialog",
  "data-table": "table",
  "date-picker": "calendar",
  empty: "DataState",
  "native-select": "select",
};

function componentStatus(entry: CatalogEntry) {
  if (entry.group === "AI Elements") return "Amostra visual; sem integração operacional";
  if (entry.slug === "bubble" || entry.slug === "message") return "Composição local de leitura";
  if (entry.slug === "message-scroller") return "Composição local; scroll básico";
  if (entry.slug === "direction") return "Base UI + atributo HTML dir";
  if (entry.slug === "typography") return "Typeset local";
  if (entry.slug === "questionnaire") return "Composição local; sem engine";
  if (["attachment", "code-block", "trace"].includes(entry.slug)) return "Composição local";
  if (["alert", "badge"].includes(entry.slug)) return "HTML + tokens semânticos";
  if (entry.slug === "card") return "Composição HTML + tokens";
  if (entry.slug === "input") return "Input HTML + tokens";
  if (entry.slug === "textarea") return "Textarea HTML + tokens";
  if (entry.slug === "input-otp") return "input-otp + composição";
  if (entry.slug === "skeleton") return "CSS; respeita movimento reduzido";
  if (entry.slug === "table") return "Tabela HTML semântica";
  if (entry.slug === "toaster") return "Provider compartilhado";
  if (entry.slug === "label") return "HTML semântico compartilhado";
  if (entry.slug === "aspect-ratio") return "HTML + CSS nativo";
  if (entry.slug === "calendar") return "react-day-picker + Base Button";
  if (entry.slug === "field") return "Composição React Hook Form";
  if (entry.slug === "pagination") return "Composição local";
  if (entry.slug === "button-group") return "Composição local";
  if (entry.slug === "native-select") return "HTML select nativo";
  if (entry.slug === "spinner") return "Lucide + token local";
  if (["empty", "input-group", "item", "kbd"].includes(entry.slug)) return "Composição local";
  if (entry.slug === "marker") return "HTML semântico + tokens";
  if (entry.slug === "carousel") return "Embla Carousel";
  if (entry.slug === "chart") return "Recharts + tokens";
  if (entry.slug === "command") return "cmdk + Dialog Base UI";
  if (entry.slug === "drawer") return "Vaul";
  if (entry.slug === "resizable") return "React Resizable Panels";
  if (["accordion", "avatar", "scroll-area"].includes(entry.slug)) return "Base UI em uso";
  if (entry.slug === "button") return "Base UI em uso";
  if (entry.slug === "combobox") return "Base UI em uso";
  if (["checkbox", "switch"].includes(entry.slug)) return "Base UI em uso";
  if (entry.slug === "radio-group") return "Base UI em uso";
  if (entry.slug === "toast") return "Base UI em uso";
  if (["progress", "slider", "toggle", "toggle-group"].includes(entry.slug)) return "Base UI em uso";
  if (["dialog", "alert-dialog", "sheet", "popover", "tabs", "dropdown-menu", "select", "tooltip", "collapsible", "separator"].includes(entry.slug)) return "Base UI em uso";
  if (["context-menu", "hover-card", "menubar", "navigation-menu"].includes(entry.slug)) return "Base UI em uso";
  if (["breadcrumb", "form", "sidebar"].includes(entry.slug)) return "Base UI useRender";
  if (["data-table", "date-picker", "empty"].includes(entry.slug)) return "Composição local";
  const file = coreFileAliases[entry.slug] || entry.slug;
  if (localFileNames.has(file) || file === "DataState") return "Primitiva local";
  return "Adapter pendente";
}

function componentReference(entry: CatalogEntry) {
  if (entry.group === "AI Elements") return `ai-elements/base/${entry.slug}`;
  if (entry.slug === "bubble") return "components/aria/bubble";
  if (entry.slug === "direction") return "rtl";
  if (entry.slug === "typography") return "typeset";
  return `components/base/${entry.slug}`;
}

function ComponentCatalog({ group }: { group: CatalogEntry["group"] }) {
  const [query, setQuery] = useState("");
  const entries = useMemo(() => catalog.filter((entry) => {
    const search = query.trim().toLocaleLowerCase("pt-BR");
    return entry.group === group && (!search || `${entry.name} ${entry.area} ${componentStatus(entry)}`.toLocaleLowerCase("pt-BR").includes(search));
  }), [group, query]);

  return (
    <div className="space-y-4">
      <SearchInput
        containerClassName="max-w-lg"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar componente ou uso…"
        aria-label={`Buscar em ${group}`}
      />
      <p className="text-sm text-muted-foreground" role="status">{entries.length} de {catalog.filter((entry) => entry.group === group).length} itens</p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {entries.map((entry) => (
          <Card key={`${entry.group}-${entry.name}`} className="flex min-h-36 flex-col">
            <CardHeader className="space-y-2 p-4 pb-2">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <CardTitle className="text-sm">{entry.name}</CardTitle>
                <Badge variant={componentStatus(entry).startsWith("Base UI") ? "secondary" : "outline"} className="max-w-full text-[10px]">
                  {componentStatus(entry)}
                </Badge>
              </div>
              <CardDescription>{entry.area}</CardDescription>
            </CardHeader>
            <CardContent className="mt-auto p-4 pt-3">
              <a className="inline-flex items-center gap-1 text-xs font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" href={`https://ui.shadcn.com/docs/${componentReference(entry)}`} target="_blank" rel="noreferrer">
                Referência shadcn <ArrowUpRight className="size-3" aria-hidden="true" />
              </a>
            </CardContent>
          </Card>
        ))}
        {entries.length === 0 ? <DataState variant="empty" title="Nenhum componente encontrado" description="Tente outro nome ou uso." /> : null}
      </div>
    </div>
  );
}

type GalleryFormValues = { title: string; observation: string };

function GalleryFormDemo() {
  const form = useForm<GalleryFormValues>({
    defaultValues: { title: "", observation: "" },
  });

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(() => toast.success("Formulário de demonstração validado; nenhum dado foi salvo."))}
        className="space-y-4"
      >
        <FormField
          control={form.control}
          name="title"
          rules={{ required: "Informe um título para o exemplo." }}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título do registro fictício</FormLabel>
              <FormControl><Input placeholder="Ex.: Retorno para cliente" {...field} /></FormControl>
              <FormDescription>Campo obrigatório com rótulo, ajuda e mensagem de erro acessíveis.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="observation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação de exemplo</FormLabel>
              <FormControl><Textarea rows={3} placeholder="Escreva um texto fictício…" {...field} /></FormControl>
              <FormDescription>Este rascunho existe apenas enquanto a página está aberta.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit">Validar exemplo</Button>
      </form>
    </Form>
  );
}

function GalleryQuestionnaireDemo() {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [error, setError] = useState("");
  const [complete, setComplete] = useState(false);
  const questions = [
    { prompt: "Qual próximo passo deve aparecer no registro?", options: ["Agendar retorno", "Enviar informação", "Aguardar cliente"] },
    { prompt: "Quem deve revisar o resumo?", options: ["Funcionário responsável", "Gerência da loja"] },
  ];
  const question = questions[step];

  function advance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!answers[step]) {
      setError("Escolha uma opção para continuar.");
      return;
    }
    setError("");
    if (step < questions.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    setComplete(true);
  }

  if (complete) {
    return (
      <div className="space-y-3" role="status" aria-live="polite">
        <p className="text-sm font-medium">Questionário fictício concluído.</p>
        <p className="text-xs text-muted-foreground">As respostas ficam somente nesta demonstração local.</p>
        <Button type="button" variant="outline" size="sm" onClick={() => { setStep(0); setAnswers({}); setComplete(false); }}>
          Recomeçar exemplo
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={advance} className="space-y-4">
      <div className="space-y-2">
        <Progress value={((step + 1) / questions.length) * 100} aria-label={`Etapa ${step + 1} de ${questions.length}`} />
        <p className="text-xs text-muted-foreground">Pergunta {step + 1} de {questions.length}</p>
      </div>
      <fieldset className="space-y-3" aria-describedby={error ? "gallery-question-error" : undefined}>
        <legend id="gallery-question-title" className="text-sm font-medium">{question.prompt}</legend>
        <RadioGroup
          aria-labelledby="gallery-question-title"
          value={answers[step] ?? ""}
          onValueChange={(value) => { setAnswers((current) => ({ ...current, [step]: typeof value === "string" ? value : "" })); setError(""); }}
          className="space-y-2"
        >
          {question.options.map((option) => (
            <label key={option} className="flex cursor-pointer items-center gap-2 rounded-md border p-2 text-sm">
              <RadioGroupItem value={option} />{option}
            </label>
          ))}
        </RadioGroup>
      </fieldset>
      {error ? <p id="gallery-question-error" role="alert" className="text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-between gap-2">
        <Button type="button" variant="outline" size="sm" disabled={step === 0} onClick={() => { setError(""); setStep((current) => Math.max(0, current - 1)); }}>Anterior</Button>
        <Button type="submit" size="sm">{step === questions.length - 1 ? "Concluir exemplo" : "Próxima"}</Button>
      </div>
    </form>
  );
}

function LiveShowcase() {
  const [enabled, setEnabled] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [period, setPeriod] = useState("este-mes");
  const [pageSize, setPageSize] = useState("10");
  const [includeInactive, setIncludeInactive] = useState(false);
  const [density, setDensity] = useState("confortavel");
  const [displayMode, setDisplayMode] = useState<string | string[]>("cards");
  const [target, setTarget] = useState(65);
  const [favorite, setFavorite] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [page, setPage] = useState(1);
  const [selectedCommand, setSelectedCommand] = useState("Nenhuma ação selecionada.");
  const [chartOpen, setChartOpen] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [showAttachment, setShowAttachment] = useState(true);
  const [galleryEmployee, setGalleryEmployee] = useState<string | null>(null);
  const [previewDirection, setPreviewDirection] = useState<TextDirection>("ltr");
  const galleryEmployees = ["Ana Souza", "Bruno Lima", "Joice Pereira"];
  const pageSizeValue = Number(pageSize);
  const totalPages = Math.ceil(67 / pageSizeValue);
  const pageItems: Array<number | "ellipsis"> = totalPages <= 5
    ? Array.from({ length: totalPages }, (_, index) => index + 1)
    : page <= 2
      ? [1, 2, 3, "ellipsis", totalPages]
      : page >= totalPages - 1
        ? [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages]
        : [1, "ellipsis", page - 1, page, page + 1, "ellipsis", totalPages];

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Ações e feedback</CardTitle>
          <CardDescription>Botão Base UI, variantes de referência e mensagem de resultado.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => toast.success("Ação de demonstração concluída.")}>Ação principal</Button>
            <Button variant="outline">Secundária</Button>
            <Button variant="ghost">Discreta</Button>
            <Button variant="destructive">Destrutiva</Button>
            <Button disabled>Indisponível</Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>Ativo</Badge><Badge variant="secondary">Em revisão</Badge><Badge variant="outline">Pendente</Badge><Badge variant="destructive">Falha</Badge>
          </div>
          <Alert>
            <Check className="size-4" aria-hidden="true" />
            <AlertTitle>Exemplo informativo</AlertTitle>
            <AlertDescription>Mensagens de sucesso e erro devem explicar o resultado da ação.</AlertDescription>
          </Alert>
          <Alert variant="destructive">
            <CircleHelp className="size-4" aria-hidden="true" />
            <AlertTitle>Exemplo de erro</AlertTitle>
            <AlertDescription>Inclua uma forma clara de corrigir ou tentar novamente.</AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Campos e controles</CardTitle>
          <CardDescription>Rótulos, ajuda, estados e observação com texto fictício.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gallery-name">Título do registro fictício</Label>
            <Input id="gallery-name" placeholder="Ex.: Retorno para cliente" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gallery-employee">Funcionário cadastrado</Label>
            <Combobox
              items={galleryEmployees}
              value={galleryEmployee}
              onValueChange={(nextValue) => setGalleryEmployee(typeof nextValue === "string" ? nextValue : null)}
            >
              <ComboboxInput id="gallery-employee" aria-label="Buscar funcionário cadastrado" placeholder="Buscar funcionário…" />
              <ComboboxContent>
                <ComboboxEmpty>Nenhum funcionário encontrado.</ComboboxEmpty>
                <ComboboxList>
                  {(name: string) => <ComboboxItem key={name} value={name}>{name}</ComboboxItem>}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <p className="text-xs text-muted-foreground" aria-live="polite">Funcionário selecionado: {galleryEmployee || "nenhum"}. Os nomes são fictícios e pré-cadastrados.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gallery-note">Observação</Label>
            <Textarea id="gallery-note" defaultValue="Exemplo de anotação para revisar com a equipe." rows={3} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gallery-amount">Valor de demonstração</Label>
            <InputGroup>
              <InputGroupInput id="gallery-amount" inputMode="decimal" defaultValue="1250,00" aria-label="Valor fictício" />
              <InputGroupAddon><InputGroupText>R$</InputGroupText></InputGroupAddon>
            </InputGroup>
            <p className="text-xs text-muted-foreground">Unidade visível, valor digitável e foco aplicado ao grupo inteiro.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gallery-verification-code">Input OTP de demonstração</Label>
            <InputOTP
              id="gallery-verification-code"
              aria-label="Código fictício de seis dígitos"
              maxLength={6}
              value={verificationCode}
              onChange={setVerificationCode}
              inputMode="numeric"
            >
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} className="h-8 w-8 sm:h-10 sm:w-10" />)}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-muted-foreground" aria-live="polite">{verificationCode ? `${verificationCode.length} de 6 dígitos preenchidos.` : "Campo apenas demonstrativo; nenhum código é validado ou enviado."}</p>
          </div>
          <p className="text-sm text-muted-foreground">
            Trecho encontrado em um resultado: <Marker>Joice</Marker>
          </p>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            Teclas exibidas como referência:
            <KbdGroup><Kbd>Ctrl</Kbd><span aria-hidden="true">+</span><Kbd>K</Kbd></KbdGroup>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={includeInactive} onCheckedChange={setIncludeInactive} />
            Incluir funcionários inativos (demonstração)
          </label>
          <fieldset className="space-y-2">
            <legend id="gallery-density-label" className="text-sm font-medium">Densidade da tabela</legend>
            <RadioGroup aria-labelledby="gallery-density-label" value={density} onValueChange={setDensity} className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="confortavel" />Confortável</label>
              <label className="flex items-center gap-2 text-sm"><RadioGroupItem value="compacta" />Compacta</label>
            </RadioGroup>
          </fieldset>
          <div className="space-y-2 text-sm">
            <span className="text-muted-foreground">Separação de campos</span>
            <Separator />
            <div className="flex h-8 items-center gap-3 text-muted-foreground">
              <span>Comercial</span><Separator orientation="vertical" decorative className="h-5" /><span>Resultados</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Modo de visualização</p>
            <ToggleGroup
              type="single"
              value={displayMode}
              onValueChange={setDisplayMode}
              aria-label="Modo de visualização de exemplo"
              className="w-fit rounded-md border p-1"
            >
              <ToggleGroupItem value="cards" size="sm">Cards</ToggleGroupItem>
              <ToggleGroupItem value="table" size="sm">Tabela</ToggleGroupItem>
            </ToggleGroup>
            <p className="text-xs text-muted-foreground">Exibindo: {displayMode || "nenhum modo selecionado"}</p>
            <Toggle pressed={favorite} onPressedChange={setFavorite} variant="outline" size="sm">
              {favorite ? "Favorito" : "Marcar favorito"}
            </Toggle>
          </div>
          <div className="flex items-center justify-between gap-4 rounded-md border p-3">
            <div><Label htmlFor="gallery-switch">Preferência de demonstração</Label><p className="text-xs text-muted-foreground">A alteração não salva dados.</p></div>
            <Switch id="gallery-switch" checked={enabled} onCheckedChange={setEnabled} aria-label="Ativar preferência de demonstração" />
          </div>
          <div className="rounded-md border p-3 text-sm text-muted-foreground" aria-live="polite">Estado atual: {enabled ? "ativado" : "desativado"}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados, carregamento e ausência</CardTitle>
          <CardDescription>Tabela e estados com conteúdo sintético; sem consulta ao banco.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground" role="status" aria-live="polite">
            <Spinner />
            Carregando demonstração…
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Importação fictícia</span><span>62%</span></div>
            <Progress value={62} aria-label="Importação fictícia" />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm"><span>Meta de demonstração</span><span>{target}%</span></div>
            <Slider
              min={0}
              max={100}
              value={target}
              onValueChange={(value) => setTarget(typeof value === "number" ? value : value[0] ?? 0)}
              getAriaLabel={() => "Meta de demonstração"}
              aria-label="Meta de demonstração"
            />
          </div>
          <TableScrollArea label="Funcionários fictícios" className="rounded-md border">
            <Table>
              <TableHeader><TableRow><TableHead>Funcionário</TableHead><TableHead>Leads</TableHead><TableHead>Situação</TableHead></TableRow></TableHeader>
              <TableBody>
                <TableRow><TableCell>Ana Souza</TableCell><TableCell>12</TableCell><TableCell><Badge variant="secondary">Ativo</Badge></TableCell></TableRow>
                <TableRow><TableCell>Bruno Lima</TableCell><TableCell>8</TableCell><TableCell><Badge variant="outline">Em revisão</Badge></TableCell></TableRow>
              </TableBody>
            </Table>
          </TableScrollArea>
          <Collapsible className="rounded-md border p-3">
            <CollapsibleTrigger render={<Button variant="ghost" className="w-full justify-between">Detalhes do exemplo <ChevronDown className="size-4" aria-hidden="true" /></Button>} />
            <CollapsibleContent className="pt-2 text-sm text-muted-foreground">Este conteúdo sintético só aparece quando o painel é expandido.</CollapsibleContent>
          </Collapsible>
          <div className="space-y-2" aria-label="Exemplo de carregamento"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-4/5" /></div>
          <Empty className="min-h-28 p-4">
            <EmptyHeader>
              <EmptyMedia variant="icon"><CircleHelp aria-hidden="true" /></EmptyMedia>
              <EmptyTitle>Nenhum registro neste exemplo</EmptyTitle>
              <EmptyDescription>Quando não houver dados, explique o próximo passo sem esconder os filtros.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent><Button type="button" variant="outline" size="sm" disabled>Ajustar filtros (somente visual)</Button></EmptyContent>
          </Empty>
          <ItemGroup aria-label="Itens de lista de exemplo" className="gap-2">
            <Item variant="muted" size="sm">
              <ItemMedia variant="icon"><Sparkles aria-hidden="true" /></ItemMedia>
              <ItemContent><ItemTitle>Análise concluída</ItemTitle><ItemDescription>Registro fictício classificado e resumido para revisão.</ItemDescription></ItemContent>
            </Item>
          </ItemGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Diálogos, painel e popover</CardTitle>
          <CardDescription>Wrappers compartilhados Base UI, com dados fictícios e sem executar ações reais.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger render={<Button variant="outline">Abrir diálogo</Button>} />
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Prévia de detalhe</DialogTitle>
                <DialogDescription>Este conteúdo é fictício. O foco retorna ao botão ao fechar.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline">Voltar</Button>} />
                <DialogClose render={<Button>Entendi</Button>} />
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <AlertDialog>
            <AlertDialogTrigger render={<Button variant="destructive">Simular exclusão</Button>} />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar exemplo?</AlertDialogTitle>
                <AlertDialogDescription>Nenhum registro será removido. Esta confirmação é apenas uma demonstração visual.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => toast.success("Confirmação de demonstração concluída.")}>Confirmar exemplo</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Sheet>
            <SheetTrigger render={<Button variant="outline">Abrir painel lateral</Button>} />
            <SheetContent>
              <SheetHeader className="pr-12">
                <SheetTitle>Painel de exemplo</SheetTitle>
                <SheetDescription>Conteúdo fictício em um painel lateral responsivo.</SheetDescription>
              </SheetHeader>
              <div className="py-4 text-sm text-muted-foreground">Em telas móveis, este padrão recebe foco e permite fechar pelo botão, Escape ou ação abaixo.</div>
              <SheetFooter>
                <SheetClose render={<Button variant="outline">Fechar painel</Button>} />
              </SheetFooter>
            </SheetContent>
          </Sheet>
          <Popover>
            <PopoverTrigger render={<Button variant="outline">Abrir filtro compacto</Button>} />
            <PopoverContent>
              <p className="text-sm font-medium">Filtro de demonstração</p>
              <p className="mt-1 text-sm text-muted-foreground">O popover se reposiciona perto do botão e cabe na área visível.</p>
            </PopoverContent>
          </Popover>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Conteúdo, perfil e ajuda</CardTitle>
          <CardDescription>Proporção preservada, fallback de pessoa, rolagem limitada e detalhes expansíveis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Avatar aria-label="Perfil de demonstração"><AvatarFallback>DN</AvatarFallback></Avatar>
            <div><p className="text-sm font-medium">Equipe DNZ</p><p className="text-xs text-muted-foreground">Perfil fictício</p></div>
          </div>
          <AspectRatio ratio={16 / 9} className="flex items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">
            Prévia 16:9
          </AspectRatio>
          <ScrollArea className="h-28 rounded-md border p-3">
            <ul className="space-y-2 text-sm">
              {[
                "Comercial: leads e detalhe",
                "Atendimentos: origem e receita",
                "Escala: turnos cadastrados",
                "Resultados: realizado e meta",
                "Automações: status e observação",
                "Cadastros: pessoas e categorias",
              ].map((item) => <li key={item}>{item}</li>)}
            </ul>
          </ScrollArea>
          <Accordion type="single" collapsible className="rounded-md border px-3">
            <AccordionItem value="ajuda">
              <AccordionTrigger>Por que usar um cadastro selecionável?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                A seleção reutiliza IDs e nomes consistentes em todas as telas.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seleção e menu de ações</CardTitle>
          <CardDescription>Select e Dropdown Menu Base UI com opções e ações fictícias.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger aria-label="Período da demonstração" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="este-mes">Este mês</SelectItem>
              <SelectItem value="mes-anterior">Mês anterior</SelectItem>
              <SelectItem value="trimestre">Últimos três meses</SelectItem>
              <SelectItem value="proximo-mes">Próximo mês</SelectItem>
            </SelectContent>
          </Select>
          <ButtonGroup aria-label="Ações de navegação de período">
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriod("mes-anterior")}>Anterior</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriod("este-mes")}>Este mês</Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setPeriod("proximo-mes")}>Próximo</Button>
          </ButtonGroup>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" aria-label="Abrir ações de demonstração"><MoreHorizontal className="size-4" aria-hidden="true" /></Button>} />
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => toast.success("Ação de demonstração concluída.")}>Abrir registro fictício</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toast.success("Prévia fictícia pronta.")}>Ver prévia</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Tooltip>
            <TooltipTrigger render={<Button variant="ghost" size="icon" aria-label="Ajuda sobre o período"><CircleHelp className="size-4" aria-hidden="true" /></Button>} />
            <TooltipContent>Período usado apenas nesta demonstração.</TooltipContent>
          </Tooltip>
          <p className="text-xs text-muted-foreground" aria-live="polite">Período: {period.replace(/-/g, " ")}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Menus e prévias</CardTitle>
          <CardDescription>Context Menu, Menubar, Navigation Menu e Hover Card com informações fictícias.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <ContextMenu>
            <ContextMenuTrigger
              render={
                <Button type="button" variant="outline" className="h-auto whitespace-normal rounded-md border-dashed px-4 py-3 text-left text-sm text-muted-foreground">
                  Clique com o botão direito (ou toque e segure) para ver ações de exemplo.
                </Button>
              }
            />
            <ContextMenuContent>
              <ContextMenuLabel>Registro fictício</ContextMenuLabel>
              <ContextMenuItem onClick={() => toast.success("Prévia fictícia aberta.")}>Abrir prévia</ContextMenuItem>
              <ContextMenuCheckboxItem checked={includeInactive} onCheckedChange={setIncludeInactive}>
                Incluir inativos
              </ContextMenuCheckboxItem>
              <ContextMenuSeparator />
              <ContextMenuSub>
                <ContextMenuSubTrigger>Exportar exemplo</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem onClick={() => toast.success("CSV fictício preparado.")}>CSV</ContextMenuItem>
                  <ContextMenuItem onClick={() => toast.success("PDF fictício preparado.")}>PDF</ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
            </ContextMenuContent>
          </ContextMenu>

          <Menubar aria-label="Ações de demonstração" className="w-fit">
            <MenubarMenu>
              <MenubarTrigger>Registro</MenubarTrigger>
              <MenubarContent>
                <MenubarItem onClick={() => toast.success("Registro fictício aberto.")}>Abrir</MenubarItem>
                <MenubarSeparator />
                <MenubarItem onClick={() => toast.success("Alterações fictícias salvas.")}>Salvar exemplo</MenubarItem>
              </MenubarContent>
            </MenubarMenu>
          </Menubar>

          <NavigationMenu aria-label="Navegação de demonstração">
            <NavigationMenuList>
              <NavigationMenuItem>
                <NavigationMenuTrigger>Cadastros</NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="grid gap-1 p-2 sm:w-64">
                    <NavigationMenuLink href="#funcionarios" onClick={(event) => event.preventDefault()} className="rounded-md p-2 text-sm hover:bg-accent">
                      Funcionários <span className="block text-xs text-muted-foreground">Pessoas disponíveis para seleção</span>
                    </NavigationMenuLink>
                    <NavigationMenuLink href="#categorias" onClick={(event) => event.preventDefault()} className="rounded-md p-2 text-sm hover:bg-accent">
                      Categorias <span className="block text-xs text-muted-foreground">Vocabulário compartilhado</span>
                    </NavigationMenuLink>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
              <NavigationMenuItem>
                <NavigationMenuLink href="#resultados" onClick={(event) => event.preventDefault()} className="inline-flex h-10 items-center rounded-md px-4 text-sm hover:bg-accent">
                  Resultados
                </NavigationMenuLink>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>

          <p className="text-sm">
            <HoverCard>
              <HoverCardTrigger href="#perfil-ana" onClick={(event) => event.preventDefault()} className="font-medium text-primary underline underline-offset-4">
                Ana Souza
              </HoverCardTrigger>
              <HoverCardContent>
                <p className="font-medium">Ana Souza</p>
                <p className="mt-1 text-sm text-muted-foreground">Funcionária fictícia · Comercial</p>
                <p className="mt-3 text-xs text-muted-foreground">A prévia complementa a navegação; o perfil completo abre ao ativar o link.</p>
              </HoverCardContent>
            </HoverCard>{" "}
            — mantenha a prévia curta e o destino acessível por teclado.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Navegação e paginação</CardTitle>
          <CardDescription>Hierarquia de página e navegação de uma lista fictícia com total conhecido.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink href="#inicio" onClick={(event) => event.preventDefault()}>Início</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink href="#comercial" onClick={(event) => event.preventDefault()}>Comercial</BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Lead fictício</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Exibindo {(page - 1) * pageSizeValue + 1}–{Math.min(page * pageSizeValue, 67)} de 67 registros fictícios
              </p>
              <NativeSelect aria-label="Quantidade de registros por página" value={pageSize} onChange={(event) => { setPageSize(event.target.value); setPage(1); }} className="w-auto">
                <option value="10">10 por página</option>
                <option value="20">20 por página</option>
                <option value="50">50 por página</option>
              </NativeSelect>
            </div>
            <Pagination>
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    href="#pagina-anterior"
                    aria-disabled={page === 1}
                    tabIndex={page === 1 ? -1 : undefined}
                    className={page === 1 ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => { event.preventDefault(); setPage((current) => Math.max(1, current - 1)); }}
                  />
                </PaginationItem>
                {pageItems.map((item, index) => item === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}><PaginationEllipsis /></PaginationItem>
                ) : (
                  <PaginationItem key={item}>
                    <PaginationLink
                      href={`#pagina-${item}`}
                      isActive={page === item}
                      aria-label={`Ir para página ${item}`}
                      onClick={(event) => { event.preventDefault(); setPage(item); }}
                    >
                      {item}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                <PaginationItem>
                  <PaginationNext
                    href="#proxima-pagina"
                    aria-disabled={page === totalPages}
                    tabIndex={page === totalPages ? -1 : undefined}
                    className={page === totalPages ? "pointer-events-none opacity-50" : undefined}
                    onClick={(event) => { event.preventDefault(); setPage((current) => Math.min(totalPages, current + 1)); }}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data e calendário</CardTitle>
          <CardDescription>Seletor de data em português, sem consultar nem salvar registros.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="w-full justify-start text-left font-normal sm:w-72"><CalendarDays className="mr-2 size-4" aria-hidden="true" />{selectedDate ? new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(selectedDate) : "Escolher data"}</Button>} />
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar mode="single" selected={selectedDate} onSelect={setSelectedDate} initialFocus />
            </PopoverContent>
          </Popover>
          <p className="text-xs text-muted-foreground" aria-live="polite">{selectedDate ? `Data selecionada: ${new Intl.DateTimeFormat("pt-BR").format(selectedDate)}` : "Nenhuma data selecionada."}</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Formulário acessível</CardTitle>
          <CardDescription>React Hook Form com campos fictícios, validação visível e envio apenas de demonstração.</CardDescription>
        </CardHeader>
        <CardContent><GalleryFormDemo /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Questionário em etapas</CardTitle>
          <CardDescription>Composição local para demonstrar escolha, progresso, validação e navegação. Não persiste respostas.</CardDescription>
        </CardHeader>
        <CardContent><GalleryQuestionnaireDemo /></CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visualizações, comandos e layout adaptável</CardTitle>
          <CardDescription>Carousel, gráfico, busca de comandos, painel redimensionável e drawer com conteúdo demonstrativo.</CardDescription>
        </CardHeader>
        <CardContent className="grid min-w-0 gap-6 lg:grid-cols-2">
          <section className="min-w-0 space-y-3" aria-labelledby="gallery-carousel-title">
            <h3 id="gallery-carousel-title" className="text-sm font-medium">Carousel de módulos</h3>
            <Carousel opts={{ loop: true }} aria-label="Prévia dos módulos fictícios" className="mx-auto w-full min-w-0 max-w-md px-10">
              <CarouselContent>
                {[
                  ["Cadastros", "Pessoas selecionáveis e categorias padronizadas."],
                  ["Atendimentos", "Origem, receita e histórico em leitura."],
                  ["Resultados", "Realizado, meta e simulação identificados."],
                ].map(([title, description]) => (
                  <CarouselItem key={title}>
                    <div className="rounded-md border bg-muted/30 p-5 text-center">
                      <p className="font-medium">{title}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious aria-label="Módulo anterior" className="left-0" />
              <CarouselNext aria-label="Próximo módulo" className="right-0" />
            </Carousel>
          </section>

          <section className="min-w-0 space-y-3" aria-labelledby="gallery-chart-title">
            <h3 id="gallery-chart-title" className="text-sm font-medium">Gráfico com alternativa em tabela</h3>
            <Collapsible open={chartOpen} onOpenChange={setChartOpen}>
              <CollapsibleTrigger render={<Button variant="outline" size="sm">{chartOpen ? "Ocultar gráfico" : "Carregar prévia do gráfico"}</Button>} />
              <CollapsibleContent className="pt-3">
                {chartOpen ? <Suspense fallback={<Skeleton className="h-44 w-full" />}><GalleryChartDemo /></Suspense> : null}
              </CollapsibleContent>
            </Collapsible>
          </section>

          <section className="space-y-3" aria-labelledby="gallery-command-title">
            <h3 id="gallery-command-title" className="text-sm font-medium">Busca de comandos</h3>
            <Command className="rounded-md border" aria-label="Comandos fictícios">
              <CommandInput aria-label="Buscar comando" placeholder="Buscar ação disponível…" />
              <CommandList>
                <CommandEmpty>Nenhuma ação encontrada.</CommandEmpty>
                <CommandGroup heading="Ações fictícias">
                  <CommandItem value="cadastros" onSelect={() => setSelectedCommand("Abrir cadastros")}>Abrir cadastros</CommandItem>
                  <CommandItem value="resultados" onSelect={() => setSelectedCommand("Consultar resultados")}>Consultar resultados</CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
            <p className="text-xs text-muted-foreground" role="status" aria-live="polite">{selectedCommand}</p>
          </section>

          <section className="space-y-3" aria-labelledby="gallery-resizable-title">
            <h3 id="gallery-resizable-title" className="text-sm font-medium">Lista e detalhe redimensionáveis</h3>
            <ResizablePanelGroup direction="horizontal" className="h-36 rounded-md border">
              <ResizablePanel defaultSize={48} minSize={30}>
                <div className="p-3 text-sm"><p className="font-medium">Lista</p><p className="mt-1 text-muted-foreground">3 registros fictícios</p></div>
              </ResizablePanel>
              <ResizableHandle withHandle />
              <ResizablePanel defaultSize={52} minSize={30}>
                <div className="p-3 text-sm"><p className="font-medium">Detalhe</p><p className="mt-1 text-muted-foreground">Selecione um registro para ver o contexto.</p></div>
              </ResizablePanel>
            </ResizablePanelGroup>
          </section>

          <section className="space-y-3" aria-labelledby="gallery-drawer-title">
            <h3 id="gallery-drawer-title" className="text-sm font-medium">Drawer móvel</h3>
            <Drawer>
              <DrawerTrigger asChild><Button variant="outline">Abrir drawer de exemplo</Button></DrawerTrigger>
              <DrawerContent>
                <DrawerHeader>
                  <DrawerTitle>Detalhe fictício</DrawerTitle>
                  <DrawerDescription>O drawer mostra uma tarefa breve em uma superfície móvel.</DrawerDescription>
                </DrawerHeader>
                <div className="px-4 pb-4 text-sm text-muted-foreground">Nenhum registro ou integração é acessado nesta demonstração.</div>
                <DrawerFooter><DrawerClose asChild><Button variant="outline">Fechar</Button></DrawerClose></DrawerFooter>
              </DrawerContent>
            </Drawer>
          </section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arquivos, contratos e etapas</CardTitle>
          <CardDescription>Exemplos sintéticos de Attachment, Code Block e Trace; não carregam arquivos nem chamam APIs.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <section className="space-y-3" aria-labelledby="gallery-attachment-title">
            <h3 id="gallery-attachment-title" className="text-sm font-medium">Anexos de um registro fictício</h3>
            <AttachmentGroup role="list" aria-label="Anexos fictícios">
              {showAttachment ? (
                <Attachment role="listitem" state="done" className="max-w-full">
                  <AttachmentMedia><FileText aria-hidden="true" /></AttachmentMedia>
                  <AttachmentContent>
                    <AttachmentTitle>resumo-atendimento.pdf</AttachmentTitle>
                    <AttachmentDescription>PDF · 248 KB · disponível</AttachmentDescription>
                  </AttachmentContent>
                  <AttachmentActions>
                    <AttachmentAction
                      aria-label="Remover anexo fictício"
                      title="Remover da demonstração"
                      onClick={() => setShowAttachment(false)}
                    >
                      <Trash2 aria-hidden="true" />
                    </AttachmentAction>
                  </AttachmentActions>
                </Attachment>
              ) : (
                <div role="listitem">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowAttachment(true)}>
                    Restaurar exemplo de anexo
                  </Button>
                </div>
              )}
              <Attachment role="listitem" state="uploading" size="sm">
                <AttachmentMedia><ImageIcon aria-hidden="true" /></AttachmentMedia>
                <AttachmentContent>
                  <AttachmentTitle>foto-produto.png</AttachmentTitle>
                  <AttachmentDescription>Envio de exemplo · 62%</AttachmentDescription>
                </AttachmentContent>
              </Attachment>
            </AttachmentGroup>
            <p className="text-xs text-muted-foreground">A remoção altera apenas esta demonstração local.</p>
          </section>

          <section className="space-y-3" aria-labelledby="gallery-code-block-title">
            <h3 id="gallery-code-block-title" className="text-sm font-medium">Contrato de API fictício</h3>
            <CodeBlock>
              <CodeBlockHeader>
                <CodeBlockTitle>Consulta somente leitura · exemplo</CodeBlockTitle>
                <CodeBlockActions>
                  <CodeBlockCopyButton value={'GET /api/v1/leads?from=2026-10-01\nAuthorization: Bearer <token-do-cliente>'} />
                </CodeBlockActions>
              </CodeBlockHeader>
              <CodeBlockContent lineNumbers startLine={1}>{'GET /api/v1/leads?from=2026-10-01\nAuthorization: Bearer <token-do-cliente>'}</CodeBlockContent>
              <CodeBlockFooter>Texto ilustrativo. Não inclui credenciais e não chama uma API real.</CodeBlockFooter>
            </CodeBlock>
          </section>

          <section className="space-y-3" aria-labelledby="gallery-trace-title">
            <h3 id="gallery-trace-title" className="text-sm font-medium">Etapas operacionais da análise</h3>
            <Trace role="list" aria-label="Etapas fictícias do processamento de uma conversa">
              <TraceLine role="listitem">
                <TraceIcon><CheckCircle2 className="text-success" /></TraceIcon>
                <TraceTitle>Conversa recebida</TraceTitle>
                <TraceDescription>10:42</TraceDescription>
              </TraceLine>
              <TraceLine role="listitem">
                <TraceIcon><CheckCircle2 className="text-success" /></TraceIcon>
                <TraceTitle>Campos organizados</TraceTitle>
                <TraceDescription>10:42</TraceDescription>
              </TraceLine>
              <TraceCollapsible role="listitem">
                <TraceCollapsibleTrigger>
                  <TraceLine>
                    <TraceIcon><CheckCircle2 className="text-success" /></TraceIcon>
                    <TraceTitle>Resumo e categoria prontos para revisão</TraceTitle>
                  </TraceLine>
                  <span className="text-xs">Detalhes do resultado</span>
                </TraceCollapsibleTrigger>
                <TraceCollapsibleContent>
                  <p className="text-sm">Categoria sugerida: retorno solicitado. Resumo sintético disponível para conferência da equipe.</p>
                </TraceCollapsibleContent>
              </TraceCollapsible>
            </Trace>
            <p className="text-xs text-muted-foreground">Mostramos apenas etapas e resultados operacionais, sem raciocínio interno do modelo.</p>
          </section>

          <section className="grid gap-5 sm:grid-cols-2" aria-label="Direção e tipografia">
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Direção do texto</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-pressed={previewDirection === "rtl"}
                onClick={() => setPreviewDirection((current) => current === "ltr" ? "rtl" : "ltr")}
              >
                {previewDirection === "ltr" ? "Prévia LTR" : "Prévia RTL"}
              </Button>
              <Direction direction={previewDirection} lang={previewDirection === "rtl" ? "ar" : "pt-BR"} className="rounded-md border p-3 text-sm">
                {previewDirection === "rtl" ? "هذه معاينة لاتجاه النص من اليمين إلى اليسار." : "Esta prévia demonstra a leitura da esquerda para a direita."}
              </Direction>
              <p className="text-xs text-muted-foreground">A direção altera somente este exemplo.</p>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Typography · Typeset</h3>
              <Typeset preset="document" className="rounded-md border p-3 text-sm">
                <h4>Resumo do atendimento</h4>
                <p>Cliente solicitou retorno para concluir o atendimento.</p>
                <ul><li>Categoria sugerida: retorno.</li><li>Revisão da equipe pendente.</li></ul>
              </Typeset>
              <p className="text-xs text-muted-foreground">Ritmo tipográfico isolado para conteúdo longo e resumos.</p>
            </div>
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

export default function ComponentGalleryPage() {
  const coreCount = catalog.filter((entry) => entry.group === "Componentes").length;
  const aiCount = catalog.filter((entry) => entry.group === "AI Elements").length;
  const showcaseGroupCount = 14;

  return (
    <section className="space-y-5">
      <PageHeader title="Galeria de componentes" description="Referência interna do preset shadcn, com exemplos fictícios e estado da migração para Base UI." />
      <Alert>
        <Sparkles className="size-4" aria-hidden="true" />
        <AlertTitle>Galeria de manutenção</AlertTitle>
        <AlertDescription>Os controles interativos abaixo não salvam dados e não chamam WhatsApp, IA ou integrações. As amostras AI Elements são sintéticas e de leitura; a OpenAI continua responsável por analisar, classificar e resumir sem responder aos clientes.</AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Catálogo shadcn</p><p className="mt-1 text-2xl font-semibold">{coreCount}</p><p className="text-xs text-muted-foreground">componentes de interface</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">AI Elements</p><p className="mt-1 text-2xl font-semibold">{aiCount}</p><p className="text-xs text-muted-foreground">itens da coleção separada</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Grupos demonstráveis</p><p className="mt-1 text-2xl font-semibold">{showcaseGroupCount}</p><p className="text-xs text-muted-foreground">sem acesso a dados reais</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Exemplos visuais</CardTitle><CardDescription>Revise hierarquia, estados, foco e feedback em um só lugar.</CardDescription></CardHeader>
        <CardContent><LiveShowcase /></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Inventário do preset</CardTitle><CardDescription>O status mostra a situação no código local nesta branch, não a implantação no Supabase ou na Vercel.</CardDescription></CardHeader>
        <CardContent>
          <Tabs defaultValue="components">
            <TabsList aria-label="Coleções shadcn">
              <TabsTrigger value="components">Componentes ({coreCount})</TabsTrigger>
              <TabsTrigger value="ai">AI Elements ({aiCount})</TabsTrigger>
            </TabsList>
            <TabsContent value="components" className="pt-4"><ComponentCatalog group="Componentes" /></TabsContent>
              <TabsContent value="ai" className="space-y-4 pt-4">
                <Suspense fallback={<Skeleton className="h-64 w-full" />}><GalleryAIElements /></Suspense>
                <ComponentCatalog group="AI Elements" />
              </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">A contagem segue o catálogo oficial consultado em 19/10/2026. A galeria expõe o estado local de cada item para orientar a implementação em etapas.</p>
    </section>
  );
}
