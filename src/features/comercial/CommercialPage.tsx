import { useEffect, useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Link } from "react-router-dom";
import { CirclePlus, RefreshCw, UsersRound } from "lucide-react";
import { DataState } from "@/components/data/DataState";
import { DataTablePagination } from "@/components/data/DataTablePagination";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { LeadStatusBadge } from "@/components/data/LeadStatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app/PageHeader";
import { FilterPanel } from "@/components/data/FilterPanel";
import { FilterField } from "@/components/data/FilterField";
import { FilterGrid } from "@/components/data/FilterGrid";
import { SearchInput } from "@/components/data/SearchInput";
import { SelectFilter } from "@/components/data/SelectFilter";
import { NewLeadDialog } from "@/components/Dashboard/NewLeadDialog";
import { useDirectory } from "@/hooks/useDirectory";
import { categoryMatchesValue, useCategories } from "@/hooks/useCategories";
import { useLeads, type Lead, type NewLeadData } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";
import { LeadDetailSheet } from "./LeadDetailSheet";

const PAGE_SIZE = 25;
const STATUS_VIEWS = ["Todos", "Em atendimento", "Perdidos", "Pós-venda"] as const;
type StatusView = (typeof STATUS_VIEWS)[number];

const statusViewFromQuery = (value: string | null): StatusView => {
  if (value === "perdidos") return "Perdidos";
  if (value === "pos-venda") return "Pós-venda";
  if (value === "em-atendimento") return "Em atendimento";
  return "Todos";
};

const statusViewToQuery = (value: StatusView) => {
  if (value === "Perdidos") return "perdidos";
  if (value === "Pós-venda") return "pos-venda";
  if (value === "Em atendimento") return "em-atendimento";
  return null;
};

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

const commercialTableFeatures = tableFeatures({});
const leadColumn = createColumnHelper<typeof commercialTableFeatures, Lead>();

function LeadNameLink({ lead }: { lead: Lead }) {
  const { search } = useLocation();
  return (
    <Link to={`/comercial/leads/${encodeURIComponent(lead.id)}${search}`} className="block min-w-48 rounded-sm outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <span className="block font-medium">{lead.nome || "Sem nome"}</span>
      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{lead.numero || "Telefone não informado"}</span>
    </Link>
  );
}

