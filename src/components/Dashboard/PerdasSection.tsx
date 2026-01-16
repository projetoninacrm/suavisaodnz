import { useState, useMemo } from "react";
import { format, parse, isValid, startOfMonth, endOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { Lead } from "@/hooks/useLeads";

interface PerdasSectionProps {
  leads: Lead[];
}

// Categorias de motivos de perda com palavras-chave
const CATEGORIAS_MOTIVOS = [
  { 
    categoria: "Não gostou da armação", 
    keywords: ["armação", "armacao", "não gostou", "nao gostou", "não agradou", "nao agradou", "não achou", "nao achou", "modelo"]
  },
  { 
    categoria: "Vai retornar / Aguardando", 
    keywords: ["retornar", "vai voltar", "volta", "semana que vem", "depois", "aguardando", "irá retornar", "ira retornar", "vai vir"]
  },
  { 
    categoria: "Precisa fazer exame", 
    keywords: ["exame", "receita", "pupila", "oftalmologista", "consulta"]
  },
  { 
    categoria: "Preço / Orçamento", 
    keywords: ["preço", "preco", "orçamento", "orcamento", "caro", "desconto", "curto", "apertado", "valor"]
  },
  { 
    categoria: "Prazo de entrega", 
    keywords: ["prazo", "entrega", "demora", "urgente", "viagem", "viajar"]
  },
  { 
    categoria: "Comprou em outro lugar", 
    keywords: ["outro lugar", "outra ótica", "outra otica", "comprou", "fez em outro", "diniz", "concorrente"]
  },
  { 
    categoria: "Sem resposta / Contato", 
    keywords: ["sem resposta", "não responde", "nao responde", "mensagem não", "mensagem nao", "não atende", "nao atende"]
  },
  { 
    categoria: "Depende de terceiros", 
    keywords: ["mãe", "mae", "pai", "marido", "esposa", "filha", "filho", "familiar", "cartão de"]
  },
];

const COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220, 70%, 50%)",
  "hsl(280, 65%, 60%)",
  "hsl(340, 75%, 55%)",
  "hsl(45, 90%, 50%)",
];

function categorizarMotivo(obs: string | null): string {
  if (!obs) return "Sem observação";
  
  const obsLower = obs.toLowerCase();
  
  for (const { categoria, keywords } of CATEGORIAS_MOTIVOS) {
    if (keywords.some(kw => obsLower.includes(kw))) {
      return categoria;
    }
  }
  
  return "Outros motivos";
}

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null;
  
  // Try dd/MM/yyyy format
  const parsed = parse(dateStr, "dd/MM/yyyy", new Date());
  if (isValid(parsed)) return parsed;
  
  // Try ISO format
  const isoDate = new Date(dateStr);
  if (isValid(isoDate)) return isoDate;
  
  return null;
}

export function PerdasSection({ leads }: PerdasSectionProps) {
  const today = new Date();
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: startOfMonth(today),
    to: endOfMonth(today),
  });

  // Filtrar leads que não compraram dentro do período
  const leadsNaoCompraram = useMemo(() => {
    return leads.filter(lead => {
      // Apenas leads que não venderam
      if (lead.venda === "Sim") return false;
      
      // Filtrar por data
      const leadDate = parseDate(lead.data_registro);
      if (!leadDate) return false;
      
      return leadDate >= dateRange.from && leadDate <= dateRange.to;
    });
  }, [leads, dateRange]);

  // Agrupar por categoria de motivo
  const dadosGrafico = useMemo(() => {
    const contagem: Record<string, number> = {};
    
    leadsNaoCompraram.forEach(lead => {
      const categoria = categorizarMotivo(lead.obs);
      contagem[categoria] = (contagem[categoria] || 0) + 1;
    });
    
    return Object.entries(contagem)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [leadsNaoCompraram]);

  const totalPerdas = leadsNaoCompraram.length;

  return (
    <div className="space-y-6">
      {/* Filtro de período */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Filtrar Período</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">De:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.from, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Até:</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[160px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(dateRange.to, "dd/MM/yyyy", { locale: ptBR })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => date && setDateRange(prev => ({ ...prev, to: date }))}
                    initialFocus
                    locale={ptBR}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="text-sm text-muted-foreground ml-auto">
              Total de leads sem venda: <span className="font-semibold text-foreground">{totalPerdas}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Gráfico de Pizza */}
      <Card>
        <CardHeader>
          <CardTitle>Motivos de Não-Fechamento</CardTitle>
        </CardHeader>
        <CardContent>
          {dadosGrafico.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-6">
              {/* Gráfico */}
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosGrafico}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={140}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => 
                        `${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {dadosGrafico.map((_, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value: number) => [`${value} leads`, "Quantidade"]}
                    />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Tabela de detalhes */}
              <div className="space-y-2">
                <h4 className="font-medium text-sm text-muted-foreground mb-3">Detalhamento</h4>
                <div className="space-y-2">
                  {dadosGrafico.map((item, index) => (
                    <div 
                      key={item.name}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {((item.value / totalPerdas) * 100).toFixed(1)}%
                        </span>
                        <span className="text-sm font-semibold w-8 text-right">
                          {item.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              Nenhum lead sem venda encontrado no período selecionado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
