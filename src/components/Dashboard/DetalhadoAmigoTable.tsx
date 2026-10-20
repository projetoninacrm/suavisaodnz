import { useState, useMemo, useEffect, type ReactNode } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { MessageCircle, Calendar, RefreshCw, Users, FileText, Tag, TrendingUp, Percent, ShoppingCart, Store, UserCheck, Trash2, MoreVertical, UserPlus } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilterPanel } from "@/components/data/FilterPanel";
import { FilterField } from "@/components/data/FilterField";
import { FilterGrid } from "@/components/data/FilterGrid";
import { SearchInput } from "@/components/data/SearchInput";
import { ExpandableTextCell } from "./ExpandableTextCell";
import { YesNoSelectCell } from "./YesNoSelectCell";
import { MultiSelectFilter, UNINFORMED_FILTER_VALUE, type MultiSelectFilterItem } from "./MultiSelectFilter";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";
import { DataState } from "@/components/data/DataState";
import { DataTablePagination } from "@/components/data/DataTablePagination";
import { CategorySelect } from "@/components/data/CategorySelect";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { useCategories, categoryMatchesValue, normalizeCategoryValue } from "@/hooks/useCategories";
import type { CategoryCatalogItem } from "@/hooks/useCategories";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AmigoAttendance } from "@/hooks/useDetalhadoAmigo";
import type { GenericRecord } from "@/hooks/useGenericTable";
import { useRouteState } from "@/hooks/useRouteState";
import type { DateRange } from "react-day-picker";
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

interface DetalhadoAmigoTableProps {
  attendances: AmigoAttendance[];
  isLoading: boolean;
  sourceError: string | null;
  dateRange: { start: Date; end: Date };
  onDateRangeChange: (start: Date, end: Date) => void;
  onRefresh: () => void;
  dbRecords: GenericRecord[];
  isDbLoading: boolean;
  dbError: string | null;
  onUpdateDb: (id: string, field: string, value: string) => void;
  onCreateDb: (record: Partial<GenericRecord>) => Promise<string | null>;
  onDeleteDb: (id: string) => void;
  onRefreshDb: () => void;
  onAddToLeads: (lead: { nome: string; numero: string }) => Promise<void>;
}

interface Filters {
  patient_name: string;
  professional: string[];
  como_conheceu: string[];
  receita: string[];
  venda: string[];
  visitou_loja: string[];
  tipo: string[];
}

const EMPTY_FILTERS: Filters = {
  patient_name: "",
  professional: [],
  como_conheceu: [],
  receita: [],
  venda: [],
  visitou_loja: [],
  tipo: [],
};

function emptyFilters(): Filters { return EMPTY_FILTERS; }

function parseFilters(value: unknown): Filters {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_FILTERS;
  const source = value as Partial<Record<keyof Filters, unknown>>;
  const strings = (item: unknown) => Array.isArray(item) ? item.filter((entry): entry is string => typeof entry === "string") : [];
  return {
    patient_name: typeof source.patient_name === "string" ? source.patient_name : "",
    professional: strings(source.professional),
    como_conheceu: strings(source.como_conheceu),
    receita: strings(source.receita),
    venda: strings(source.venda),
    visitou_loja: strings(source.visitou_loja),
    tipo: strings(source.tipo),
  };
}

// Tipo combinado: dados da API + dados editáveis do banco
interface CombinedRecord {
  apiId: string;
  dbId: string | null;
  date: string;
  time: string; // Horário do atendimento para ordenação
  patient_name: string;
  patient_age: number | null;
  patient_phone: string | null;
  patient_know_by: string | null;
  event_name: string; // Tipo de atendimento da API
  doctor_name: string;
// Campos editáveis do banco
  como_conheceu: string;
  receita: string;
  visitou_loja: string;
  venda: string;
  obs: string;
}

type AttendanceTableMeta = {
  renderName: (record: CombinedRecord) => ReactNode;
  renderPhone: (record: CombinedRecord) => ReactNode;
  renderOrigin: (record: CombinedRecord) => ReactNode;
  renderRevenue: (record: CombinedRecord) => ReactNode;
  renderSale: (record: CombinedRecord) => ReactNode;
  renderStoreVisit: (record: CombinedRecord) => ReactNode;
  renderObservation: (record: CombinedRecord) => ReactNode;
  renderActions: (record: CombinedRecord) => ReactNode;
};

const attendanceTableFeatures = tableFeatures({ tableMeta: {} as AttendanceTableMeta });
const attendanceColumn = createColumnHelper<typeof attendanceTableFeatures, CombinedRecord>();
const attendanceColumns = attendanceColumn.columns([
  attendanceColumn.accessor("patient_name", { header: "Nome", cell: ({ row, table }) => table.options.meta.renderName(row.original) }),
  attendanceColumn.accessor("patient_age", { header: "Idade", cell: ({ getValue }) => getValue() !== null ? `${getValue()} anos` : "-" }),
  attendanceColumn.accessor("patient_phone", { header: "Telefone", cell: ({ row, table }) => table.options.meta.renderPhone(row.original) }),
  attendanceColumn.accessor("event_name", { header: "Tipo", cell: ({ getValue }) => getValue() || "-" }),
  attendanceColumn.display({ id: "origem", header: "Origem do contato", cell: ({ row, table }) => table.options.meta.renderOrigin(row.original) }),
  attendanceColumn.display({ id: "receita", header: "Receita", cell: ({ row, table }) => table.options.meta.renderRevenue(row.original) }),
  attendanceColumn.display({ id: "venda", header: "Venda", cell: ({ row, table }) => table.options.meta.renderSale(row.original) }),
  attendanceColumn.accessor("date", { header: "Data" }),
  attendanceColumn.display({ id: "visita", header: "Visita à loja", cell: ({ row, table }) => table.options.meta.renderStoreVisit(row.original) }),
  attendanceColumn.display({ id: "observacao", header: "Observação", cell: ({ row, table }) => table.options.meta.renderObservation(row.original) }),
  attendanceColumn.display({ id: "acoes", header: "Ações", cell: ({ row, table }) => table.options.meta.renderActions(row.original) }),
]);