const leadColumns = leadColumn.columns([
  leadColumn.accessor("nome", {
    header: "Cliente",
    cell: ({ row }) => <LeadNameLink lead={row.original} />,
  }),
  leadColumn.accessor("canal", { header: "Canal", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("vendedor", { header: "Funcionário", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("entrar_em_contato", { header: "Próximo contato", cell: ({ getValue }) => getValue() || "—" }),
  leadColumn.accessor("status", { header: "Status", cell: ({ row }) => <LeadStatusBadge status={row.original.status} /> }),
  leadColumn.accessor("orcamento", { header: "Orçamento", cell: ({ getValue }) => getValue() === "Sim" ? "Sim" : "Não" }),
  leadColumn.accessor("venda", { header: "Venda", cell: ({ getValue }) => getValue() === "Sim" ? "Sim" : "Não" }),
  leadColumn.accessor("valor", { header: "Valor", cell: ({ getValue }) => formatCurrency(getValue()) }),
]);

export default function CommercialPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { leadId } = useParams();
  const { leads, isLoading, error, fetchLeads, addLead, updateLeadFields } = useLeads();
  const { people: employees, isLoading: employeesLoading, error: employeesError, refresh: refreshEmployees } = useDirectory("employees");
  const { people: professionals, isLoading: professionalsLoading, error: professionalsError, refresh: refreshProfessionals } = useDirectory("professionals");
  const { categories: channelCategories, isLoading: channelsLoading, error: channelsError, refresh: refreshChannels } = useCategories("lead_channel");
  const search = searchParams.get("q") || "";
  const channel = searchParams.get("channel") || "";
  const sellerId = searchParams.get("employee") || "";
  const budget = searchParams.get("budget") || "";
  const sale = searchParams.get("sale") || "";
  const statusView = statusViewFromQuery(searchParams.get("view"));
  const rawPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 0;
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [savingLeadId, setSavingLeadId] = useState<string | null>(null);

  const updateQuery = (updates: Record<string, string | null>, resetPage = true) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(updates)) {
        if (value) next.set(key, value);
        else next.delete(key);
      }
      if (resetPage) next.delete("page");
      return next;
    }, { replace: true });
  };
  const setPage = (update: number | ((current: number) => number)) => {
    const nextPage = typeof update === "function" ? update(page) : update;
    updateQuery({ page: nextPage > 0 ? String(nextPage) : null }, false);
  };

  const channelFilterOptions = useMemo(() => {
    const categorizedOptions = channelCategories.map((category) => ({
      value: `category:${category.id}`,
      label: category.is_active ? category.label : `${category.label} (inativo)`,
    }));
    const legacyOptions = [...new Set(leads
      .map((lead) => lead.canal)
      .filter((value): value is string => Boolean(value?.trim()) && !channelCategories.some((category) => categoryMatchesValue(category, value))))]
      .map((value) => ({ value: `legacy:${value}`, label: `${value} (valor existente)` }));
    return [...categorizedOptions, ...legacyOptions, { value: "__empty__", label: "Sem canal" }];
  }, [channelCategories, leads]);

  const baseFilteredLeads = useMemo(() => {
    const normalizedQuery = search.trim().toLocaleLowerCase("pt-BR");
    return leads.filter((lead) => {
      const matchesSearch = !normalizedQuery || [lead.nome, lead.numero].some((value) => (value || "").toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      if (!matchesSearch) return false;
      if (channel.startsWith("category:")) {
        const category = channelCategories.find((item) => item.id === channel.slice("category:".length));
        if (!category || !categoryMatchesValue(category, lead.canal)) return false;
      } else if (channel.startsWith("legacy:")) {
        if (lead.canal !== channel.slice("legacy:".length)) return false;
      } else if (channel === "__empty__" && lead.canal?.trim()) return false;
      if (sellerId && lead.vendedor_id !== sellerId) return false;
      if (budget && lead.orcamento !== budget) return false;
      if (sale && lead.venda !== sale) return false;
      return true;
    }).sort((a, b) => parseLeadDate(b.data_registro) - parseLeadDate(a.data_registro));
  }, [channelCategories, leads, search, channel, sellerId, budget, sale]);

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

  useEffect(() => {
    if (!isLoading && page >= pageCount) {
      const nextPage = pageCount - 1;
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (nextPage > 0) next.set("page", String(nextPage));
        else next.delete("page");
        return next;
      }, { replace: true });
    }
  }, [isLoading, page, pageCount, setSearchParams]);
  useEffect(() => {
    if (leadId && !isLoading && !selectedLead) navigate(`/comercial/leads${location.search}`, { replace: true });
  }, [isLoading, leadId, location.search, navigate, selectedLead]);

  const clearFilters = () => {
    updateQuery({ q: null, channel: null, employee: null, budget: null, sale: null, view: null, page: null }, false);
  };
  const hasFilters = Boolean(search || channel || sellerId || budget || sale || statusView !== "Todos");
  const openLead = (lead: Lead) => navigate(`/comercial/leads/${encodeURIComponent(lead.id)}${location.search}`);
  const returnTo = (location.state as { returnTo?: unknown } | null)?.returnTo;
  const closeLead = () => navigate(
    typeof returnTo === "string" && /^\/hoje(?:\?|$)/.test(returnTo)
      ? returnTo
      : `/comercial/leads${location.search}`,
  );

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

  const initialLeadLoad = isLoading && leads.length === 0;
  const initialLeadError = Boolean(error && leads.length === 0);

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Leads"
          description="Acompanhe contatos, orçamentos, vendas e próximos retornos."
          actions={(
            <>
              <Button variant="outline" aria-label="Atualizar leads" onClick={() => void fetchLeads()} disabled={isLoading}>
              <RefreshCw className={cn("size-4", isLoading && "animate-spin")} />
              <span className="hidden sm:inline">Atualizar</span>
              </Button>
              <Button onClick={() => setNewLeadOpen(true)}><CirclePlus className="size-4" /> Novo lead</Button>
            </>
          )}
        />

        <section aria-label="Resumo dos leads" aria-busy={initialLeadLoad} className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {STATUS_VIEWS.map((view) => (
            <Button key={view} type="button" variant="ghost" aria-pressed={statusView === view} onClick={() => updateQuery({ view: statusViewToQuery(view) })} className="h-auto w-full min-w-0 whitespace-normal rounded-lg p-0 text-left hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Card className={cn("h-full w-full transition-colors hover:border-primary/40", statusView === view && "border-primary/50 bg-primary/[0.03]")}>
                <CardContent className="flex items-center justify-between gap-3 p-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground sm:text-sm">{view}</p>
                    {initialLeadLoad ? (
                      <Skeleton aria-hidden="true" className="mt-2 h-7 w-12" />
                    ) : initialLeadError ? (
                      <p className="mt-1 text-2xl font-semibold tabular-nums">
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">Contagem indisponível</span>
                      </p>
                    ) : (
                      <p className="mt-1 text-2xl font-semibold tabular-nums">{viewCounts[view]}</p>
                    )}
                  </div>
                  <span className="flex size-9 items-center justify-center rounded-md bg-muted text-muted-foreground"><UsersRound className="size-4" /></span>
                </CardContent>
              </Card>
            </Button>
          ))}
        </section>

        <FilterPanel
          hasActiveFilters={hasFilters}
          onClear={clearFilters}
          resultSummary={initialLeadLoad ? "Carregando leads…" : initialLeadError ? "Registros indisponíveis" : `${visibleLeads.length} ${visibleLeads.length === 1 ? "registro" : "registros"}`}
        >
            <FilterGrid columns={5}>
              <FilterField id="lead-search" label="Buscar cliente" className="w-full min-w-0 sm:col-span-2 xl:col-span-1">
                <SearchInput id="lead-search" value={search} onChange={(event) => updateQuery({ q: event.target.value })} placeholder="Nome ou telefone" />
              </FilterField>
              <SelectFilter
                id="lead-channel-filter"
                label="Canal"
                searchable
                value={channel || "__all__"}
                onValueChange={(value) => updateQuery({ channel: value === "__all__" ? "" : value })}
                options={[{ value: "__all__", label: "Todos" }, ...channelFilterOptions]}
                className="min-w-0 xl:min-w-[130px]"
                triggerClassName="h-10 xl:min-w-[132px]"
              />
              <SelectFilter
                id="lead-employee-filter"
                label="Funcionário"
                searchable
                value={sellerId || "__all__"}
                onValueChange={(value) => updateQuery({ employee: value === "__all__" ? "" : value })}
                options={[{ value: "__all__", label: "Todos" }, ...employees.map((person) => ({ value: person.id, label: person.name }))]}
                className="min-w-0 xl:min-w-[130px]"
                triggerClassName="h-10 xl:min-w-[132px]"
              />
              <SelectFilter
                id="lead-budget-filter"
                label="Orçamento"
                value={budget || "__all__"}
                onValueChange={(value) => updateQuery({ budget: value === "__all__" ? "" : value })}
                options={[{ value: "__all__", label: "Todos" }, "Sim", "Não"]}
                className="min-w-0 xl:min-w-[130px]"
                triggerClassName="h-10 xl:min-w-[132px]"
              />
              <SelectFilter
                id="lead-sale-filter"
                label="Venda"
                value={sale || "__all__"}
                onValueChange={(value) => updateQuery({ sale: value === "__all__" ? "" : value })}
                options={[{ value: "__all__", label: "Todos" }, "Sim", "Não"]}
                className="min-w-0 xl:min-w-[130px]"
                triggerClassName="h-10 xl:min-w-[132px]"
              />
            </FilterGrid>
        </FilterPanel>

        {error && leads.length > 0 && (
          <DataState
            variant="error"
            title="Lista desatualizada"
            description="Os leads carregados continuam disponíveis, mas a última atualização falhou."
            action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }}
          />
        )}
        {isLoading && leads.length > 0 && <DataState variant="refreshing" title="Atualizando leads" />}
        <div className="overflow-hidden rounded-lg border border-border bg-card">
          {isLoading && leads.length === 0 ? (
            <div className="space-y-3 p-5">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-12 w-full" />)}</div>
          ) : error && leads.length === 0 ? (
            <DataState
              variant="error"
              title="Leads indisponíveis"
              description={error}
              action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }}
              className="m-4"
            />
          ) : visibleLeads.length === 0 ? (
            <DataState
              variant="empty"
              title="Nenhum lead encontrado"
              description="Ajuste os filtros ou cadastre um novo contato."
              action={hasFilters ? { label: "Limpar filtros", onClick: clearFilters } : undefined}
              className="min-h-64 rounded-none border-0 px-5"
            />
          ) : (
            <>
              <EntityDataTable
                table={table}
                label="Lista de leads"
                className="hidden rounded-none border-0 bg-transparent md:block"
                tableClassName="min-w-[920px]"
                rowClassName="h-14"
                getHeaderClassName={(columnId) => columnId === "orcamento" || columnId === "venda" ? "text-center" : columnId === "valor" ? "text-right" : undefined}
                getCellClassName={(columnId) => cn(
                  "text-muted-foreground",
                  (columnId === "orcamento" || columnId === "venda") && "text-center",
                  columnId === "valor" && "text-right tabular-nums",
                  columnId === "entrar_em_contato" && "tabular-nums",
                )}
              />
              <ul className="divide-y divide-border md:hidden" aria-label="Lista de leads">
                {pageLeads.map((lead) => (
                  <li key={lead.id}>
                    <Button type="button" variant="ghost" onClick={() => openLead(lead)} className="h-auto w-full flex-col items-start gap-3 whitespace-normal rounded-none p-4 text-left transition-colors hover:bg-muted/50 focus-visible:ring-2 focus-visible:ring-ring">
                      <span className="flex w-full items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{lead.nome || "Sem nome"}</span>
                          <span className="mt-0.5 block text-sm text-muted-foreground">{lead.numero || "Telefone não informado"}</span>
                        </span>
                        <LeadStatusBadge status={lead.status} />
                      </span>
                      <span className="grid w-full grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <span>{lead.canal || "Sem canal"}</span><span className="text-right">{lead.vendedor || "Sem responsável"}</span>
                        <span>Contato: {lead.entrar_em_contato || "Sem data"}</span><span className="text-right">Venda: {lead.venda || "Não"}</span>
                      </span>
                    </Button>
                  </li>
                ))}
              </ul>
              <DataTablePagination
                total={visibleLeads.length}
                page={page + 1}
                pageSize={PAGE_SIZE}
                onPageChange={(nextPage) => setPage(nextPage - 1)}
                showPageSizeSelector={false}
                label="leads"
                className="rounded-none border-x-0 border-b-0 px-4 py-3 sm:px-5"
              />
            </>
          )}
        </div>
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        channelCategories={channelCategories}
        employees={employees}
        professionals={professionals}
        employeesLoading={employeesLoading}
        employeesError={employeesError}
        refreshEmployees={refreshEmployees}
        professionalsLoading={professionalsLoading}
        professionalsError={professionalsError}
        refreshProfessionals={refreshProfessionals}
        saving={savingLeadId === selectedLead?.id}
        onClose={closeLead}
        onSave={handleSave}
      />
      <NewLeadDialog
        open={newLeadOpen}
        onOpenChange={setNewLeadOpen}
        onSubmit={handleAddLead}
        existingLeads={leads}
        channelCategories={channelCategories}
        channelsLoading={channelsLoading}
        channelsError={channelsError}
        refreshChannels={refreshChannels}
        employees={employees}
        employeesLoading={employeesLoading}
        employeesError={employeesError}
        refreshEmployees={refreshEmployees}
        professionals={professionals}
        professionalsLoading={professionalsLoading}
        professionalsError={professionalsError}
        refreshProfessionals={refreshProfessionals}
      />
    </>
  );
}
