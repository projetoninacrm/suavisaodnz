import { useMemo } from "react";
import { CalendarPlus, Users, CalendarCheck, RefreshCw, Loader2, Stethoscope } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNovosAgendamentos } from "@/hooks/useNovosAgendamentos";

interface KpiCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  accent: string;
}

function KpiCard({ title, value, subtitle, icon, accent }: KpiCardProps) {
  return (
    <Card className="p-5 card-shadow">
      <div className="flex items-start justify-between mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>{icon}</div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}

const todayDdmmyyyy = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
};

const todayYmd = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export function NovosAgendamentosSection() {
  const { start, end, setStart, setEnd, items, loading, error, refresh } = useNovosAgendamentos();

  const setHoje = () => {
    const t = todayYmd();
    setStart(t);
    setEnd(t);
    setTimeout(() => refresh(t, t), 0);
  };

  const stats = useMemo(() => {
    const todayStr = todayDdmmyyyy();
    const uniquePhones = new Set<string>();
    let hojeCount = 0;
    const porTipo: Record<string, number> = {};
    for (const it of items) {
      if (it.patientPhone) uniquePhones.add(it.patientPhone.replace(/\D/g, ""));
      else uniquePhones.add(`name:${it.patientName.toLowerCase()}`);
      if (it.date === todayStr) hojeCount += 1;
      porTipo[it.eventName] = (porTipo[it.eventName] ?? 0) + 1;
    }
    const tipos = Object.entries(porTipo)
      .map(([tipo, count]) => ({ tipo, count }))
      .sort((a, b) => b.count - a.count);
    return { total: items.length, unicos: uniquePhones.size, hoje: hojeCount, tipos };
  }, [items]);

  return (
    <div className="space-y-6">
      {/* Filtros */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-4">
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Início</label>
          <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} className="w-44" />
        </div>
        <div>
          <label className="text-xs text-muted-foreground font-medium mb-1 block">Fim</label>
          <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} className="w-44" />
        </div>
        <Button onClick={() => refresh()} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar
        </Button>
        <Button variant="outline" onClick={setHoje} disabled={loading}>
          Hoje
        </Button>
        <p className="text-xs text-muted-foreground ml-auto">
          Unidade: Sua Visão – Padre Pedro Pinto · apenas consultas futuras
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Agendamentos no período"
          value={loading && items.length === 0 ? "—" : stats.total}
          subtitle="consultas futuras agendadas"
          icon={<CalendarPlus className="w-5 h-5 text-primary-foreground" />}
          accent="bg-primary"
        />
        <KpiCard
          title="Pacientes únicos"
          value={loading && items.length === 0 ? "—" : stats.unicos}
          subtitle="deduplicado por telefone"
          icon={<Users className="w-5 h-5 text-white" />}
          accent="bg-emerald-500"
        />
        <KpiCard
          title="Marcados para hoje"
          value={loading && items.length === 0 ? "—" : stats.hoje}
          subtitle={todayDdmmyyyy()}
          icon={<CalendarCheck className="w-5 h-5 text-white" />}
          accent="bg-amber-500"
        />
      </div>

      {/* Por tipo */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Por tipo de consulta</h2>
        {stats.tipos.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhum agendamento futuro no período selecionado.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {stats.tipos.map((t) => (
              <Card key={t.tipo} className="p-4 card-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Stethoscope className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate">{t.tipo}</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{t.count}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats.total > 0 ? `${Math.round((t.count / stats.total) * 100)}% do total` : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Tabela */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Lista de agendamentos</h2>
        <Card className="overflow-hidden card-shadow">
          <div className="overflow-x-auto scrollbar-visible">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr className="text-left text-xs uppercase text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Hora</th>
                  <th className="px-4 py-3 font-medium">Paciente</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Tipo</th>
                  <th className="px-4 py-3 font-medium">Médico</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && !loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      Sem agendamentos no período.
                    </td>
                  </tr>
                ) : (
                  items.map((it) => (
                    <tr key={it.id} className="border-t border-border hover:bg-muted/30">
                      <td className="px-4 py-3">{it.date}</td>
                      <td className="px-4 py-3">{it.time}</td>
                      <td className="px-4 py-3 font-medium text-foreground">{it.patientName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{it.patientPhone ?? "—"}</td>
                      <td className="px-4 py-3">{it.eventName}</td>
                      <td className="px-4 py-3 text-muted-foreground">{it.doctorName ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-xs">
                          {it.status || "—"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
