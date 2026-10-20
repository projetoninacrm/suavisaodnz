import { useMemo, useState } from "react";
import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { TrendingUp, TrendingDown, Target, DollarSign, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DebouncedNumberInput } from "./DebouncedNumberInput";

import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { DataState } from "@/components/data/DataState";
import { EntityDataTable } from "@/components/data/EntityDataTable";
import { calculateWeightedDailyTarget } from "@/lib/reportCalculations";

const MONTH_NAMES_MAP: Record<string, number> = {
  jan: 0, fev: 1, mar: 2, abr: 3, mai: 4, jun: 5,
  jul: 6, ago: 7, set: 8, out: 9, nov: 10, dez: 11,
};

function parseDateForSort(dateStr: string): number {
  if (!dateStr) return 0;
  // ISO format: YYYY-MM-DD
  if (dateStr.includes("-")) {
    return new Date(dateStr).getTime();
  }
  // DD/mon or DD/MM/YYYY
  const parts = dateStr.split("/");
  const day = parseInt(parts[0], 10);
  const monthPart = parts[1]?.toLowerCase().trim();
  const monthNum = MONTH_NAMES_MAP[monthPart] ?? (parseInt(monthPart, 10) - 1);
  const year = parts[2] ? parseInt(parts[2], 10) : new Date().getFullYear();
  if (isNaN(day) || isNaN(monthNum)) return 0;
  return new Date(year, monthNum, day).getTime();
}

interface AcompanhamentoDiarioSectionProps {
  schedules: Schedule[];
  registros: AcompanhamentoDiario[];
  onUpdateRegistro: (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null) => Promise<boolean>;
  metaDiariaVendasCompleta: number; // Meta para dias com 2 períodos
  metaDiariaVendasMeio: number; // Meta para dias com 1 período
  metaFaturamentoDiarioCompleto: number; // Meta faturamento para dias com 2 períodos
  metaFaturamentoDiarioMeio: number; // Meta faturamento para dias com 1 período
  metaMensalFaturamento: number; // Meta mensal total
  pesoTotalDias: number; // Peso total dos dias (completos + meios*0.5)
  pesoPorDia?: Record<string, number>; // Peso ajustado por quinzena (60/40)
}

type DailyTrackingTableMeta = {
  onUpdateRegistro: AcompanhamentoDiarioSectionProps["onUpdateRegistro"];
};

const dailyTrackingTableFeatures = tableFeatures({ tableMeta: {} as DailyTrackingTableMeta });

