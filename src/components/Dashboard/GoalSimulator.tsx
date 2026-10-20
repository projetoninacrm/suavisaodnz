import { useEffect, useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { calculateGoalSimulatorResults } from "@/lib/reportCalculations";

export interface GoalSimulatorValues {
  vendas: number;
  ticketMedio: number;
  potencial: number;
  taxaPresenca: number;
  conversao: number;
}

const STORAGE_KEY = "indicadores_simulator_values";
const EMPTY_VALUES: GoalSimulatorValues = { vendas: 0, ticketMedio: 0, potencial: 0, taxaPresenca: 0, conversao: 0 };

function readSavedValues(): GoalSimulatorValues | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<GoalSimulatorValues>;
    const readNumber = (value: unknown) => {
      const number = Number(value);
      return Number.isFinite(number) && number >= 0 ? number : 0;
    };
    return {
      vendas: readNumber(parsed.vendas),
      ticketMedio: readNumber(parsed.ticketMedio),
      potencial: readNumber(parsed.potencial),
      taxaPresenca: readNumber(parsed.taxaPresenca),
      conversao: readNumber(parsed.conversao),
    };
  } catch {
    return null;
  }
}

const formatCurrency = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function GoalSimulator({ initialValues }: { initialValues?: GoalSimulatorValues }) {
  const [savedOnLoad] = useState(() => readSavedValues());
  const [simulator, setSimulator] = useState<GoalSimulatorValues>(() => savedOnLoad || EMPTY_VALUES);
  const initialSales = initialValues?.vendas ?? 0;
  const initialAverageTicket = initialValues?.ticketMedio ?? 0;
  const initialPotential = initialValues?.potencial ?? 0;
  const initialAttendanceRate = initialValues?.taxaPresenca ?? 0;
  const initialConversionRate = initialValues?.conversao ?? 0;

  useEffect(() => {
    if (savedOnLoad || (!initialSales && !initialPotential)) return;
    setSimulator({
      vendas: initialSales,
      ticketMedio: initialAverageTicket,
      potencial: initialPotential,
      taxaPresenca: initialAttendanceRate,
      conversao: initialConversionRate,
    });
  }, [initialSales, initialAverageTicket, initialPotential, initialAttendanceRate, initialConversionRate, savedOnLoad]);

  useEffect(() => {
    if (simulator.vendas > 0 || simulator.potencial > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(simulator));
    }
  }, [simulator]);

  const results = useMemo(() => calculateGoalSimulatorResults(simulator), [simulator]);

  const update = (field: keyof GoalSimulatorValues, value: string) => {
    setSimulator((current) => ({ ...current, [field]: Number(value) || 0 }));
  };

  return (
    <Card className="border-2 border-primary/20 bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Calculator className="size-4 text-primary" />
          Simulador de metas
          <Badge variant="outline" className="ml-auto text-xs">Cenário editável</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,0.8fr)]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="goal-simulator-sales" className="text-xs text-muted-foreground">Vendas desejadas</Label>
                <Input id="goal-simulator-sales" type="number" min="0" value={simulator.vendas || ""} onChange={(event) => update("vendas", event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-simulator-ticket" className="text-xs text-muted-foreground">Ticket médio (R$)</Label>
                <Input id="goal-simulator-ticket" type="number" min="0" value={simulator.ticketMedio || ""} onChange={(event) => update("ticketMedio", event.target.value)} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label htmlFor="goal-simulator-potential" className="text-xs text-muted-foreground">Potencial (%)</Label>
                <Input id="goal-simulator-potential" type="number" min="0" step="0.01" value={simulator.potencial || ""} onChange={(event) => update("potencial", event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-simulator-attendance" className="text-xs text-muted-foreground">Taxa de presença (%)</Label>
                <Input id="goal-simulator-attendance" type="number" min="0" step="0.01" value={simulator.taxaPresenca || ""} onChange={(event) => update("taxaPresenca", event.target.value)} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-simulator-conversion" className="text-xs text-muted-foreground">Conversão (%)</Label>
                <Input id="goal-simulator-conversion" type="number" min="0" step="0.01" value={simulator.conversao || ""} onChange={(event) => update("conversao", event.target.value)} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Cenário salvo neste navegador. Os valores simulados não alteram o realizado nem as metas cadastradas.</p>
          </div>

          <dl className="grid content-start gap-2 border-t border-border pt-4 text-sm lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
            <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"><dt className="text-muted-foreground">Atendimentos necessários</dt><dd className="font-semibold tabular-nums">{results.atendimentos}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"><dt className="text-muted-foreground">Receitas necessárias</dt><dd className="font-semibold tabular-nums">{results.receitas}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-md bg-muted/50 p-3"><dt className="text-muted-foreground">Visitas à loja</dt><dd className="font-semibold tabular-nums">{results.visitouDnz}</dd></div>
            <div className="flex items-center justify-between gap-4 rounded-md bg-primary/10 p-3"><dt className="text-muted-foreground">Faturamento projetado</dt><dd className="font-semibold tabular-nums text-primary dark:text-foreground">{formatCurrency(results.faturamento)}</dd></div>
          </dl>
        </div>
        <p className="mt-4 border-t border-border pt-3 text-xs text-muted-foreground">Fórmulas: atendimentos = receitas ÷ potencial; receitas = visitas ÷ presença; visitas = vendas ÷ conversão; faturamento = vendas × ticket.</p>
      </CardContent>
    </Card>
  );
}
