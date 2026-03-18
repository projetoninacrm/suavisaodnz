import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, UserCheck, Percent, Loader2, Search, Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

interface PatientReturn {
  id: string;
  nome: string;
  telefone: string;
  tipo_atendimento: string;
  tipos_atendimento: string[];
  primeiro_atendimento: string;
  ultimo_atendimento: string;
  total_atendimentos: number;
  retornou: boolean;
  atendimentos_no_periodo: number;
  atendimentos_apos_periodo: number;
}

function MultiSelectColumnFilter({
  label,
  options,
  selected,
  onToggle,
  onClear,
}: {
  label: string;
  options: string[];
  selected: Set<string>;
  onToggle: (val: string) => void;
  onClear: () => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = options.filter((o) => o.toLowerCase().includes(search.toLowerCase()));
  const hasFilter = selected.size > 0 && selected.size < options.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="inline-flex items-center gap-1 hover:text-foreground transition-colors">
          {label}
          <Filter className={`w-3 h-3 ${hasFilter ? "text-primary" : "text-muted-foreground/50"}`} />
          {hasFilter && (
            <span className="text-[10px] bg-primary text-primary-foreground rounded-full w-4 h-4 flex items-center justify-center">
              {selected.size}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Filtrar {label}</span>
            {hasFilter && (
              <button onClick={onClear} className="text-xs text-primary hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Limpar
              </button>
            )}
          </div>
          {options.length > 6 && (
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-7 text-xs"
            />
          )}
          <div className="max-h-48 overflow-y-auto space-y-1">
            {filtered.map((opt) => (
              <label
                key={opt}
                className="flex items-center gap-2 text-xs py-1 px-1 rounded hover:bg-muted/50 cursor-pointer"
              >
                <Checkbox
                  checked={selected.has(opt)}
                  onCheckedChange={() => onToggle(opt)}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate">{opt}</span>
              </label>
            ))}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground py-2 text-center">Nenhum resultado</p>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function TaxaRetornoSection() {
  const [dataInicio, setDataInicio] = useState("2024-01-01");
  const [dataFim, setDataFim] = useState("2024-12-31");
  const [patients, setPatients] = useState<PatientReturn[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchName, setSearchName] = useState("");
  const [loadingMessage, setLoadingMessage] = useState("");

  // Column filters
  const [tipoFilter, setTipoFilter] = useState<Set<string>>(new Set());
  const [retornouFilter, setRetornouFilter] = useState<Set<string>>(new Set());

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
        setTipoFilter(new Set());
        setRetornouFilter(new Set());
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

  const tipoOptions = useMemo(() => {
    const set = new Set<string>();
    patients.forEach((p) => (p.tipos_atendimento || []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [patients]);

  const retornouOptions = ["Sim", "Não"];

  const toggleFilter = useCallback(
    (setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
      setter((prev) => {
        const next = new Set(prev);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        return next;
      });
    },
    [],
  );

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (searchName.trim() && !p.nome.toLowerCase().includes(searchName.toLowerCase())) return false;
      // Tipo filter - check against ALL tipos the patient has
      if (tipoFilter.size > 0) {
        const patientTipos = p.tipos_atendimento || [p.tipo_atendimento];
        const hasMatch = patientTipos.some((t: string) => tipoFilter.has(t));
        if (!hasMatch) return false;
      }
      if (retornouFilter.size > 0) {
        const val = p.retornou ? "Sim" : "Não";
        if (!retornouFilter.has(val)) return false;
      }
      return true;
    });
  }, [patients, searchName, tipoFilter, retornouFilter]);

  // Card 1 must match Amigo "Finalizados": sum of attendances in selected period
  const stats = useMemo(() => {
    const pacientesUnicos = filteredPatients.length;
    const retornaram = filteredPatients.filter((p) => p.retornou).length;
    const taxa = pacientesUnicos > 0 ? Math.round((retornaram / pacientesUnicos) * 100) : 0;
    return { pacientesUnicos, retornaram, taxa };
  }, [filteredPatients]);

  const activeFiltersCount =
    (tipoFilter.size > 0 ? 1 : 0) + (retornouFilter.size > 0 ? 1 : 0) + (searchName.trim() ? 1 : 0);

  return (
    <div className="space-y-6">
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-primary/10 text-primary">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Finalizados no Período</p>
              <p className="text-2xl font-bold text-foreground">{isLoading ? "..." : stats.finalizadosNoPeriodo}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5 card-shadow">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg flex items-center justify-center bg-chart-3/10 text-chart-3">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pacientes que Retornaram</p>
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

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Buscar por nome..."
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="max-w-xs"
        />
        <span className="text-sm text-muted-foreground">
          {filteredPatients.length} paciente{filteredPatients.length !== 1 ? "s" : ""} únicos
          {activeFiltersCount > 0 &&
            ` (${activeFiltersCount} filtro${activeFiltersCount > 1 ? "s" : ""} ativo${activeFiltersCount > 1 ? "s" : ""})`}
        </span>
        {activeFiltersCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setSearchName("");
              setTipoFilter(new Set());
              setRetornouFilter(new Set());
            }}
          >
            <X className="w-3 h-3 mr-1" /> Limpar filtros
          </Button>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Paciente</th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">
                  <MultiSelectColumnFilter
                    label="Tipo de Atendimento"
                    options={tipoOptions}
                    selected={tipoFilter}
                    onToggle={(val) => toggleFilter(setTipoFilter, val)}
                    onClear={() => setTipoFilter(new Set())}
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold text-muted-foreground">Telefone</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">1º Atendimento</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Último Atendimento</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Atend. no Período</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Atend. Após Período</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">Total</th>
                <th className="px-4 py-3 text-center font-semibold text-muted-foreground">
                  <MultiSelectColumnFilter
                    label="Retornou?"
                    options={retornouOptions}
                    selected={retornouFilter}
                    onToggle={(val) => toggleFilter(setRetornouFilter, val)}
                    onClear={() => setRetornouFilter(new Set())}
                  />
                </th>
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
                      : "Nenhum paciente encontrado com os filtros aplicados."}
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
