import { useCallback, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataState } from "@/components/data/DataState";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { DataTablePagination } from "@/components/data/DataTablePagination";
import { LeadStatusBadge } from "@/components/data/LeadStatusBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { useLeads, type Lead } from "@/hooks/useLeads";
import { cn } from "@/lib/utils";

type WorkFilter = "overdue" | "today" | "upcoming" | "pending";
type DatedLead = { lead: Lead; contactDate: Date | null };
const PAGE_SIZE = 25;

const WORK_FILTERS: Array<{ id: WorkFilter; label: string; description: string }> = [
  { id: "overdue", label: "Atrasados", description: "Contatos com data anterior a hoje." },
  { id: "today", label: "Hoje", description: "Contatos previstos para hoje." },
  { id: "upcoming", label: "Próximos contatos", description: "Contatos previstos para depois de hoje." },
  { id: "pending", label: "Pendências", description: "Leads sem dados básicos ou sem data de contato válida." },
];

const todayTableFeatures = tableFeatures({});
const todayColumn = createColumnHelper<typeof todayTableFeatures, DatedLead>();

function parseLocalDate(value: string | null): Date | null {
  if (!value?.trim()) return null;
  const parts = value.trim().split("/").map(Number);
  if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return null;
  const [day, month, year] = parts;
  if (day < 1 || month < 1 || month > 12 || year < 1000) return null;
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfLocalDay(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  start.setHours(0, 0, 0, 0);
  return start;
}

function hasMissingWorkData(lead: Lead, contactDate: Date | null) {
  return !lead.nome?.trim()
    || !lead.numero?.trim()
    || !lead.canal?.trim()
    || !(lead.vendedor_id || lead.vendedor?.trim())
    || !contactDate;
}

function leadPath(lead: Lead) {
  return `/comercial/leads/${encodeURIComponent(lead.id)}`;
}

function contactDateLabel(lead: Lead, contactDate: Date | null) {
  return contactDate
    ? format(contactDate, "dd/MM/yyyy")
    : lead.entrar_em_contato?.trim()
      ? "Data inválida"
      : "Sem data";
}

function LeadQueueCard({ lead, contactDate, returnTo, onOpen }: {
  lead: Lead;
  contactDate: Date | null;
  returnTo: string;
  onOpen: () => void;
}) {
  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <Link
              to={leadPath(lead)}
              state={{ returnTo }}
              className="rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {lead.nome?.trim() || "Sem nome"}
            </Link>
            <p className="mt-0.5 break-all text-xs text-muted-foreground">{lead.numero?.trim() || "Telefone não informado"}</p>
          </div>
          <LeadStatusBadge status={lead.status} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Próximo contato</dt>
            <dd className="mt-0.5 font-medium">{contactDateLabel(lead, contactDate)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Funcionário</dt>
            <dd className="mt-0.5 truncate font-medium">{lead.vendedor?.trim() || "Sem responsável"}</dd>
          </div>
        </dl>
        <Button type="button" variant="outline" className="w-full" onClick={onOpen} aria-label={`Abrir lead de ${lead.nome?.trim() || "Sem nome"}`}>
          Abrir lead
        </Button>
      </CardContent>
    </Card>
  );
}

export default function HojePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { leads, isLoading, error, fetchLeads } = useLeads();
  const filterParam = searchParams.get("fila");
  const selectedFilter = WORK_FILTERS.some((filter) => filter.id === filterParam) ? filterParam as WorkFilter : null;
  const requestedPage = Number(searchParams.get("page"));
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [today, setToday] = useState(() => startOfLocalDay(new Date()));
  useEffect(() => {
    const timer = window.setInterval(() => {
      setToday((current) => {
        const refreshed = startOfLocalDay(new Date());
        return refreshed.getTime() === current.getTime() ? current : refreshed;
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const { groups, scheduledQueue, defaultFilter } = useMemo(() => {
    const activeLeads = leads.filter((lead) => lead.status !== "Perdido");
    const dated = activeLeads.map((lead) => ({ lead, contactDate: parseLocalDate(lead.entrar_em_contato) }));
    const overdue = dated.filter(({ contactDate }) => contactDate && contactDate < today);
    const dueToday = dated.filter(({ contactDate }) => contactDate?.getTime() === today.getTime());
    const upcoming = dated.filter(({ contactDate }) => contactDate && contactDate > today);
    const pending = dated.filter(({ lead, contactDate }) => hasMissingWorkData(lead, contactDate));
    const sortByDueDate = (a: DatedLead, b: DatedLead) => {
      const dateDifference = (a.contactDate?.getTime() ?? Number.MAX_SAFE_INTEGER) - (b.contactDate?.getTime() ?? Number.MAX_SAFE_INTEGER);
      if (dateDifference !== 0) return dateDifference;
      return Date.parse(a.lead.created_at) - Date.parse(b.lead.created_at);
    };
    const sortedOverdue = [...overdue].sort(sortByDueDate);
    const sortedToday = [...dueToday].sort(sortByDueDate);
    const sortedUpcoming = [...upcoming].sort(sortByDueDate);
    const sortedPending = [...pending].sort(sortByDueDate);
    const scheduled = dated.filter(({ contactDate }) => contactDate).sort(sortByDueDate);
    const defaultWorkFilter: WorkFilter = sortedOverdue.length > 0
      ? "overdue"
      : sortedToday.length > 0
        ? "today"
        : sortedUpcoming.length > 0
          ? "upcoming"
          : "pending";

    return {
      groups: { overdue: sortedOverdue, today: sortedToday, upcoming: sortedUpcoming, pending: sortedPending },
      scheduledQueue: scheduled,
      defaultFilter: defaultWorkFilter,
    };
  }, [leads, today]);

  const activeFilter = selectedFilter ?? defaultFilter;
  const visibleLeads = groups[activeFilter];
  const pageCount = Math.max(1, Math.ceil(visibleLeads.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const pageLeads = useMemo(
    () => visibleLeads.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, visibleLeads],
  );
  const nextContact = scheduledQueue[0]?.lead;
  const selectFilter = (filter: WorkFilter) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("fila", filter);
      next.delete("page");
      return next;
    }, { replace: true });
  };
  const selectPage = (nextPage: number) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      if (nextPage > 1) next.set("page", String(nextPage));
      else next.delete("page");
      return next;
    });
  };
  useEffect(() => {
    if (isLoading && leads.length === 0) return;
    if (page !== currentPage || (currentPage === 1 && searchParams.has("page"))) {
      setSearchParams((current) => {
        const next = new URLSearchParams(current);
        if (currentPage > 1) next.set("page", String(currentPage));
        else next.delete("page");
        return next;
      }, { replace: true });
    }
  }, [currentPage, isLoading, leads.length, page, searchParams, setSearchParams]);
  const openLead = useCallback((lead: Lead) => navigate(leadPath(lead), {
    state: { returnTo: `${location.pathname}${location.search}` },
  }), [location.pathname, location.search, navigate]);
  const todayColumns = useMemo(() => todayColumn.columns([
    todayColumn.accessor(({ lead }) => lead.nome || "", {
      id: "cliente",
      header: "Cliente",
      cell: ({ row }) => (
        <>
          <Link
            to={leadPath(row.original.lead)}
            state={{ returnTo: `${location.pathname}${location.search}` }}
            className="rounded-sm text-left font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {row.original.lead.nome?.trim() || "Sem nome"}
          </Link>
          <span className="mt-0.5 block text-xs text-muted-foreground">{row.original.lead.numero?.trim() || "Telefone não informado"}</span>
        </>
      ),
    }),
    todayColumn.accessor(({ lead, contactDate }) => contactDateLabel(lead, contactDate), {
      id: "proximoContato",
      header: "Próximo contato",
    }),
    todayColumn.accessor(({ lead }) => lead.vendedor?.trim() || "Sem responsável", {
      id: "funcionario",
      header: "Funcionário",
    }),
    todayColumn.accessor(({ lead }) => lead.status || "Ativo", {
      id: "status",
      header: "Status",
      cell: ({ row }) => <LeadStatusBadge status={row.original.lead.status} />,
    }),
    todayColumn.display({
      id: "acoes",
      header: "Ações",
      cell: ({ row }) => (
        <Button type="button" variant="outline" size="sm" onClick={() => openLead(row.original.lead)} aria-label={`Abrir lead de ${row.original.lead.nome?.trim() || "Sem nome"}`}>
          Abrir
        </Button>
      ),
    }),
  ]), [location.pathname, location.search, openLead]);
  const todayTable = useTable({
    features: todayTableFeatures,
    columns: todayColumns,
    data: pageLeads,
    getRowId: (item) => item.lead.id,
  });

  return (
    <section className="space-y-6">
      <PageHeader
        title="Resumo de hoje"
        description={format(today, "EEEE, d 'de' MMMM", { locale: ptBR })}
        actions={(
          <Button
            onClick={() => nextContact ? openLead(nextContact) : navigate("/comercial/leads")}
            disabled={isLoading && leads.length === 0}
          >
            {nextContact ? "Abrir próximo contato" : "Ver Comercial"}
          </Button>
        )}
      />

      {isLoading && leads.length === 0 ? (
        <DataState variant="loading" title="Carregando seu dia" description="Consultando prazos e pendências dos leads." />
      ) : error && leads.length === 0 ? (
        <DataState variant="error" title="Agenda indisponível" description={error} action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }} />
      ) : (
        <>
          {error && (
            <DataState variant="error" title="Dados desatualizados" description="Os registros já carregados continuam visíveis, mas a atualização falhou." action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }} />
          )}
          {isLoading && leads.length > 0 && <DataState variant="refreshing" title="Atualizando os dados do dia" />}

          {leads.length === 0 ? (
            <DataState variant="empty" title="Nenhum lead cadastrado" description="Os próximos contatos e pendências aparecerão aqui quando houver registros." action={{ label: "Abrir Comercial", onClick: () => navigate("/comercial/leads") }} />
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
                {WORK_FILTERS.map((filter) => (
                  <Button
                    key={filter.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={activeFilter === filter.id}
                    onClick={() => selectFilter(filter.id)}
                    className="h-auto min-w-0 whitespace-normal rounded-lg p-0 text-left hover:bg-transparent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  >
                    <Card className={cn("h-full w-full transition-colors hover:border-primary/40", activeFilter === filter.id && "border-primary/50 bg-primary/[0.03]")}>
                      <CardContent className="p-4 sm:p-5">
                        <span className="block text-sm text-muted-foreground">{filter.label}</span>
                        <span className="mt-1 block text-2xl font-semibold tabular-nums">{groups[filter.id].length}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{filter.description}</span>
                      </CardContent>
                    </Card>
                  </Button>
                ))}
              </div>

              <section aria-labelledby="today-queue-heading" className="space-y-3">
                <div className="flex flex-wrap items-end justify-between gap-2">
                  <div>
                    <h3 id="today-queue-heading" className="text-lg font-semibold">{WORK_FILTERS.find((filter) => filter.id === activeFilter)?.label}</h3>
                    <p className="text-sm text-muted-foreground">{WORK_FILTERS.find((filter) => filter.id === activeFilter)?.description}</p>
                  </div>
                  <Button type="button" variant="outline" onClick={() => navigate("/comercial/leads")}>Ver todos os leads</Button>
                </div>

                {visibleLeads.length === 0 ? (
                  <DataState variant="empty" title="Nenhum registro nesta lista" description="Os outros contadores continuam disponíveis acima." />
                ) : (
                  <>
                    <ul className="grid gap-3 md:hidden" aria-label={`Lista de ${WORK_FILTERS.find((filter) => filter.id === activeFilter)?.label.toLocaleLowerCase("pt-BR")}`}>
                      {pageLeads.map(({ lead, contactDate }) => (
                        <li key={lead.id}>
                          <LeadQueueCard
                            lead={lead}
                            contactDate={contactDate}
                            returnTo={`${location.pathname}${location.search}`}
                            onOpen={() => openLead(lead)}
                          />
                        </li>
                      ))}
                    </ul>
                    <EntityDataTable
                      table={todayTable}
                      label={`Lista de ${WORK_FILTERS.find((filter) => filter.id === activeFilter)?.label.toLocaleLowerCase("pt-BR")}`}
                      className="hidden md:block"
                      getCellClassName={(columnId) => columnId === "cliente" ? "min-w-48" : columnId === "proximoContato" ? "whitespace-nowrap" : columnId === "acoes" ? "text-right" : undefined}
                    />
                    <DataTablePagination
                      total={visibleLeads.length}
                      page={currentPage}
                      pageSize={PAGE_SIZE}
                      onPageChange={selectPage}
                      showPageSizeSelector={false}
                      label={`contatos ${WORK_FILTERS.find((filter) => filter.id === activeFilter)?.label.toLocaleLowerCase("pt-BR")}`}
                    />
                  </>
                )}
              </section>
            </>
          )}
        </>
      )}
    </section>
  );
}
