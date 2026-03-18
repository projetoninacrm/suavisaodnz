import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Percent, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PatientReturn {
  id: string;
  nome: string;
  telefone: string;
  tipo_atendimento: string;
  primeiro_atendimento: string;
  ultimo_atendimento: string;
  total_atendimentos: number;
  retornou: boolean;
  atendimentos_no_periodo: number;
  atendimentos_apos_periodo: number;
}

export function TaxaRetornoSection() {
  const [dataInicio, setDataInicio] = useState("2024-01-01");
  const [dataFim, setDataFim] = useState("2024-12-31");
  const [patients, setPatients] = useState<PatientReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  const fetchData = async () => {
    setIsLoading(true);
    setLoadingMessage("Buscando atendimentos na API... isso pode levar alguns segundos.");
    try {
      const { data, error } = await supabase.functions.invoke("return-rate", {
        body: { start_date: dataInicio, end_date: dataFim },
      });

      if (error) {
        console.error("Error fetching return rate:", error);
        return;
      }

      if (data?.success) {
        setPatients(data.data || []);
      } else {
        console.error("API error:", data?.error);
      }
    } catch (err) {
      console.error("Error:", err);
    } finally {
      setIsLoading(false);
      setLoadingMessage("");
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchName.trim()) return patients;
    const q = searchName.toLowerCase();
    return patients.filter(p => p.nome.toLowerCase().includes(q));
  }, [patients, searchName]);

  const stats = useMemo(() => {
    const total = patients.length;
    const retornaram = patients.filter(p => p.retornou).length;
    const taxa = total > 0 ? Math.round((retornaram / total) * 100) : 0;
    return { total, retornaram, taxa };
  }, [patients]);

  return (
    <div className="space-y-6">
      {/* Period Filter */}
      <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Início</label>
          <Input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="w-40"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-muted-foreground mb-1 block">Data Fim</label>
          <Input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="w-40"
          />
        </div>
        <Button onClick={fetchData} disabled={isLoading}>
          {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
          Consultar
        </Button>
      </div>

      {/* Kanban Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pacientes no Período</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : stats.total}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-chart-3/10 text-chart-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Retornaram</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : stats.retornaram}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-accent/10 text-accent">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Taxa de Retorno</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : `${stats.taxa}%`}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          {filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Paciente</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Tipo de Atendimento</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">1º Atendimento</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Último Atendimento</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Atend. no Período</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Atend. Após Período</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Retornou?</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    {loadingMessage || "Carregando..."}
                  </td>
                </tr>
              ) : filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-muted-foreground">
                    {patients.length === 0
                      ? "Clique em 'Consultar' para buscar os dados da API."
                      : "Nenhum paciente encontrado."}
                  </td>
                </tr>
              ) : (
                filteredPatients.map((patient) => (
                  <tr key={patient.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{patient.nome}</td>
                    <td className="px-4 py-3 text-muted-foreground">{patient.tipo_atendimento}</td>
                    <td className="px-4 py-3 text-muted-foreground">{patient.telefone}</td>
                    <td className="px-4 py-3 text-center">{patient.primeiro_atendimento}</td>
                    <td className="px-4 py-3 text-center">{patient.ultimo_atendimento}</td>
                    <td className="px-4 py-3 text-center">{patient.atendimentos_no_periodo}</td>
                    <td className="px-4 py-3 text-center">{patient.atendimentos_apos_periodo}</td>
                    <td className="px-4 py-3 text-center font-semibold">{patient.total_atendimentos}</td>
                    <td className="px-4 py-3 text-center">
                      {patient.retornou ? (
                        <span className="inline-flex items-center rounded-full bg-chart-3/10 px-2.5 py-0.5 text-xs font-medium text-chart-3">
                          Sim
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                          Não
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