function renderDeviation(difference: number, hasData: boolean, label: string) {
  if (!hasData) return <span className="text-xs text-muted-foreground">-</span>;
  const isOnTrack = difference >= 0;
  const Icon = isOnTrack ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
      isOnTrack ? "bg-success/10 text-success-foreground" : "bg-destructive/10 text-destructive"
    }`}>
      <Icon aria-hidden="true" className="size-3" />
      {label}
    </span>
  );
}

export function AcompanhamentoDiarioSection({
  schedules,
  registros,
  onUpdateRegistro,
  metaDiariaVendasCompleta,
  metaDiariaVendasMeio,
  metaFaturamentoDiarioCompleto,
  metaFaturamentoDiarioMeio,
  metaMensalFaturamento,
  pesoTotalDias,
  pesoPorDia,
}: AcompanhamentoDiarioSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  // Mostra todos os dias recebidos (já filtrados para excluir domingos em MetasCalculator).
  // Dias sem médico aparecem com peso 0 — não entram nos cálculos, mas permitem registrar
  // vendas externas manualmente.
  const diasComMedico = useMemo(() => {
    return schedules.map(s => {
      const temManha = s.morning_shift && s.morning_shift.trim() !== "";
      const temTarde = s.afternoon_shift && s.afternoon_shift.trim() !== "";
      const isDiaCompleto = temManha && temTarde;
      const semMedico = !temManha && !temTarde;
      return { ...s, isDiaCompleto, semMedico };
    }).sort((a, b) => {
      return parseDateForSort(a.date) - parseDateForSort(b.date);
    });
  }, [schedules]);

  // Map de dados de acompanhamento por data
  const registrosMap = useMemo(() => {
    const map: Record<string, AcompanhamentoDiario> = {};
    registros.forEach(r => {
      map[r.data] = r;
    });
    return map;
  }, [registros]);

  // Meta por dia em cálculo sequencial:
  // - A meta exibida para um dia é calculada antes de considerar o realizado dele.
  // - Assim, quando você começa a preencher um valor, a meta daquele mesmo dia
  //   não cai para a base da quinzena (ex.: R$ 2.240); ela permanece no alvo
  //   redistribuído que já estava aparecendo.
  // - O realizado digitado passa a reajustar apenas os próximos dias em aberto,
  //   mantendo a meta mensal alcançável.
  const { metasFaturamentoPorDia, metasVendasPorDia } = useMemo(() => {
    const metasFat: Record<string, number> = {};
    const metasVen: Record<string, number> = {};

    const pesoDeDia = (s: typeof diasComMedico[number]) => {
      const base = s.semMedico ? 0 : (s.isDiaCompleto ? 1 : 0.5);
      return pesoPorDia?.[s.date] ?? base;
    };

    const metaMensalVendas = metaDiariaVendasCompleta * (pesoTotalDias || 0);
    const pesoTotal = diasComMedico.reduce((total, s) => total + pesoDeDia(s), 0);

    let realFatAcumuladoAnterior = 0;
    let realVenAcumuladoAnterior = 0;
    let pesoAberto = pesoTotal;

    const temRegistroPreenchido = (registro?: AcompanhamentoDiario) =>
      !!registro && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null);

    diasComMedico.forEach((s) => {
      const registro = registrosMap[s.date];
      const pesoDia = pesoDeDia(s);
      const restanteFat = Math.max(0, metaMensalFaturamento - realFatAcumuladoAnterior);
      const restanteVen = Math.max(0, metaMensalVendas - realVenAcumuladoAnterior);

      // Meta diária fixa (uniforme): não muda conforme o realizado é preenchido
      void restanteFat; void restanteVen;
      metasFat[s.date] = calculateWeightedDailyTarget(metaMensalFaturamento, pesoDia, pesoTotal);
      metasVen[s.date] = calculateWeightedDailyTarget(metaMensalVendas, pesoDia, pesoTotal);

      if (temRegistroPreenchido(registro)) {
        realFatAcumuladoAnterior += registro.faturamento_realizado || 0;
        realVenAcumuladoAnterior += registro.vendas_realizadas || 0;
        pesoAberto = Math.max(0, pesoAberto - pesoDia);
      }
    });

    return { metasFaturamentoPorDia: metasFat, metasVendasPorDia: metasVen };
  }, [diasComMedico, registrosMap, metaDiariaVendasCompleta, metaMensalFaturamento, pesoTotalDias, pesoPorDia]);

  // Cálculo do consolidado baseado nos dias preenchidos
  const consolidado = useMemo(() => {
    let pesoPreenchido = 0;
    let metaAcumuladaVendas = 0;
    let realAcumuladoVendas = 0;
    let realAcumuladoFaturamento = 0;
    let metaAcumuladaFaturamento = 0;

    diasComMedico.forEach((schedule) => {
      const registro = registrosMap[schedule.date];
      const pesoBase = schedule.semMedico ? 0 : (schedule.isDiaCompleto ? 1 : 0.5);
      const pesoDia = pesoPorDia?.[schedule.date] ?? pesoBase;
      // Consolidado usa a meta BASE proporcional (peso × meta diária base),
      // não a meta dinâmica redistribuída. Assim o card mostra exatamente
      // "quanto deveríamos ter faturado até este dia dentro dos 70k mensais"
      // e o "atrás da meta" reflete o desvio real frente ao plano.
      const metaVendasDiaBase = metasVendasPorDia[schedule.date] ?? 0;
      const metaFatDiaBase = metasFaturamentoPorDia[schedule.date] ?? 0;

      // Conta como preenchido se existe registro (mesmo com valores 0)
      if (registro && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null)) {
        pesoPreenchido += pesoDia;
        metaAcumuladaVendas += metaVendasDiaBase;
        realAcumuladoVendas += registro.vendas_realizadas || 0;
        realAcumuladoFaturamento += registro.faturamento_realizado || 0;
        metaAcumuladaFaturamento += metaFatDiaBase;
      }
    });

    const diferencaVendas = realAcumuladoVendas - metaAcumuladaVendas;
    const diferencaFaturamento = realAcumuladoFaturamento - metaAcumuladaFaturamento;

    const metaTicketMedio = metaAcumuladaVendas > 0 ? metaAcumuladaFaturamento / metaAcumuladaVendas : 0;
    const realTicketMedio = realAcumuladoVendas > 0 ? realAcumuladoFaturamento / realAcumuladoVendas : 0;

    return {
      pesoPreenchido,
      metaAcumuladaVendas,
      metaAcumuladaFaturamento,
      realAcumuladoVendas,
      realAcumuladoFaturamento,
      diferencaVendas,
      diferencaFaturamento,
      metaTicketMedio,
      realTicketMedio,
    };
  }, [diasComMedico, registrosMap, pesoPorDia, metasFaturamentoPorDia, metasVendasPorDia]);

  const trackingRows = useMemo(() => {
    let acumuladoFaturamento = 0;
    let metaAcumuladaConsol = 0;

    return diasComMedico.map((schedule) => {
      const registro = registrosMap[schedule.date];
      const vendasReal = registro?.vendas_realizadas || 0;
      const faturamentoReal = registro?.faturamento_realizado || 0;
      const pesoBase = schedule.semMedico ? 0 : (schedule.isDiaCompleto ? 1 : 0.5);
      const pesoDia = pesoPorDia?.[schedule.date] ?? pesoBase;
      const metaVendasDia = metasVendasPorDia[schedule.date] ?? (metaDiariaVendasCompleta * pesoDia);
      const metaFatDiaBase = metaFaturamentoDiarioCompleto * pesoDia;
      const metaFatDia = metasFaturamentoPorDia[schedule.date] ?? metaFatDiaBase;
      const diferencaVendas = vendasReal - metaVendasDia;
      const diferencaFaturamento = faturamentoReal - metaFatDia;
      const temDados = registro !== undefined && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null);

      if (temDados) {
        acumuladoFaturamento += faturamentoReal;
        // Mantém o desvio acumulado alinhado ao consolidado da meta mensal.
        metaAcumuladaConsol += metaFatDia;
      }

      return {
        schedule,
        registro,
        metaVendasDia,
        metaFatDia,
        diferencaVendas,
        diferencaFaturamento,
        diferencaConsolidada: acumuladoFaturamento - metaAcumuladaConsol,
        temDados,
      };
    });
  }, [diasComMedico, registrosMap, pesoPorDia, metasVendasPorDia, metasFaturamentoPorDia, metaDiariaVendasCompleta, metaFaturamentoDiarioCompleto]);

  const trackingColumn = useMemo(
    () => createColumnHelper<typeof dailyTrackingTableFeatures, typeof trackingRows[number]>(),
    [],
  );
  const trackingColumns = useMemo(() => trackingColumn.columns([
    trackingColumn.accessor(({ schedule }) => schedule.date, {
      id: "data",
      header: "Data",
    }),
    trackingColumn.accessor("metaVendasDia", {
      header: "Meta de vendas",
      cell: ({ row, getValue }) => (
        <span className="font-medium text-primary">
          {getValue().toFixed(2)}
          <span className="ml-1 text-xs text-muted-foreground">
            ({row.original.schedule.semMedico ? "s/ médico" : row.original.schedule.isDiaCompleto ? "2P" : "1P"})
          </span>
        </span>
      ),
    }),
    trackingColumn.display({
      id: "vendas_realizadas",
      header: "Vendas realizadas",
      cell: ({ row, table }) => (
        <DebouncedNumberInput
          value={row.original.registro?.vendas_realizadas}
          onCommit={(value) => table.options.meta.onUpdateRegistro(row.original.schedule.date, "vendas_realizadas", value)}
          className="mx-auto h-8 w-20 text-center"
          placeholder="-"
          ariaLabel={`Vendas realizadas em ${row.original.schedule.date}`}
        />
      ),
    }),
    trackingColumn.accessor("diferencaVendas", {
      header: "Desvio de vendas",
      cell: ({ row, getValue }) => renderDeviation(getValue(), row.original.temDados, `${getValue() >= 0 ? "+" : ""}${getValue().toFixed(1)}`),
    }),
    trackingColumn.accessor("metaFatDia", {
      header: "Meta de faturamento",
      cell: ({ getValue }) => <span className="font-medium text-success-foreground">R$ {getValue().toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</span>,
    }),
    trackingColumn.display({
      id: "faturamento_realizado",
      header: "Faturamento realizado",
      cell: ({ row, table }) => (
        <DebouncedNumberInput
          value={row.original.registro?.faturamento_realizado}
          onCommit={(value) => table.options.meta.onUpdateRegistro(row.original.schedule.date, "faturamento_realizado", value)}
          className="mx-auto h-8 w-24 text-center"
          placeholder="-"
          ariaLabel={`Faturamento realizado em ${row.original.schedule.date}`}
        />
      ),
    }),
    trackingColumn.accessor("diferencaFaturamento", {
      header: "Desvio diário",
      cell: ({ row, getValue }) => renderDeviation(getValue(), row.original.temDados, `${getValue() >= 0 ? "+" : ""}${getValue().toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`),
    }),
    trackingColumn.accessor("diferencaConsolidada", {
      header: "Desvio acumulado",
      cell: ({ row, getValue }) => renderDeviation(getValue(), row.original.temDados, `${getValue() >= 0 ? "+R$ " : "R$ -"}${Math.abs(getValue()).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`),
    }),
  ]), [trackingColumn]);
  const trackingTable = useTable({
    features: dailyTrackingTableFeatures,
    columns: trackingColumns,
    data: trackingRows,
    getRowId: (row) => row.schedule.id,
    meta: { onUpdateRegistro },
  });

  const StatusBadge = ({ diferenca, tipo }: { diferenca: number; tipo: "vendas" | "faturamento" }) => {
    const isPositivo = diferenca >= 0;
    const Icon = diferenca > 0 ? TrendingUp : diferenca < 0 ? TrendingDown : Minus;
    const formattedDifference = tipo === "vendas"
      ? `${diferenca > 0 ? "+" : ""}${diferenca.toFixed(2)}`
      : diferenca.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return (
      <div role="group" aria-label={`Desvio de ${tipo}`} className={`mt-3 flex items-center gap-2 rounded-lg px-3 py-2 text-foreground ${
        isPositivo
          ? "bg-success/10 border border-success/20"
          : "bg-destructive/10 border border-destructive/20"
      }`}>
        <Icon aria-hidden="true" className={`h-5 w-5 ${isPositivo ? "text-success-foreground" : "text-destructive"}`} />
        <div>
          <p className="text-xs font-medium">
            Diferença para a meta
          </p>
          <p className="text-lg font-bold tabular-nums">{formattedDifference}</p>
          <p className="text-xs">
            {diferenca > 0 ? "à frente da meta" : diferenca < 0 ? "atrás da meta" : "na meta"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger
            render={
              <Button variant="ghost" className="h-auto w-full min-w-0 justify-between gap-2 whitespace-normal p-0 hover:bg-transparent">
                <span className="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left text-lg font-semibold leading-tight tracking-tight">
                  <Target className="h-5 w-5 shrink-0 text-primary" />
                  Acompanhamento Diário de Metas
                </span>
                {isOpen ? <ChevronUp aria-hidden="true" className="h-5 w-5 shrink-0" /> : <ChevronDown aria-hidden="true" className="h-5 w-5 shrink-0" />}
              </Button>
            }
          />
        </CardHeader>

        <CollapsibleContent>
          <CardContent>
            {/* Kanban de Consolidado */}
            <div className="mb-6">
              <div className="mb-3 flex flex-wrap items-end justify-between gap-1">
                <h4 className="text-sm font-semibold text-foreground">Consolidado</h4>
                <p className="text-xs text-muted-foreground">
                  Peso preenchido: {consolidado.pesoPreenchido.toFixed(1)} de {pesoTotalDias.toFixed(1)}
                </p>
              </div>
              <p className="mb-4 text-xs text-muted-foreground">
                Metas proporcionais à escala; realizado informado no acompanhamento diário.
              </p>

              <div className="grid gap-4 md:grid-cols-2">
                <section aria-labelledby="tracking-sales-summary" className="rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <h5 id="tracking-sales-summary" className="flex items-center gap-2 text-sm font-semibold">
                    <Target aria-hidden="true" className="size-4 text-primary" /> Vendas
                  </h5>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Meta acumulada</dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums text-primary">{consolidado.metaAcumuladaVendas.toFixed(2)}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Vendas realizadas</dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums">{consolidado.realAcumuladoVendas.toFixed(2)}</dd>
                    </div>
                  </dl>
                  <StatusBadge diferenca={consolidado.diferencaVendas} tipo="vendas" />
                </section>

                <section aria-labelledby="tracking-revenue-summary" className="rounded-lg border border-success/20 bg-success/5 p-4">
                  <h5 id="tracking-revenue-summary" className="flex items-center gap-2 text-sm font-semibold">
                    <DollarSign aria-hidden="true" className="size-4 text-success-foreground" /> Faturamento
                  </h5>
                  <dl className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs text-muted-foreground">Meta acumulada</dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums text-success-foreground">
                        R$ {consolidado.metaAcumuladaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Faturamento realizado</dt>
                      <dd className="mt-1 text-xl font-semibold tabular-nums">
                        R$ {consolidado.realAcumuladoFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </div>
                  </dl>
                  <StatusBadge diferenca={consolidado.diferencaFaturamento} tipo="faturamento" />
                </section>
              </div>

              <Collapsible open={isTicketOpen} onOpenChange={setIsTicketOpen} className="mt-4 rounded-md border border-border">
                <div className="p-1">
                  <CollapsibleTrigger render={
                    <Button variant="ghost" className="w-full justify-between text-left">
                      <span>Ver ticket médio · meta e realizado</span>
                      {isTicketOpen ? <ChevronUp aria-hidden="true" className="size-4" /> : <ChevronDown aria-hidden="true" className="size-4" />}
                    </Button>
                  } />
                </div>
                <CollapsibleContent>
                  <dl className="grid gap-3 border-t p-4 sm:grid-cols-2">
                    <div>
                      <dt className="text-xs text-muted-foreground">Ticket médio da meta</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        R$ {consolidado.metaTicketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Ticket médio realizado</dt>
                      <dd className="mt-1 font-semibold tabular-nums">
                        R$ {consolidado.realTicketMedio.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </dd>
                    </div>
                  </dl>
                </CollapsibleContent>
              </Collapsible>
            </div>

            {/* Tabela de Dias */}
            <div className="space-y-3 md:hidden" aria-label="Acompanhamento diário por dia">
              {trackingRows.length === 0 ? (
                <DataState
                  variant="empty"
                  title="Nenhum dia com médico encontrado na agenda"
                  description="Adicione médicos na aba Agenda para ver o acompanhamento."
                  className="min-h-48"
                />
              ) : trackingRows.map(({ schedule, registro, metaVendasDia, metaFatDia, diferencaVendas, diferencaFaturamento, diferencaConsolidada, temDados }) => (
                <article key={schedule.id} className="space-y-4 rounded-lg border border-border bg-card p-4">
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h5 className="font-semibold">{schedule.date}</h5>
                      <p className="text-xs text-muted-foreground">
                        {schedule.semMedico ? "Sem médico" : schedule.isDiaCompleto ? "Dois períodos" : "Um período"}
                      </p>
                    </div>
                  </header>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Meta de vendas</p>
                      <p className="font-medium tabular-nums text-primary">{metaVendasDia.toFixed(2)}</p>
                    </div>
                    <div>
                      <label htmlFor={`tracking-sales-${schedule.id}`} className="text-xs text-muted-foreground">Vendas realizadas</label>
                      <DebouncedNumberInput
                        id={`tracking-sales-${schedule.id}`}
                        value={registro?.vendas_realizadas}
                        onCommit={(value) => onUpdateRegistro(schedule.date, "vendas_realizadas", value)}
                        className="mt-1 h-9 w-full text-center"
                        placeholder="-"
                        ariaLabel={`Vendas realizadas em ${schedule.date}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Desvio de vendas</p>
                      <div className="mt-1">{renderDeviation(diferencaVendas, temDados, `${diferencaVendas >= 0 ? "+" : ""}${diferencaVendas.toFixed(1)}`)}</div>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Meta de faturamento</p>
                      <p className="font-medium tabular-nums text-success-foreground">R$ {metaFatDia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <label htmlFor={`tracking-revenue-${schedule.id}`} className="text-xs text-muted-foreground">Faturamento realizado</label>
                      <DebouncedNumberInput
                        id={`tracking-revenue-${schedule.id}`}
                        value={registro?.faturamento_realizado}
                        onCommit={(value) => onUpdateRegistro(schedule.date, "faturamento_realizado", value)}
                        className="mt-1 h-9 w-full text-center"
                        placeholder="-"
                        ariaLabel={`Faturamento realizado em ${schedule.date}`}
                      />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Desvio diário</p>
                      <div className="mt-1">{renderDeviation(diferencaFaturamento, temDados, `${diferencaFaturamento >= 0 ? "+R$ " : "-R$ "}${Math.abs(diferencaFaturamento).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`)}</div>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Desvio acumulado</p>
                      <div className="mt-1">{renderDeviation(diferencaConsolidada, temDados, `${diferencaConsolidada >= 0 ? "+" : "-"}R$ ${Math.abs(diferencaConsolidada).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}`)}</div>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden md:block">
            {trackingRows.length === 0 ? (
              <DataState
                variant="empty"
                title="Nenhum dia com médico encontrado na agenda"
                description="Adicione médicos na aba Agenda para ver o acompanhamento."
                className="min-h-48"
              />
            ) : (
            <EntityDataTable
              table={trackingTable}
              label="Acompanhamento diário por dia"
              className="rounded-md border border-border"
              tableClassName="min-w-[980px]"
              headerRowClassName="bg-muted/50 hover:bg-muted/50"
              getHeaderClassName={(columnId) => columnId === "data" ? undefined : "text-center"}
              getCellClassName={(columnId) => ({
                data: "font-medium whitespace-nowrap",
                metaVendasDia: "text-center",
                vendas_realizadas: "text-center",
                diferencaVendas: "text-center",
                metaFatDia: "text-center",
                faturamento_realizado: "text-center",
                diferencaFaturamento: "text-center",
                diferencaConsolidada: "text-center",
              })[columnId]}
            />
            )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
