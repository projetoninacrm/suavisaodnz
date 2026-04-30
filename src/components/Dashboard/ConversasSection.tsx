import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Target, RefreshCw, Loader2, Tag } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

interface ConversasResponse {
  recebidas: number;
  totalChats?: number;
  chatsComCliente?: number;
  abertos: number;
  encerrados: number;
  porCanal: Record<string, number>;
  porTag: Record<string, number>;
  semTag: number;
  origem: { meta: number; google: number; outro: number };
  periodo: { start: string; end: string };
}

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
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-muted-foreground font-medium">{title}</p>
      <p className="text-3xl font-bold text-foreground mt-1">{value}</p>
      {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
    </Card>
  );
}

export function ConversasSection() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const [start, setStart] = useState(fmt(firstDay));
  const [end, setEnd] = useState(fmt(today));
  const [data, setData] = useState<ConversasResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke("chatlabs-conversas", {
        method: "GET",
        body: undefined,
        headers: {},
        // pass via query string by appending to URL
      } as any);
      // supabase-js v2 não anexa query params, então usamos fetch direto:
      const projectId = (import.meta.env as any).VITE_SUPABASE_PROJECT_ID;
      const url = `https://${projectId}.supabase.co/functions/v1/chatlabs-conversas?start=${start}&end=${end}&includeTags=true`;
      const r = await fetch(url, {
        headers: {
          apikey: (import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${(import.meta.env as any).VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
      });
      const json = await r.json();
      if (!r.ok) throw new Error(json.error ?? "Erro ao buscar dados");
      setData(json);
    } catch (e: any) {
      setError(e?.message ?? "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tagsKanban = useMemo(() => {
    if (!data) return [] as Array<{ tag: string; count: number }>;
    const entries = Object.entries(data.porTag).map(([tag, count]) => ({ tag, count }));
    entries.sort((a, b) => b.count - a.count);
    if (data.semTag > 0) entries.push({ tag: "Sem status", count: data.semTag });
    return entries;
  }, [data]);

  const totalOrigem = (data?.origem.meta ?? 0) + (data?.origem.google ?? 0) + (data?.origem.outro ?? 0);

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
        <Button onClick={load} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Atualizar
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* KPI Conversas Recebidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KpiCard
          title="Conversas recebidas"
          value={loading && !data ? "—" : data?.recebidas ?? 0}
          subtitle={data ? `clientes únicos · ${data.totalChats ?? "?"} chats no total` : undefined}
          icon={<MessageCircle className="w-5 h-5 text-primary-foreground" />}
          accent="bg-primary"
        />
        <KpiCard
          title="Conversas abertas"
          value={loading && !data ? "—" : data?.abertos ?? 0}
          icon={<MessageCircle className="w-5 h-5 text-white" />}
          accent="bg-emerald-500"
        />
        <KpiCard
          title="Conversas encerradas"
          value={loading && !data ? "—" : data?.encerrados ?? 0}
          icon={<MessageCircle className="w-5 h-5 text-white" />}
          accent="bg-slate-500"
        />
      </div>

      {/* Linha extra: Status agregado */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Status</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Em andamento"
            value={loading && !data ? "—" : data?.abertos ?? 0}
            subtitle="Conversas ainda abertas no Chatlabs"
            icon={<Tag className="w-5 h-5 text-white" />}
            accent="bg-amber-500"
          />
          <KpiCard
            title="Concluídas"
            value={loading && !data ? "—" : data?.encerrados ?? 0}
            subtitle="Conversas finalizadas (closedAt)"
            icon={<Tag className="w-5 h-5 text-white" />}
            accent="bg-emerald-600"
          />
          <KpiCard
            title="Sem status"
            value={loading && !data ? "—" : data?.semTag ?? 0}
            subtitle="Clientes sem tag aplicada no período"
            icon={<Tag className="w-5 h-5 text-white" />}
            accent="bg-slate-500"
          />
        </div>
      </div>

      {/* Origem por tag */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Origem das conversas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Meta"
            value={data?.origem.meta ?? 0}
            subtitle={totalOrigem > 0 ? `${Math.round(((data?.origem.meta ?? 0) / totalOrigem) * 100)}% do total` : "via tag Meta/Facebook/Instagram"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-blue-600"
          />
          <KpiCard
            title="Google"
            value={data?.origem.google ?? 0}
            subtitle={totalOrigem > 0 ? `${Math.round(((data?.origem.google ?? 0) / totalOrigem) * 100)}% do total` : "via tag Google/Search"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-red-500"
          />
          <KpiCard
            title="Outro"
            value={data?.origem.outro ?? 0}
            subtitle={totalOrigem > 0 ? `${Math.round(((data?.origem.outro ?? 0) / totalOrigem) * 100)}% do total` : "Sem tag de origem"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-slate-500"
          />
        </div>
      </div>

      {/* Kanban dinâmico por status (tags) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-foreground">Status das conversas (por tag)</h2>
          <span className="text-xs text-muted-foreground">As colunas refletem as tags cadastradas no Chatlabs</span>
        </div>
        {tagsKanban.length === 0 ? (
          <Card className="p-6 text-center text-sm text-muted-foreground">
            Nenhuma tag aplicada nas conversas do período. Cadastre etiquetas no Chatlabs (ex: "Agendado",
            "Perdido", "Pendente", "Meta", "Google") e aplique-as para ver o Kanban aqui.
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tagsKanban.map((col) => (
              <Card key={col.tag} className="p-4 card-shadow">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground truncate">{col.tag}</span>
                </div>
                <p className="text-3xl font-bold text-foreground">{col.count}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {data && data.recebidas > 0
                    ? `${Math.round((col.count / data.recebidas) * 100)}% das conversas`
                    : ""}
                </p>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}