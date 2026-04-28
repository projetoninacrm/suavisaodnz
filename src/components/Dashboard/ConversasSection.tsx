import { MessageCircle, Target, Calendar, XCircle, Clock } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ConversasMetrics {
  recebidas: number;
  origem: { meta: number; google: number; outro: number };
  agendados: number;
  perdidos: number;
  pendentes: number;
}

const PLACEHOLDER: ConversasMetrics = {
  recebidas: 0,
  origem: { meta: 0, google: 0, outro: 0 },
  agendados: 0,
  perdidos: 0,
  pendentes: 0,
};

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
  const metrics = PLACEHOLDER;
  const totalOrigem = metrics.origem.meta + metrics.origem.google + metrics.origem.outro;

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-dashed border-border bg-muted/30 p-4">
        <p className="text-sm text-muted-foreground">
          <strong className="text-foreground">Aguardando integração com a API do CRM de conversas.</strong>{" "}
          Os indicadores abaixo serão preenchidos automaticamente assim que a API for conectada.
        </p>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Visão geral</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            title="Conversas recebidas"
            value={metrics.recebidas}
            icon={<MessageCircle className="w-5 h-5 text-primary-foreground" />}
            accent="bg-primary"
          />
          <KpiCard
            title="Agendados"
            value={metrics.agendados}
            subtitle={metrics.recebidas > 0 ? `${Math.round((metrics.agendados / metrics.recebidas) * 100)}% das conversas` : undefined}
            icon={<Calendar className="w-5 h-5 text-white" />}
            accent="bg-emerald-500"
          />
          <KpiCard
            title="Pendentes"
            value={metrics.pendentes}
            icon={<Clock className="w-5 h-5 text-white" />}
            accent="bg-amber-500"
          />
          <KpiCard
            title="Perdidos"
            value={metrics.perdidos}
            icon={<XCircle className="w-5 h-5 text-white" />}
            accent="bg-rose-500"
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold text-foreground mb-3">Origem das conversas</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Meta"
            value={metrics.origem.meta}
            subtitle={totalOrigem > 0 ? `${Math.round((metrics.origem.meta / totalOrigem) * 100)}% do total` : "Facebook / Instagram"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-blue-600"
          />
          <KpiCard
            title="Google"
            value={metrics.origem.google}
            subtitle={totalOrigem > 0 ? `${Math.round((metrics.origem.google / totalOrigem) * 100)}% do total` : "Search / Ads"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-red-500"
          />
          <KpiCard
            title="Outro"
            value={metrics.origem.outro}
            subtitle={totalOrigem > 0 ? `${Math.round((metrics.origem.outro / totalOrigem) * 100)}% do total` : "Indicação / Direto"}
            icon={<Target className="w-5 h-5 text-white" />}
            accent="bg-slate-500"
          />
        </div>
      </div>
    </div>
  );
}