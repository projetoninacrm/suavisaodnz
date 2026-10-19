import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useNavigate, useParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, CirclePlus, FilterX, RefreshCw, Search, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { BaseButton as Button } from "@/components/base/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewLeadDialog } from "@/components/Dashboard/NewLeadDialog";
import { useDirectory } from "@/hooks/useDirectory";
import { useLeads, type Lead, type NewLeadData } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { classifyCanal } from "@/lib/leads";
import { LeadDetailSheet } from "./LeadDetailSheet";

const PAGE_SIZE = 25;
const STATUS_VIEWS = ["Todos", "Em atendimento", "Perdidos", "Pós-venda"] as const;
type StatusView = (typeof STATUS_VIEWS)[number];

const statusForView = (status: string | null) => {
  if (status === "Perdido") return "Perdidos";
  if (status === "Pós Venda") return "Pós-venda";
  return "Em atendimento";
};

const parseLeadDate = (value: string | null) => {
  if (!value) return 0;
  const [day, month, year] = value.split("/").map(Number);
  return day && month && year ? new Date(year, month - 1, day).getTime() : 0;
};

const formatCurrency = (value: string | null) => {
  if (!value) return "—";
  const number = Number(value.replace(/[^\d,.-]/g, "").replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", "."));
  return Number.isFinite(number) ? number.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : value;
};

const statusClass = (status: string | null) => {
  if (status === "Perdido") return "border-destructive/30 bg-destructive/10 text-destructive";
  if (status === "Pós Venda") return "border-primary/25 bg-primary/10 text-primary";
  return "border-[oklch(var(--success)/0.25)] bg-[oklch(var(--success)/0.1)] text-[oklch(var(--success))]";
};

const commercialTableFeatures = tableFeatures({});
const leadColumn = createColumnHelper<typeof commercialTableFeatures, Lead>();
const leadColumns = leadColumn.columns([
  leadColumn.accessor("nome", {
    header: "Cliente",
    cell: ({ row }) => (
      <Link to={`/comercial/leads/${encodeURIComponent(row.original.id)}`} className="block min-w-48 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="block font-medium">{row.original.nome || "Sem nome"}</span>
        <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{row.original.numero || "Telefone não informado"}</span>
      </Link>
    ),
  }),
  leadColumn.accessor("canal", { header: "Canal", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("vendedor", { header: "Funcionário", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("entrar_em_contato", { header: "Próximo contato", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("status", { header: "Status", cell: ({ row }) => <LeadStatus lead={row.original} /> }),
  leadColumn.accessor("orcamento", { header: "Orçamento", cell: ({ getValue }) => getValue() === "Sim" ? "Sim" : "Não" }),
  leadColumn.accessor("venda", { header: "Venda", cell: ({ getValue }) => getValue() === "Sim" ? "Sim" : "Não" }),
  leadColumn.accessor("valor", { header: "Valor", cell: ({ getValue }) => formatCurrency(getValue()) }),
]);

function LeadStatus({ lead }: { lead: Lead }) {
  return <Badge variant="outline" className={cn("font-medium", statusClass(lead.status))}>{lead.status || "Ativo"}</Badge>;
}

export default function CommercialPage() {
  const navigate = useNavigate();
  const { leadId } = useParams();
  const { leads, isLoading, fetchLeads, addLead, updateLeadFields } = useLeads();
  const { people: employees } = useDirectory("employees");
  const { people: professionals } = useDirectory("professionals");
  const [search, setSearch] = useState("");
  const [channel, setChannel] = useState("");
  const [sellerId, setSellerId] = useState("");
  const [budget, setBudget] = useState("");
  const [sale, setSale] = useState("");
  const [statusView, setStatusView] = useState<StatusView>("Todos");
  const [page, setPage] = useState(0);
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  const baseFilteredLeads = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("pt-BR");
    return leads.filter((lead) => {
      const matchesSearch = !normalizedQuery || [lead.nome, lead.numero].some((value) => (value || "").toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      if (!matchesSearch) return false;
      if (channel && classifyCanal(lead.canal) !== channel) return false;
      if (sellerId && lead.vendedor_id !== sellerId) return false;
      if (budget && lead.orcamento !== budget) return false;
      if (sale && lead.venda !== sale) return false;
      return true;
    }).sort((a, b) => parseLeadDate(b.data_registro) - parseLeadDate(a.data_registro));
  }, [leads, search, channel, sellerId, budget, sale]);

  const viewCounts = useMemo(() => ({
    "Todos": baseFilteredLeads.length,
    "Em atendimento": baseFilteredLeads.filter((lead) => statusForView(lead.status) === "Em atendimento").length,
    "Perdidos": baseFilteredLeads.filter((lead) => statusForView(lead.status) === "Perdidos").length,
    "Pós-venda": baseFilteredLeads.filter((lead) => statusForView(lead.status) === "Pós-venda").length,
  }), [baseFilteredLeads]);

  const visibleLeads = useMemo(() => {
    const selected = statusView === "Todos" ? baseFilteredLeads : baseFilteredLeads.filter((lead) => statusForView(lead.status) === statusView);
    return selected;
  }, [baseFilteredLeads, statusView]);

  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const pageLeads = useMemo(() => visibleLeads.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE), [page, visibleLeads]);
  const table = useTable({ features: commercialTableFeatures, columns: leadColumns, data: pageLeads });
  const selectedLead = leadId ? leads.find((lead) => lead.id === leadId) || null : null;

  useEffect(() => setPage(0), [search, channel, sellerId, budget, sale, statusView]);
  useEffect(() => setPage((current) => Math.min(current, pageCount - 1)), [pageCount]);
  useEffect(() => {
    if (leadId && !isLoading && !selectedLead) navigate("/comercial/leads", { replace: true });
  }, [isLoading, leadId, navigate, selectedLead]);

  const clearFilters = () => {
    setSearch(""); setChannel(""); setSellerId(""); setBudget(""); setSale(""); setStatusView("Todos");
  };
  const hasFilters = Boolean(search || channel || sellerId || budget || sale || statusView !== "Todos");
  const openLead = (lead: Lead) => navigate(`/comercial/leads/${encodeURIComponent(lead.id)}`);
  const closeLead = () => navigate("/comercial/leads");

  const handleSave = async (changes: Parameters<typeof updateLeadFields>[1]) => {
    if (!selectedLead) return;
    setSavingLeadId(selectedLead.id);
    try {
      await updateLeadFields(selectedLead.id, changes);
    } finally {
      setSavingLeadId(null);
    }
  };

  const handleAddLead = async (data: NewLeadData) => {
    await addLead(data);
    setNewLeadOpen(false);
  };

  return (
    <>
      <div className="space-y-6">
        <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm text-muted-foreground">Relacionamento com clientes</p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">Leads</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acompanhe contatos, orçamentos, vendas e próximos retornos.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void fetchLeads()} disabled={isLoading}>
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
            </Button>
            <Button onClick={() => setNewLeadOpen(true)}><CirclePlus className="size-4" /> Novo lead</Button>
          </div>
        </section>

        <section aria-label="Resumo dos leads" className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {STATUS_VIEWS.map((view) => (
            <button key={view} type="button" onClick={() => setStatusView(view)} className="text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-lg">
              <Card className={cn("h-full transition-colors hover:border-primary/40", statusView === view && "border-primary/50 bg-primary/[0.03]")}>
                <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div>
                    <p className="text-sm text-muted-foreground">{view}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums">{viewCounts[view]}</p>
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><UsersRound className="size-4" /></span>
                </CardContent>
              </Card>
            </button>
          ))}
        </section>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-end">
              <div className="w-full flex-1 space-y-2">
                <label htmlFor="lead-search" className="text-xs font-medium text-muted-foreground">Buscar cliente</label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="lead-search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nome ou telefone" className="pl-9" />
                </div>
              </div>
              <FilterSelect label="Canal" value={channel} onChange={setChannel} options={["Internet", "Sua Visão", "Loja", "Du Benefícios", "Indique e Ganhe", "Sem Canal"]} />
              <FilterSelect label="Funcionário" value={sellerId} onChange={setSellerId} options={employees.map((person) => ({ value: person.id, label: person.name }))} />
              <FilterSelect label="Orçamento" value={budget} onChange={setBudget} options={["Sim", "Não"]} />
              <FilterSelect label="Venda" value={sale} onChange={setSale} options={["Sim", "Não"]} />
              {hasFilters && <Button variant="ghost" className="shrink-0" onClick={clearFilters}><FilterX className="size-4" /> Limpar</Button>}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-3">
              <div className="flex flex-wrap gap-1" role="group" aria-label="Visão dos leads">
                {STATUS_VIEWS.map((view) => (
                  <Button key={view} size="sm" variant={statusView === view ? "secondary" : "ghost"} aria-pressed={statusView === view} onClick={() => setStatusView(view)} className="h-9">
                    {view}<span className="ml-1.5 tabular-nums text-muted-foreground">{viewCounts[view]}</span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground" aria-live="polite">{visibleLeads.length} {visibleLeads.length === 1 ? "registro" : "registros"}</p>
            </div>
          </CardContent>
        </Card>

        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {isLoading ? (
            <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : visibleLeads.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground"><UsersRound className="size-5" /></span>
              <h3 className="mt-4 text-base font-semibold">Nenhum lead encontrado</h3>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">Ajuste os filtros ou cadastre um novo contato.</p>
              {hasFilters && <Button variant="outline" className="mt-4" onClick={clearFilters}>Limpar filtros</Button>}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <Table className="min-w-[920px]" aria-label="Lista de leads">
                  <TableHeader>
                    {table.getHeaderGroups().map((group) => (
                      <TableRow key={group.id} className="bg-muted/60 hover:bg-muted/60">
                        {group.headers.map((header) => <TableHead key={header.id} className={header.column.id === "orcamento" || header.column.id === "venda" ? "text-center" : header.column.id === "valor" ? "text-right" : undefined}>{header.isPlaceholder ? null : <table.FlexRender header={header} />}</TableHead>)}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {table.getRowModel().rows.map((row) => (
                      <TableRow key={row.id} className="h-14">
                        {row.getAllCells().map((cell) => (
                          <TableCell key={cell.id} className={cn("text-muted-foreground", (cell.column.id === "orcamento" || cell.column.id === "venda") && "text-center", cell.column.id === "valor" && "text-right tabular-nums", cell.column.id === "entrar_em_contato" && "tabular-nums")}>
                            <table.FlexRender cell={cell} />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <ul className="divide-y divide-border md:hidden" aria-label="Lista de leads">
                {pageLeads.map((lead) => (
                  <li key={lead.id}>
                    <button onClick={() => openLead(lead)} className="flex w-full flex-col gap-3 p-4 text-left transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex w-full items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{lead.nome || "Sem nome"}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{lead.numero || "Telefone não informado"}</span>
                        </span>
                        <LeadStatus lead={lead} />
                      </span>
                      <span className="grid w-full grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>{lead.canal || "Sem canal"}</span><span className="text-right">{lead.vendedor || "Sem responsável"}</span>
                        <span>Contato: {lead.entrar_em_contato || "Sem data"}</span><span className="text-right">Venda: {lead.venda || "Não"}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between gap-4 border-t border-border px-4 py-3 sm:px-5">
                <p className="text-sm text-muted-foreground">{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, visibleLeads.length)} de {visibleLeads.length}</p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => current - 1)} disabled={page === 0}><ArrowLeft className="size-4" /><span className="sr-only sm:not-sr-only">Anterior</span></Button>
                  <Button variant="outline" size="sm" onClick={() => setPage((current) => current + 1)} disabled={page + 1 >= pageCount}><span className="sr-only sm:not-sr-only">Próxima</span><ArrowRight className="size-4" /></Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        employees={employees}
        professionals={professionals}
        saving={savingLeadId === selectedLead?.id}
        onClose={closeLead}
        onSave={handleSave}
      />
      <NewLeadDialog open={newLeadOpen} onOpenChange={setNewLeadOpen} onSubmit={handleAddLead} existingLeads={leads} />
    </>
  );
}

type SelectOption = string | { value: string; label: string };
function FilterSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: SelectOption[] }) {
  return (
    <div className="min-w-[130px] flex-1 space-y-2 xl:flex-none">
      <label htmlFor={`filter-${label}`} className="text-xs font-medium text-muted-foreground">{label}</label>
      <select id={`filter-${label}`} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-ring xl:min-w-[132px]">
        <option value="">Todos</option>
        {options.map((option) => {
          const item = typeof option === "string" ? { value: option, label: option } : option;
          return <option key={item.value} value={item.value}>{item.label}</option>;
        })}
      </select>
    </div>
  );
}
