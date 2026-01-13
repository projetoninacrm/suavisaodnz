import { useMemo, useState } from "react";
import { TrendingUp, TrendingDown, Target, DollarSign, Minus, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Schedule } from "@/hooks/useSchedules";
import { AcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface AcompanhamentoDiarioSectionProps {
  schedules: Schedule[];
  registros: AcompanhamentoDiario[];
  onUpdateRegistro: (data: string, field: "vendas_realizadas" | "faturamento_realizado", value: number | null) => void;
  metaDiariaVendas: number;
  metaMensalFaturamento: number; // Meta mensal total
}

export function AcompanhamentoDiarioSection({
  schedules,
  registros,
  onUpdateRegistro,
  metaDiariaVendas,
  metaMensalFaturamento,
}: AcompanhamentoDiarioSectionProps) {
  const [isOpen, setIsOpen] = useState(true);

  // Filtra apenas dias com médico
  const diasComMedico = useMemo(() => {
    return schedules.filter(s => 
      (s.morning_shift && s.morning_shift.trim() !== "") || 
      (s.afternoon_shift && s.afternoon_shift.trim() !== "")
    ).sort((a, b) => {
      // Ordena por data (DD/MM/YYYY)
      const [diaA, mesA, anoA] = a.date.split("/").map(Number);
      const [diaB, mesB, anoB] = b.date.split("/").map(Number);
      const dateA = new Date(anoA, mesA - 1, diaA);
      const dateB = new Date(anoB, mesB - 1, diaB);
      return dateA.getTime() - dateB.getTime();
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

  // Calcula meta diária dinâmica por dia (falta/dias restantes)
  const metasDinamicosFaturamento = useMemo(() => {
    const metas: Record<string, number> = {};
    let faturamentoAcumulado = 0;
    
    diasComMedico.forEach((schedule, index) => {
      const diasRestantes = diasComMedico.length - index;
      const faltaParaMeta = metaMensalFaturamento - faturamentoAcumulado;
      const metaDiaria = faltaParaMeta / diasRestantes;
      
      metas[schedule.date] = Math.max(0, metaDiaria); // Não pode ser negativa
      
      // Adiciona o faturamento real deste dia para os próximos cálculos
      const registro = registrosMap[schedule.date];
      if (registro && registro.faturamento_realizado !== null) {
        faturamentoAcumulado += registro.faturamento_realizado || 0;
      }
    });
    
    return metas;
  }, [diasComMedico, registrosMap, metaMensalFaturamento]);

  // Meta diária base (para dias sem dados anteriores)
  const metaDiariaFaturamentoBase = metaMensalFaturamento / diasComMedico.length;

  // Cálculo do consolidado baseado nos dias preenchidos
  const consolidado = useMemo(() => {
    let diasPreenchidos = 0;
    let metaAcumuladaVendas = 0;
    let metaAcumuladaFaturamento = 0;
    let realAcumuladoVendas = 0;
    let realAcumuladoFaturamento = 0;

    diasComMedico.forEach((schedule) => {
      const registro = registrosMap[schedule.date];
      // Conta como preenchido se existe registro (mesmo com valores 0)
      if (registro && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null)) {
        diasPreenchidos++;
        realAcumuladoVendas += registro.vendas_realizadas || 0;
        realAcumuladoFaturamento += registro.faturamento_realizado || 0;
      }
    });

    // Meta acumulada é baseada nos dias preenchidos (usando meta base para consistência)
    metaAcumuladaVendas = diasPreenchidos * metaDiariaVendas;
    metaAcumuladaFaturamento = diasPreenchidos * metaDiariaFaturamentoBase;

    const diferencaVendas = realAcumuladoVendas - metaAcumuladaVendas;
    const diferencaFaturamento = realAcumuladoFaturamento - metaAcumuladaFaturamento;

    return {
      diasPreenchidos,
      metaAcumuladaVendas,
      metaAcumuladaFaturamento,
      realAcumuladoVendas,
      realAcumuladoFaturamento,
      diferencaVendas,
      diferencaFaturamento,
    };
  }, [diasComMedico, registrosMap, metaDiariaVendas, metaDiariaFaturamentoBase]);

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
                Consolidado ({consolidado.diasPreenchidos} dias preenchidos)
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
                    let diasContados = 0;
                    
                    return diasComMedico.map((schedule) => {
                      const registro = registrosMap[schedule.date];
                      const vendasReal = registro?.vendas_realizadas || 0;
                      const faturamentoReal = registro?.faturamento_realizado || 0;
                      
                      // Meta dinâmica de faturamento para este dia
                      const metaDiariaFatDia = metasDinamicosFaturamento[schedule.date] || metaDiariaFaturamentoBase;
                      
                      const diferencaVendas = vendasReal - metaDiariaVendas;
                      const statusVendas = diferencaVendas >= 0 ? "ok" : "atras";
                      
                      const diferencaFaturamento = faturamentoReal - metaDiariaFatDia;
                      const statusFaturamento = diferencaFaturamento >= 0 ? "ok" : "atras";
                      
                      // Calcula consolidado progressivo - considera preenchido se existe registro (mesmo com 0)
                      const temDados = registro !== undefined && (registro.vendas_realizadas !== null || registro.faturamento_realizado !== null);
                      if (temDados) {
                        diasContados++;
                        acumuladoFaturamento += faturamentoReal;
                      }
                      const metaAcumuladaFat = diasContados * metaDiariaFaturamentoBase;
                      const diferencaConsolidada = acumuladoFaturamento - metaAcumuladaFat;

                      return (
                        <tr key={schedule.id} className="border-b border-border/50 hover:bg-muted/30">
                          <td className="px-3 py-2 font-medium">{schedule.date}</td>
                          <td className="px-3 py-2 text-center text-blue-500 font-medium">
                            {metaDiariaVendas.toFixed(2)}
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
                            R$ {metaDiariaFatDia.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}
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
