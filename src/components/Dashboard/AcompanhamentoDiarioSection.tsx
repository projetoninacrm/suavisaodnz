import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Target, DollarSign, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

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
  onUpdateRegistro: (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null) => void;
  metaDiariaVendasCompleta: number; // Meta para dias com 2 períodos
  metaDiariaVendasMeio: number; // Meta para dias com 1 período
  metaFaturamentoDiarioCompleto: number; // Meta faturamento para dias com 2 períodos
  metaFaturamentoDiarioMeio: number; // Meta faturamento para dias com 1 período
  metaMensalFaturamento: number; // Meta mensal total
  pesoTotalDias: number; // Peso total dos dias (completos + meios*0.5)
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
}: AcompanhamentoDiarioSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filtra apenas dias com médico e adiciona info se é dia completo ou meio
  const diasComMedico = useMemo(() => {
    return schedules.filter(s => 
      (s.morning_shift && s.morning_shift.trim() !== "") || 
      (s.afternoon_shift && s.afternoon_shift.trim() !== "")
    ).map(s => {
      const temManha = s.morning_shift && s.morning_shift.trim() !== "";
      const temTarde = s.afternoon_shift && s.afternoon_shift.trim() !== "";
      const isDiaCompleto = temManha && temTarde;
      return { ...s, isDiaCompleto };
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

  // Calcula a meta dinâmica de faturamento por dia em ordem cronológica.
  // A meta de cada linha é definida pelo que ainda falta atingir ANTES daquele dia,
  // para não mudar incoerentemente após preencher o próprio dia.
  const metasFaturamentoPorDia = useMemo(() => {
    let metaRestante = metaMensalFaturamento;
    let pesoRestante = pesoTotalDias;
    const metas: Record<string, number> = {};

    diasComMedico.forEach((schedule) => {
      const pesoDia = schedule.isDiaCompleto ? 1 : 0.5;
      const metaBaseAtual = pesoRestante > 0 ? Math.max(0, metaRestante / pesoRestante) : 0;
      metas[schedule.date] = metaBaseAtual * pesoDia;

      const faturamentoRealizado = registrosMap[schedule.date]?.faturamento_realizado;
      if (faturamentoRealizado !== null && faturamentoRealizado !== undefined) {
        metaRestante = Math.max(0, metaRestante - faturamentoRealizado);
        pesoRestante = Math.max(0, pesoRestante - pesoDia);
      }
    });

    return metas;
  }, [diasComMedico, registrosMap, metaMensalFaturamento, pesoTotalDias]);

  // Cálculo do consolidado baseado nos dias preenchidos
  const consolidado = useMemo(() => {
    let pesoPreenchido = 0;
    let metaAcumuladaVendas = 0;
    let realAcumuladoVendas = 0;
    let realAcumuladoFaturamento = 0;

    diasComMedico.forEach((schedule) => {
      const registro = registrosMap[schedule.date];
      const pesoDia = schedule.isDiaCompleto ? 1 : 0.5;
      const metaVendasDia = schedule.isDiaCompleto ? metaDiariaVendasCompleta : metaDiariaVendasMeio;
      
      // Conta como preenchido se existe registro (mesmo com valores 0)
      if (registro && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null)) {
        pesoPreenchido += pesoDia;
        metaAcumuladaVendas += metaVendasDia;
        realAcumuladoVendas += registro.vendas_realizadas || 0;
        realAcumuladoFaturamento += registro.faturamento_realizado || 0;
      }
    });

    // Meta de faturamento proporcional aos dias preenchidos
    const metaAcumuladaFaturamento = pesoTotalDias > 0
      ? metaMensalFaturamento * (pesoPreenchido / pesoTotalDias)
      : 0;

    const diferencaVendas = realAcumuladoVendas - metaAcumuladaVendas;
    const diferencaFaturamento = realAcumuladoFaturamento - metaAcumuladaFaturamento;

    return {
      pesoPreenchido,
      metaAcumuladaVendas,
      metaAcumuladaFaturamento,
      realAcumuladoVendas,
      realAcumuladoFaturamento,
      diferencaVendas,
      diferencaFaturamento,
    };
  }, [diasComMedico, registrosMap, metaDiariaVendasCompleta, metaDiariaVendasMeio, metaMensalFaturamento, pesoTotalDias]);

  const StatusBadge = ({ diferenca, tipo }: { diferenca: number; tipo: "vendas" | "faturamento" }) => {
    const isPositivo = diferenca >= 0;
    const Icon = diferenca > 0 ? TrendingUp : diferenca < 0 ? TrendingDown : Minus;
    
    return (
      <div className={`flex items-center gap-2 px-4 py-3 rounded-lg ${
        isPositivo 
          ? "bg-green-500/20 text-green-600 border border-green-500/30" 
          : "bg-red-500/20 text-red-600 border border-red-500/30"
      }`}>
        <Icon className="h-5 w-5" />
        <div>
          <p className="text-xs font-medium opacity-80">
            {tipo === "vendas" ? "Vendas" : "Faturamento"}
          </p>
          <p className="text-lg font-bold">
            {isPositivo ? "+" : ""}
            {tipo === "vendas" 
              ? diferenca.toFixed(2)
              : `R$ ${diferenca.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`
            }
          </p>
          <p className="text-xs opacity-70">
            {isPositivo ? "à frente da meta" : "atrás da meta"}
          </p>
        </div>
      </div>
    );
  };

  return (
    <Card className="border-border mt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-4">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between p-0 h-auto hover:bg-transparent">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Acompanhamento Diário de Metas
              </CardTitle>
              {isOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
            </Button>
          </CollapsibleTrigger>
        </CardHeader>
        
        <CollapsibleContent>
          <CardContent>
            {/* Kanban de Consolidado */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold mb-3 text-muted-foreground">
                Consolidado (peso {consolidado.pesoPreenchido.toFixed(1)} preenchido)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Meta Acumulada Vendas */}
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-medium text-muted-foreground">Meta Vendas</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-500">
                    {consolidado.metaAcumuladaVendas.toFixed(2)}
                  </p>
                </div>

                {/* Real Vendas */}
                <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Target className="h-4 w-4 text-primary" />
                    <span className="text-xs font-medium text-muted-foreground">Real Vendas</span>
                  </div>
                  <p className="text-2xl font-bold text-primary">
                    {consolidado.realAcumuladoVendas.toFixed(2)}
                  </p>
                </div>

                {/* Meta Acumulada Faturamento */}
                <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="text-xs font-medium text-muted-foreground">Meta Faturamento</span>
                  </div>
                  <p className="text-2xl font-bold text-green-500">
                    R$ {consolidado.metaAcumuladaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>

                {/* Real Faturamento */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    <span className="text-xs font-medium text-muted-foreground">Real Faturamento</span>
                  </div>
                  <p className="text-2xl font-bold text-emerald-500">
                    R$ {consolidado.realAcumuladoFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>

              {/* Status Kanban */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <StatusBadge diferenca={consolidado.diferencaVendas} tipo="vendas" />
                <StatusBadge diferenca={consolidado.diferencaFaturamento} tipo="faturamento" />
              </div>
            </div>

            {/* Tabela de Dias */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-3 py-3 text-left font-semibold text-muted-foreground">Data</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Meta Vendas</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Vendas Real</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Status Vendas</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Meta Fat.</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Fat. Real</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Status Fat.</th>
                    <th className="px-3 py-3 text-center font-semibold text-muted-foreground">Consol. Fat.</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let acumuladoFaturamento = 0;
                    let pesoAcumulado = 0;
                    
                    return diasComMedico.map((schedule) => {
                      const registro = registrosMap[schedule.date];
                      const vendasReal = registro?.vendas_realizadas || 0;
                      const faturamentoReal = registro?.faturamento_realizado || 0;
                      const pesoDia = schedule.isDiaCompleto ? 1 : 0.5;
                      
                      // Determina a meta baseada no tipo do dia (completo ou meio)
                      const metaVendasDia = schedule.isDiaCompleto ? metaDiariaVendasCompleta : metaDiariaVendasMeio;
                      const metaFatDiaBase = schedule.isDiaCompleto ? metaFaturamentoDiarioCompleto : metaFaturamentoDiarioMeio;
                      const metaFatDia = metasFaturamentoPorDia[schedule.date] ?? metaFatDiaBase;
                      
                      const diferencaVendas = vendasReal - metaVendasDia;
                      const statusVendas = diferencaVendas >= 0 ? "ok" : "atras";
                      
                      const diferencaFaturamento = faturamentoReal - metaFatDia;
                      const statusFaturamento = diferencaFaturamento >= 0 ? "ok" : "atras";
                      
                      // Consolidado: meta proporcional fixa (meta mensal × peso acumulado / peso total) vs real acumulado
                      const temDados = registro !== undefined && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null);
                      if (temDados) {
                        acumuladoFaturamento += faturamentoReal;
                        pesoAcumulado += pesoDia;
                      }
                      const metaProporcional = pesoTotalDias > 0 ? metaMensalFaturamento * (pesoAcumulado / pesoTotalDias) : 0;
                      const diferencaConsolidada = acumuladoFaturamento - metaProporcional;

                      return (
                        <tr key={schedule.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{schedule.date}</td>
                          <td className="px-3 py-2 text-center text-blue-500 font-medium">
                            {metaVendasDia.toFixed(2)}
                            <span className="text-xs text-muted-foreground ml-1">
                              ({schedule.isDiaCompleto ? "2P" : "1P"})
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={registro?.vendas_realizadas !== null && registro?.vendas_realizadas !== undefined ? registro.vendas_realizadas : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateRegistro(schedule.date, "vendas_realizadas", val === "" ? null : parseInt(val));
                              }}
                              className="h-8 w-20 text-center mx-auto"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {temDados ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                statusVendas === "ok" 
                                  ? "bg-green-500/20 text-green-600" 
                                  : "bg-red-500/20 text-red-600"
                              }`}>
                                {statusVendas === "ok" ? (
                                  <>
                                    <TrendingUp className="h-3 w-3" />
                                    +{diferencaVendas.toFixed(1)}
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-3 w-3" />
                                    {diferencaVendas.toFixed(1)}
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center text-green-500 font-medium">
                            R$ {metaFatDia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="1"
                              min="0"
                              value={registro?.faturamento_realizado !== null && registro?.faturamento_realizado !== undefined ? registro.faturamento_realizado : ""}
                              onChange={(e) => {
                                const val = e.target.value;
                                onUpdateRegistro(schedule.date, "faturamento_realizado", val === "" ? null : parseInt(val));
                              }}
                              className="h-8 w-24 text-center mx-auto"
                              placeholder="-"
                            />
                          </td>
                          <td className="px-3 py-2 text-center">
                            {temDados ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                statusFaturamento === "ok" 
                                  ? "bg-green-500/20 text-green-600" 
                                  : "bg-red-500/20 text-red-600"
                              }`}>
                                {statusFaturamento === "ok" ? (
                                  <>
                                    <TrendingUp className="h-3 w-3" />
                                    +{diferencaFaturamento.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-3 w-3" />
                                    {diferencaFaturamento.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-center">
                            {temDados ? (
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                diferencaConsolidada >= 0 
                                  ? "bg-green-500/20 text-green-600" 
                                  : "bg-red-500/20 text-red-600"
                              }`}>
                                {diferencaConsolidada >= 0 ? (
                                  <>
                                    <TrendingUp className="h-3 w-3" />
                                    +R$ {diferencaConsolidada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                  </>
                                ) : (
                                  <>
                                    <TrendingDown className="h-3 w-3" />
                                    R$ {diferencaConsolidada.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
                                  </>
                                )}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>

              {diasComMedico.length === 0 && (
                <div className="py-8 text-center text-muted-foreground">
                  <p>Nenhum dia com médico encontrado na agenda.</p>
                  <p className="text-sm mt-1">Adicione médicos na aba Agenda para ver o acompanhamento.</p>
                </div>
              )}
            </div>
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