function formatPhoneForWhatsApp(phone: string | null) {
  if (!phone) return null;
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length === 11 || cleaned.length === 10) return `55${cleaned}`;
  return cleaned;
}

function AttendanceRowActions({ record, addDisabled, deleteDisabled, onAddToLeads, onDelete }: {
  record: CombinedRecord;
  addDisabled: boolean;
  deleteDisabled: boolean;
  onAddToLeads: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={(
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Ações para ${record.patient_name}`}
              className="size-9 text-muted-foreground hover:text-foreground"
              disabled={addDisabled}
            >
              <MoreVertical className="size-4" aria-hidden="true" />
            </Button>
          )}
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onAddToLeads} disabled={addDisabled}>
            <UserPlus className="mr-2 size-4" aria-hidden="true" />
            Adicionar aos Leads
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      {record.dbId && (
        <AlertDialog>
          <AlertDialogTrigger render={(
            <Button
              variant="ghost"
              size="icon"
              className="size-9 text-muted-foreground hover:text-destructive"
              aria-label={`Excluir complementos locais de ${record.patient_name}`}
              disabled={deleteDisabled}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          )} />
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir complementos deste atendimento?</AlertDialogTitle>
              <AlertDialogDescription>
                Os dados locais de origem, receita, venda, visita e observação de <strong>{record.patient_name}</strong> serão removidos. O atendimento original do Amigo permanece. Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteDisabled} onClick={onDelete}>
                Excluir complementos
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

function AttendanceMobileCard({ record, categories, fallbackOrigins, fieldsDisabled, addDisabled, deleteDisabled, onUpdate, onAddToLeads, onDelete }: {
  record: CombinedRecord;
  categories: CategoryCatalogItem[];
  fallbackOrigins: string[];
  fieldsDisabled: boolean;
  addDisabled: boolean;
  deleteDisabled: boolean;
  onUpdate: (field: string, value: string) => void;
  onAddToLeads: () => void;
  onDelete: () => void;
}) {
  const whatsappNumber = formatPhoneForWhatsApp(record.patient_phone);

  return (
    <Card className="w-full min-w-0">
      <CardContent className="min-w-0 space-y-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="break-words font-semibold">{record.patient_name || "Sem nome"}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{record.event_name || "Atendimento"}{record.doctor_name ? ` · ${record.doctor_name}` : ""}</p>
          </div>
          <div className="shrink-0 text-right text-sm tabular-nums">
            <p className="font-medium">{record.date}</p>
            {record.time && <p className="text-xs text-muted-foreground">{record.time}</p>}
          </div>
        </div>

        <dl className="grid min-w-0 grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-3 text-sm">
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Telefone</dt>
            <dd className="mt-0.5 flex min-w-0 items-center gap-1">
              <span className="min-w-0 break-all">{record.patient_phone || "Não informado"}</span>
              {whatsappNumber && (
                <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer" aria-label={`Abrir conversa de WhatsApp com ${record.patient_name}`} className="shrink-0 rounded p-1 text-primary hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <MessageCircle className="size-4" aria-hidden="true" />
                </a>
              )}
            </dd>
          </div>
          <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">Idade</dt>
            <dd className="mt-0.5 min-w-0 break-words font-medium">{record.patient_age !== null ? `${record.patient_age} anos` : "Não informada"}</dd>
          </div>
        </dl>

        <div className="space-y-3 border-t border-border pt-3">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Origem do contato</p>
            <OriginCategorySelect value={record.como_conheceu} categories={categories} fallbackValues={fallbackOrigins} ariaLabel={`Origem do contato de ${record.patient_name}`} disabled={fieldsDisabled} onSave={(value) => onUpdate("como_conheceu", value)} />
          </div>
          <div className="grid min-w-0 grid-cols-2 gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Receita</p>
              <YesNoSelectCell value={record.receita} onSave={(value) => onUpdate("receita", value)} placeholder="Receita" emptyLabel="Selecionar" ariaLabel={`Receita de ${record.patient_name}`} disabled={fieldsDisabled} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Venda</p>
              <YesNoSelectCell value={record.venda} onSave={(value) => onUpdate("venda", value)} placeholder="Venda" emptyLabel="Selecionar" ariaLabel={`Venda de ${record.patient_name}`} disabled={fieldsDisabled} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium text-muted-foreground">Visita à loja</p>
              <YesNoSelectCell value={record.visitou_loja} onSave={(value) => onUpdate("visitou_loja", value)} placeholder="Visitou" emptyLabel="Selecionar" ariaLabel={`Visita à loja de ${record.patient_name}`} disabled={fieldsDisabled} />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Observação</p>
            <ExpandableTextCell value={record.obs} onSave={(value) => onUpdate("obs", value)} placeholder="Motivo / observação" ariaLabel={`Observação de ${record.patient_name}`} disabled={fieldsDisabled} />
          </div>
        </div>

        <AttendanceRowActions record={record} addDisabled={addDisabled} deleteDisabled={deleteDisabled} onAddToLeads={onAddToLeads} onDelete={onDelete} />
      </CardContent>
    </Card>
  );
}

function matchesPatientSearch(record: Pick<CombinedRecord, "patient_name" | "patient_phone">, query: string) {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();
  const matchesName = record.patient_name.toLowerCase().includes(normalizedQuery);
  const phoneQuery = query.replace(/\D/g, "");
  const matchesPhone = phoneQuery.length > 0 && (record.patient_phone || "").replace(/\D/g, "").includes(phoneQuery);

  return matchesName || matchesPhone;
}

function isUninformed(value: string | null | undefined) {
  return !value?.trim();
}

function matchesSelectedValues(selected: string[], value: string | null | undefined) {
  if (selected.length === 0) return true;
  return selected.some((selectedValue) => selectedValue === UNINFORMED_FILTER_VALUE
    ? isUninformed(value)
    : selectedValue === (value ?? ""));
}

function addUninformedOption(values: string[], hasUninformed: boolean): MultiSelectFilterItem[] {
  return [
    ...values,
    ...(hasUninformed ? [{ value: UNINFORMED_FILTER_VALUE, label: "Não informado (vazio)" }] : []),
  ];
}

export function DetalhadoAmigoTable({ 
  attendances, 
  isLoading, 
  sourceError,
  dateRange,
  onDateRangeChange,
  onRefresh,
  dbRecords,
  isDbLoading,
  dbError,
  onUpdateDb,
  onCreateDb,
  onDeleteDb,
  onRefreshDb,
  onAddToLeads,
}: DetalhadoAmigoTableProps) {
  const {
    categories: originCategories,
    error: originCategoriesError,
    isLoading: isLoadingOriginCategories,
    refresh: refreshOriginCategories,
  } = useCategories("service_origin");
  const activeOriginCategories = useMemo(() => originCategories.filter((category) => category.is_active), [originCategories]);
  const [filters, setFilters] = useRouteState("atendimentosFilters", emptyFilters, parseFilters);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [calendarRange, setCalendarRange] = useState<DateRange | undefined>({
    from: dateRange.start,
    to: dateRange.end,
  });
  useEffect(() => {
    setCalendarRange({ from: dateRange.start, to: dateRange.end });
  }, [dateRange.end, dateRange.start]);

  // Carregar dados do banco quando a API retornar
  useEffect(() => {
    if (attendances.length > 0) {
      onRefreshDb();
    }
  }, [attendances.length, onRefreshDb]);

  // Normalizar nome para comparação (lowercase, sem espaços extras)
  const normalizeName = (name: string | null | undefined): string => {
    if (!name) return "";
    return name.toLowerCase().trim().replace(/\s+/g, " ");
  };

  // Combinar dados da API com dados do banco
  const combinedRecords = useMemo((): CombinedRecord[] => {
    return attendances.map(att => {
      // Procurar registro no banco pelo nome normalizado e data
      const dbRecord = dbRecords.find(db => 
        normalizeName(db.nome) === normalizeName(att.patient_name) && db.data === att.date
      );

      return {
        apiId: att.id,
        dbId: dbRecord?.id || null,
        date: att.date,
        time: att.time || "", // Horário do atendimento
        patient_name: att.patient_name,
        patient_age: att.patient_age,
        patient_phone: att.patient_phone,
        patient_know_by: att.patient_know_by,
        event_name: att.event_name || "",
        doctor_name: att.doctor_name || "",
        // Prioriza o valor do banco, mas usa o da API como fallback
        como_conheceu: dbRecord?.como_conheceu || att.patient_know_by || "",
        receita: dbRecord?.receita || "",
        visitou_loja: dbRecord?.visitou_loja || "",
        venda: dbRecord?.venda || "",
        obs: dbRecord?.obs || "",
      };
    });
  }, [attendances, dbRecords]);

  // Buscar valores únicos do banco para os filtros (além da API)
  const uniqueValuesFromDb = useMemo(() => {
    const comoConheceuDb = dbRecords.map(r => r.como_conheceu).filter(Boolean) as string[];
    const receitaDb = dbRecords.map(r => r.receita).filter(Boolean) as string[];
    return { comoConheceuDb, receitaDb };
  }, [dbRecords]);

  const uniqueValues = useMemo(() => {
    // Combinar valores da API + banco para os filtros
    const allComoConheceu = [
      ...combinedRecords.map(r => r.como_conheceu),
      ...uniqueValuesFromDb.comoConheceuDb
    ].filter((value) => Boolean(value?.trim()));
    
    const allReceita = [
      ...combinedRecords.map(r => r.receita),
      ...uniqueValuesFromDb.receitaDb
    ].filter((value) => Boolean(value?.trim()));

    const originValues = [...new Set([
      ...activeOriginCategories.map((category) => category.label),
      ...allComoConheceu.filter((value) => !activeOriginCategories.some((category) => categoryMatchesValue(category, value))),
    ])].sort();
    const revenueValues = [...new Set(allReceita)].sort();
    const typeValues = [...new Set(combinedRecords.map((record) => record.event_name).filter((value) => Boolean(value?.trim())))].sort();
    const saleValues = [...new Set(["Sim", "Não", ...combinedRecords.map((record) => record.venda).filter((value) => Boolean(value?.trim()))])];
    const visitValues = [...new Set(["Sim", "Não", ...combinedRecords.map((record) => record.visitou_loja).filter((value) => Boolean(value?.trim()))])];

    return {
      patient_name: [...new Set(combinedRecords.map(r => r.patient_name).filter(Boolean))] as string[],
      professional: [...new Set(combinedRecords.map((record) => record.doctor_name.trim() || "Sem profissional"))].sort(),
      como_conheceu: originValues,
      como_conheceu_filter: addUninformedOption(originValues, combinedRecords.some((record) => isUninformed(record.como_conheceu))),
      receita: revenueValues,
      receita_filter: addUninformedOption(revenueValues, combinedRecords.some((record) => isUninformed(record.receita))),
      venda_filter: addUninformedOption(saleValues, combinedRecords.some((record) => isUninformed(record.venda))),
      visitou_loja_filter: addUninformedOption(visitValues, combinedRecords.some((record) => isUninformed(record.visitou_loja))),
      tipo: typeValues,
      tipo_filter: addUninformedOption(typeValues, combinedRecords.some((record) => isUninformed(record.event_name))),
    };
  }, [activeOriginCategories, combinedRecords, uniqueValuesFromDb]);

  const filteredRecords = useMemo(() => {
    const filtered = combinedRecords.filter(record => {
      if (!matchesPatientSearch(record, filters.patient_name)) return false;
      if (filters.professional.length > 0 && !filters.professional.includes(record.doctor_name.trim() || "Sem profissional")) return false;
      // Filtro multi-select para Como Conheceu
      if (filters.como_conheceu.length > 0) {
        const value = record.como_conheceu || "";
        const matchesSelectedOrigin = filters.como_conheceu.some((selected) => {
          if (selected === UNINFORMED_FILTER_VALUE) return isUninformed(value);
          const category = activeOriginCategories.find((candidate) => normalizeCategoryValue(candidate.label) === normalizeCategoryValue(selected));
          return category ? categoryMatchesValue(category, value) : selected === value;
        });
        if (!matchesSelectedOrigin) return false;
      }
      // Filtro multi-select para Receita
      if (filters.receita.length > 0) {
        if (!matchesSelectedValues(filters.receita, record.receita)) return false;
      }
      // Filtro multi-select para Venda
      if (filters.venda.length > 0) {
        if (!matchesSelectedValues(filters.venda, record.venda)) return false;
      }
      // Filtro multi-select para Visitou a Loja
      if (filters.visitou_loja.length > 0) {
        if (!matchesSelectedValues(filters.visitou_loja, record.visitou_loja)) return false;
      }
      // Filtro multi-select para Tipo
      if (filters.tipo.length > 0) {
        if (!matchesSelectedValues(filters.tipo, record.event_name)) return false;
      }
      return true;
    });
    // Ordenar por data e hora decrescente (mais recentes primeiro)
    return filtered.sort((a, b) => {
      const dateA = a.date ? new Date(a.date.split('/').reverse().join('-')) : new Date(0);
      const dateB = b.date ? new Date(b.date.split('/').reverse().join('-')) : new Date(0);
      const dateDiff = dateB.getTime() - dateA.getTime();
      if (dateDiff !== 0) return dateDiff;
      // Se mesma data, ordenar por hora decrescente
      const timeA = a.time || "00:00";
      const timeB = b.time || "00:00";
      return timeB.localeCompare(timeA);
    });
  }, [activeOriginCategories, combinedRecords, filters]);

  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const visibleRecords = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [currentPage, filteredRecords, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [dateRange.end, dateRange.start, filters]);

  const hasActiveFilters = Object.entries(filters).some(([, value]) => 
    Array.isArray(value) ? value.length > 0 : value !== ""
  );

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
  };

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setCalendarRange(range);
    if (range?.from && range?.to) {
      onDateRangeChange(range.from, range.to);
    }
  };

  const handleAddToLeads = async (record: CombinedRecord) => {
    if (isLoading) return;
    await onAddToLeads({
      nome: record.patient_name || "",
      numero: record.patient_phone || "",
    });
  };

  const handleDbUpdate = async (record: CombinedRecord, field: string, value: string) => {
    if (isLoading || isDbLoading || dbError) return;
    if (record.dbId) {
      // Atualizar registro existente no banco
      onUpdateDb(record.dbId, field, value);
    } else {
      // Criar novo registro no banco com os dados da API
      const newId = await onCreateDb({
        nome: record.patient_name,
        telefone: record.patient_phone || "",
        data: record.date,
        como_conheceu: field === "como_conheceu" ? value : record.patient_know_by || "",
        receita: field === "receita" ? value : "",
        visitou_loja: field === "visitou_loja" ? value : "",
        obs: field === "obs" ? value : "",
      });
      if (newId) {
        // Recarregar dados do banco para atualizar a UI
        onRefreshDb();
      }
    }
  };

  const attendanceTable = useTable({
    features: attendanceTableFeatures,
    columns: attendanceColumns,
    data: visibleRecords,
    getRowId: (record) => record.apiId,
    meta: {
      renderName: (record) => (
        <div className="text-sm">
          <div>{record.patient_name}</div>
          {record.time && <div className="text-xs text-muted-foreground">{record.time}</div>}
        </div>
      ),
      renderPhone: (record) => {
        const whatsappNumber = formatPhoneForWhatsApp(record.patient_phone);
        return (
          <div className="flex items-center gap-1">
            <span className="text-sm">{record.patient_phone || "-"}</span>
            {whatsappNumber && (
              <a
                href={`https://wa.me/${whatsappNumber}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir conversa de WhatsApp com ${record.patient_name}`}
                className="rounded-md p-1 text-accent transition-colors hover:bg-accent/20"
                title="Abrir WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      },
      renderOrigin: (record) => (
        <OriginCategorySelect
          value={record.como_conheceu}
          categories={originCategories}
          fallbackValues={uniqueValues.como_conheceu}
          ariaLabel={`Origem do contato de ${record.patient_name}`}
          disabled={isLoading || isDbLoading || Boolean(dbError)}
          onSave={(value) => handleDbUpdate(record, "como_conheceu", value)}
        />
      ),
      renderRevenue: (record) => (
        <YesNoSelectCell
          value={record.receita}
          onSave={(value) => handleDbUpdate(record, "receita", value)}
          placeholder="Receita"
          ariaLabel={`Receita de ${record.patient_name}`}
          disabled={isLoading || isDbLoading || Boolean(dbError)}
        />
      ),
      renderSale: (record) => (
        <YesNoSelectCell
          value={record.venda}
          onSave={(value) => handleDbUpdate(record, "venda", value)}
          placeholder="Venda"
          ariaLabel={`Venda de ${record.patient_name}`}
          disabled={isLoading || isDbLoading || Boolean(dbError)}
        />
      ),
      renderStoreVisit: (record) => (
        <YesNoSelectCell
          value={record.visitou_loja}
          onSave={(value) => handleDbUpdate(record, "visitou_loja", value)}
          placeholder="Visitou"
          ariaLabel={`Visita à loja de ${record.patient_name}`}
          disabled={isLoading || isDbLoading || Boolean(dbError)}
        />
      ),
      renderObservation: (record) => (
        <ExpandableTextCell
          value={record.obs}
          onSave={(value) => handleDbUpdate(record, "obs", value)}
          placeholder="Motivo / observação"
          ariaLabel={`Observação de ${record.patient_name}`}
          disabled={isLoading || isDbLoading || Boolean(dbError)}
        />
      ),
      renderActions: (record) => (
        <AttendanceRowActions
          record={record}
          addDisabled={isLoading}
          deleteDisabled={isLoading || isDbLoading || Boolean(dbError)}
          onAddToLeads={() => void handleAddToLeads(record)}
          onDelete={() => { if (record.dbId) onDeleteDb(record.dbId); }}
        />
      ),
    },
  });

  // Registros filtrados SEM o filtro de como_conheceu (para calcular total do período)
  const recordsWithoutComoConheceuFilter = useMemo(() => {
    return combinedRecords.filter(record => {
      if (!matchesPatientSearch(record, filters.patient_name)) return false;
      if (filters.professional.length > 0 && !filters.professional.includes(record.doctor_name.trim() || "Sem profissional")) return false;
      if (filters.receita.length > 0) {
        if (!matchesSelectedValues(filters.receita, record.receita)) return false;
      }
      return true;
    });
  }, [combinedRecords, filters.patient_name, filters.professional, filters.receita]);

  // Métricas calculadas baseadas nos filtros ativos
  const metrics = useMemo(() => {
    // Consultas = Total de leads do período (sem filtro como_conheceu)
    const consultas = recordsWithoutComoConheceuFilter.length;
    
    // Receitas Totais = Todos com receita = sim (do período, sem filtro como_conheceu)
    const receitasTotais = recordsWithoutComoConheceuFilter.filter(r => 
      r.receita?.toLowerCase() === "sim"
    ).length;
    
    // Receitas com potencial de venda = Receitas sim COM filtro de como_conheceu aplicado
    const receitasPotencial = filteredRecords.filter(r => 
      r.receita?.toLowerCase() === "sim"
    ).length;
    
    // Vendas = registros com venda preenchida (sim)
    const vendasRecords = filteredRecords.filter(r => 
      r.venda?.toLowerCase() === "sim"
    );
    const vendas = vendasRecords.length;

    // Média de idade dos clientes que compraram
    const vendasComIdade = vendasRecords.filter((r) => r.patient_age !== null);
    const mediaIdadeCompradores = vendasComIdade.length > 0
      ? (vendasComIdade.reduce((acc, record) => acc + (record.patient_age || 0), 0) / vendasComIdade.length).toFixed(1)
      : "-";
    
    // Visitou a Loja = registros com visitou_loja = sim (com filtro como_conheceu)
    const visitouLoja = filteredRecords.filter(r => 
      r.visitou_loja?.toLowerCase() === "sim"
    ).length;
    
    // Taxa de Presença = Visitou a Loja / Receitas com potencial
    const taxaPresenca = receitasPotencial > 0 
      ? ((visitouLoja / receitasPotencial) * 100).toFixed(0) 
      : "0";
    
    // Conversão = Vendas / Visitou a Loja
    const conversao = visitouLoja > 0 
      ? ((vendas / visitouLoja) * 100).toFixed(0) 
      : "0";
    
    // Receitas x Consultas = Receitas c/ Potencial / Consultas
    const receitasXConsultas = consultas > 0 
      ? ((receitasPotencial / consultas) * 100).toFixed(0) 
      : "0";
    
    return {
      consultas,
      receitasTotais,
      receitasPotencial,
      visitouLoja,
      taxaPresenca,
      vendas,
      mediaIdadeCompradores,
      conversao,
      receitasXConsultas
    };
  }, [recordsWithoutComoConheceuFilter, filteredRecords]);

  return (
    <div className="space-y-4">
      {/* Date Range Selector */}
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm animate-fade-in">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">Período:</span>
          </div>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" className="h-10 text-sm" aria-label={`Selecionar período de atendimentos, de ${format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} até ${format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}`}>
                {format(dateRange.start, "dd/MM/yyyy", { locale: ptBR })} - {format(dateRange.end, "dd/MM/yyyy", { locale: ptBR })}
              </Button>} />
            <PopoverContent className="w-auto p-0 bg-popover border-border" align="start">
              <CalendarComponent
                mode="range"
                selected={calendarRange}
                onSelect={handleDateRangeSelect}
                numberOfMonths={2}
                locale={ptBR}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="h-10"
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            {isLoading ? "Atualizando…" : "Atualizar"}
          </Button>
          <div className="ml-auto text-sm text-muted-foreground">
            Unidade: <span className="font-medium text-foreground">Sua Visão - Padre Pedro Pinto</span>
          </div>
        </div>
      </div>

      <FilterPanel
        hasActiveFilters={hasActiveFilters}
        onClear={clearFilters}
        resultSummary={`${filteredRecords.length} de ${attendances.length} atendimentos`}
      >
        <FilterGrid columns={7}>
          <FilterField id="attendance-name-filter" label="Buscar cliente">
            <SearchInput
              id="attendance-name-filter"
              value={filters.patient_name}
              onChange={(e) => setFilters(f => ({ ...f, patient_name: e.target.value }))}
              placeholder="Nome ou telefone"
              className="h-10 bg-background text-sm"
            />
          </FilterField>
          <FilterField id="attendance-type-filter" label="Tipo de atendimento">
            <MultiSelectFilter
              id="attendance-type-filter"
              ariaLabel="Filtrar por tipo de atendimento"
              options={uniqueValues.tipo_filter}
              selectedValues={filters.tipo}
              onSelectionChange={(values) => setFilters(f => ({ ...f, tipo: values }))}
              placeholder="Todos"
              emptyText="Nenhum tipo"
            />
          </FilterField>
          <FilterField id="attendance-professional-filter" label="Profissional">
            <MultiSelectFilter
              id="attendance-professional-filter"
              ariaLabel="Filtrar por profissional"
              options={uniqueValues.professional}
              selectedValues={filters.professional}
              onSelectionChange={(values) => setFilters((current) => ({ ...current, professional: values }))}
              placeholder="Todos"
              emptyText="Nenhum profissional"
            />
          </FilterField>
          <FilterField id="attendance-origin-filter" label="Origem do contato">
            <MultiSelectFilter
              id="attendance-origin-filter"
              ariaLabel="Filtrar por origem do contato"
              options={uniqueValues.como_conheceu_filter}
              selectedValues={filters.como_conheceu}
              onSelectionChange={(values) => setFilters(f => ({ ...f, como_conheceu: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor preenchido"
            />
          </FilterField>
          <FilterField id="attendance-revenue-filter" label="Receita">
            <MultiSelectFilter
              id="attendance-revenue-filter"
              ariaLabel="Filtrar por receita"
              options={uniqueValues.receita_filter}
              selectedValues={filters.receita}
              onSelectionChange={(values) => setFilters(f => ({ ...f, receita: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor preenchido"
            />
          </FilterField>
          <FilterField id="attendance-sale-filter" label="Venda">
            <MultiSelectFilter
              id="attendance-sale-filter"
              ariaLabel="Filtrar por venda"
              options={uniqueValues.venda_filter}
              selectedValues={filters.venda}
              onSelectionChange={(values) => setFilters(f => ({ ...f, venda: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor"
            />
          </FilterField>
          <FilterField id="attendance-visit-filter" label="Visita à loja">
            <MultiSelectFilter
              id="attendance-visit-filter"
              ariaLabel="Filtrar por visita à loja"
              options={uniqueValues.visitou_loja_filter}
              selectedValues={filters.visitou_loja}
              onSelectionChange={(values) => setFilters(f => ({ ...f, visitou_loja: values }))}
              placeholder="Todos"
              emptyText="Nenhum valor"
            />
          </FilterField>
        </FilterGrid>
      </FilterPanel>

      {!sourceError && filteredRecords.length > 0 && (
        <DataTablePagination
          total={filteredRecords.length}
          page={currentPage}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize);
            setPage(1);
          }}
          label="atendimentos"
        />
      )}

      <div role="note" className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">Base dos indicadores:</span> Consultas e Receitas Totais consideram cliente, profissional e receita, mas não mudam com origem, tipo, venda e visita. Receitas potenciais, visitas e vendas seguem todos os filtros da lista; “Receitas × Consultas” compara essas bases.
      </div>
      {/* Métricas / Kanbans */}
      <div role="group" aria-label="Métricas dos atendimentos" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5 animate-fade-in">
        {/* Consultas (Total de Leads) */}
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Consultas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.consultas}</p>
          </CardContent>
        </Card>

        {/* Receitas Totais */}
        <Card className="bg-gradient-to-br from-success/10 to-success/5 border-success/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-4 h-4 text-success-foreground" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Receitas Totais</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitasTotais}</p>
          </CardContent>
        </Card>

        {/* Receitas com potencial; a origem é filtrada no painel único de filtros. */}
        <Card className="bg-gradient-to-br from-chart-1/10 to-chart-1/5 border-chart-1/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Tag className="w-4 h-4 text-chart-1" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Receitas c/ Potencial</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitasPotencial}</p>
            <p className="mt-1 text-xs text-muted-foreground">Receitas com os filtros atuais</p>
          </CardContent>
        </Card>

        {/* Visitou a Loja */}
        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Store className="w-4 h-4 text-chart-2" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Visitou a Loja</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.visitouLoja}</p>
          </CardContent>
        </Card>

        {/* Taxa de Presença */}
        <Card className="bg-gradient-to-br from-chart-3/10 to-chart-3/5 border-chart-3/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <UserCheck className="w-4 h-4 text-chart-3" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Taxa de Presença</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.taxaPresenca}%</p>
            <p className="text-xs text-muted-foreground mt-1">Visitou ÷ Potencial</p>
          </CardContent>
        </Card>

        {/* Vendas */}
        <Card className="bg-gradient-to-br from-chart-4/10 to-chart-4/5 border-chart-4/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <ShoppingCart className="w-4 h-4 text-chart-4" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Vendas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.vendas}</p>
          </CardContent>
        </Card>

        {/* Média de Idade */}
        <Card className="bg-gradient-to-br from-chart-5/10 to-chart-5/5 border-chart-5/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-4 h-4 text-chart-5" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Média de Idade</span>
            </div>
            <p className="text-2xl font-bold text-foreground">
              {metrics.mediaIdadeCompradores === "-" ? "-" : `${metrics.mediaIdadeCompradores} anos`}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Clientes com venda = sim</p>
          </CardContent>
        </Card>

        {/* Conversão */}
        <Card className="bg-gradient-to-br from-chart-1/10 to-chart-1/5 border-chart-1/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-chart-1" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Conversão</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.conversao}%</p>
            <p className="text-xs text-muted-foreground mt-1">Vendas ÷ Visitou Loja</p>
          </CardContent>
        </Card>

        {/* Receitas x Consultas */}
        <Card className="bg-gradient-to-br from-chart-2/10 to-chart-2/5 border-chart-2/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Percent className="w-4 h-4 text-chart-2" />
              <span className="text-xs font-medium text-muted-foreground md:text-sm">Receitas x Consultas</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{metrics.receitasXConsultas}%</p>
            <p className="text-xs text-muted-foreground mt-1">Potencial ÷ Consultas</p>
          </CardContent>
        </Card>
      </div>

      {originCategoriesError && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          <p role="status" className="min-w-0 flex-1 text-sm text-muted-foreground">
            Não foi possível carregar as categorias de origem. O filtro continua usando os valores registrados, sem agrupá-los em categorias.
          </p>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={() => void refreshOriginCategories()} disabled={isLoadingOriginCategories}>
              <RefreshCw className={`mr-1 size-3.5 ${isLoadingOriginCategories ? "animate-spin" : ""}`} aria-hidden="true" />
              {isLoadingOriginCategories ? "Atualizando…" : "Tentar novamente"}
            </Button>
            <Link className="text-sm font-medium text-primary underline" to="/cadastros/categorias">Abrir Categorias</Link>
          </div>
        </div>
      )}

      {dbError ? (
        <DataState
          variant="error"
          title={dbRecords.length > 0 ? "Complementos desatualizados" : "Complementos indisponíveis"}
          description={`${dbError} Os campos de origem, receita, venda, visita e observação ficam bloqueados até a lista ser carregada.`}
          action={{ label: "Tentar novamente", onClick: () => void onRefreshDb() }}
        />
      ) : isDbLoading ? (
        <DataState variant="loading" title="Carregando complementos" description="Aguarde a consulta dos dados registrados antes de editar os atendimentos." />
      ) : null}

      {/* Table */}
      {isLoading && attendances.length > 0 && (
        <DataState variant="refreshing" title="Atualizando atendimentos" description="Os dados carregados permanecem visíveis." />
      )}
      <div className="space-y-3 md:hidden">
        {isLoading && attendances.length === 0 ? (
          <DataState variant="loading" title="Carregando atendimentos" description="Consultando o período selecionado no Amigo." />
        ) : sourceError ? (
          <DataState variant="error" title="Período indisponível" description={sourceError} action={{ label: "Tentar novamente", onClick: onRefresh }} />
        ) : filteredRecords.length === 0 ? (
          <DataState
            variant="empty"
            title="Nenhum atendimento encontrado"
            description={hasActiveFilters ? "Ajuste os filtros selecionados." : "Ajuste o período ou verifique se há atendimentos concluídos na unidade."}
            action={hasActiveFilters ? { label: "Limpar filtros", onClick: clearFilters } : undefined}
          />
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-3" aria-label="Atendimentos do período" aria-busy={isLoading}>
            {visibleRecords.map((record) => (
              <li key={record.apiId} className="min-w-0">
                <AttendanceMobileCard
                  record={record}
                  categories={originCategories}
                  fallbackOrigins={uniqueValues.como_conheceu}
                  fieldsDisabled={isLoading || isDbLoading || Boolean(dbError)}
                  addDisabled={isLoading}
                  deleteDisabled={isLoading || isDbLoading || Boolean(dbError)}
                  onUpdate={(field, value) => void handleDbUpdate(record, field, value)}
                  onAddToLeads={() => handleAddToLeads(record)}
                  onDelete={() => { if (record.dbId) onDeleteDb(record.dbId); }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      {isLoading && attendances.length === 0 ? (
        <div className="hidden rounded-xl border border-border bg-card shadow-md md:block">
          <DataState
            variant="loading"
            title="Carregando atendimentos"
            description="Consultando o período selecionado no Amigo."
            className="min-h-48 rounded-none border-0 bg-transparent"
          />
        </div>
      ) : sourceError ? (
        <div className="hidden rounded-xl border border-border bg-card shadow-md md:block">
          <DataState
            variant="error"
            title="Período indisponível"
            description={sourceError}
            action={{ label: "Tentar novamente", onClick: onRefresh }}
            className="min-h-48 rounded-none border-0 bg-transparent"
          />
        </div>
      ) : filteredRecords.length === 0 ? (
        <div className="hidden rounded-xl border border-border bg-card shadow-md md:block">
          <DataState
            variant="empty"
            title="Nenhum atendimento encontrado"
            description={hasActiveFilters ? "Ajuste os filtros selecionados." : "Ajuste o período ou verifique se há atendimentos concluídos na unidade."}
            action={hasActiveFilters ? { label: "Limpar filtros", onClick: clearFilters } : undefined}
            className="min-h-48 rounded-none border-0 bg-transparent px-6 py-12"
          />
        </div>
      ) : (
        <EntityDataTable
          table={attendanceTable}
          label="Atendimentos e complementos comerciais"
          busy={isLoading}
          className="hidden rounded-xl border border-border bg-card shadow-md animate-fade-in md:block"
          tableClassName="min-w-[1120px]"
          headerRowClassName="bg-table-header border-table-border hover:bg-table-header"
          rowClassName="table-cell-hover animate-slide-in"
          getRowStyle={(_, index) => ({ animationDelay: `${index * 15}ms` })}
          getHeaderClassName={(columnId) => ({
            patient_name: "w-[200px] text-xs font-semibold uppercase tracking-wider",
            patient_age: "w-[80px] text-xs font-semibold uppercase tracking-wider",
            patient_phone: "w-[140px] text-xs font-semibold uppercase tracking-wider",
            event_name: "w-[120px] text-xs font-semibold uppercase tracking-wider",
            origem: "w-[160px] text-xs font-semibold uppercase tracking-wider",
            receita: "w-[80px] text-xs font-semibold uppercase tracking-wider",
            venda: "w-[80px] text-xs font-semibold uppercase tracking-wider",
            date: "w-[100px] text-xs font-semibold uppercase tracking-wider",
            visita: "w-[120px] text-xs font-semibold uppercase tracking-wider",
            observacao: "min-w-[200px] text-xs font-semibold uppercase tracking-wider",
            acoes: "w-[72px] text-center text-xs font-semibold uppercase tracking-wider",
          })[columnId]}
          getCellClassName={(columnId) => ({
            patient_name: "px-3 py-2 text-sm",
            patient_age: "px-3 py-2 text-sm",
            patient_phone: "px-3 py-2",
            event_name: "px-3 py-2 text-sm",
            origem: "px-1 py-1",
            receita: "px-1 py-1",
            venda: "px-1 py-1",
            date: "px-3 py-2 text-sm",
            visita: "px-1 py-1",
            observacao: "px-1 py-1",
            acoes: "px-1 py-1 text-center",
          })[columnId]}
        />
      )}
    </div>
  );
}

function OriginCategorySelect({ value, categories, fallbackValues, onSave, ariaLabel, disabled = false }: {
  value: string;
  categories: CategoryCatalogItem[];
  fallbackValues: string[];
  onSave: (value: string) => void;
  ariaLabel: string;
  disabled?: boolean;
}) {
  return (
    <CategorySelect
      value={value}
      categories={categories}
      fallbackValues={fallbackValues}
      onValueChange={onSave}
      placeholder="Selecionar origem"
      ariaLabel={ariaLabel}
      clearable
      emptyLabel="Não informado"
      disabled={disabled}
      className="min-w-[150px]"
    />
  );
}
