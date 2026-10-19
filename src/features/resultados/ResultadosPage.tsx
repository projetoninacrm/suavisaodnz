import { Navigate, NavLink, useParams } from "react-router-dom";
import { PageHeader } from "@/components/app/PageHeader";
import { GoalSimulator } from "@/components/Dashboard/GoalSimulator";
import { IndicadoresTable } from "@/components/Dashboard/IndicadoresTable";
import { MetasCalculator } from "@/components/Dashboard/MetasCalculator";
import { useAcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { useLeads } from "@/hooks/useLeads";
import { useSchedules } from "@/hooks/useSchedules";
import { cn } from "@/lib/utils";

const resultSections = [
  { label: "Visão geral", slug: "visao-geral", title: "Visão geral dos resultados", description: "Acompanhe atendimentos, conversão, faturamento e distribuição por período." },
  { label: "Acompanhamento", slug: "acompanhamento", title: "Acompanhamento diário", description: "Registre o realizado diário e compare com as metas do período." },
  { label: "Metas", slug: "metas", title: "Metas", description: "Revise os parâmetros e veja como cada etapa compõe a meta calculada." },
  { label: "Planejamento", slug: "planejamento", title: "Planejamento", description: "Simule cenários de vendas e veja os volumes estimados sem alterar o realizado." },
] as const;

function ResultsOverview() {
  const { leads } = useLeads();
  return <IndicadoresTable leads={leads} showSimulator={false} />;
}

function ResultsTargets({ view }: { view: "targets" | "tracking" }) {
  const { schedules } = useSchedules("Escala");
  const acompanhamento = useAcompanhamentoDiario();
  return (
    <MetasCalculator
      schedules={schedules}
      acompanhamentoRegistros={acompanhamento.registros}
      onUpdateAcompanhamento={acompanhamento.upsertRegistro}
      view={view}
    />
  );
}

export default function ResultadosPage() {
  const { section } = useParams();
  const active = resultSections.find((item) => item.slug === section);
  if (!active) return <Navigate to="/resultados/visao-geral" replace />;

  return (
    <section className="space-y-5">
      <PageHeader title={active.title} description={active.description} />
      <nav aria-label="Áreas de resultados" className="flex gap-1 overflow-x-auto border-b border-border pb-2">
        {resultSections.map((item) => (
          <NavLink
            key={item.slug}
            to={`/resultados/${item.slug}`}
            className={({ isActive }) => cn(
              "whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      {active.slug === "visao-geral" && <ResultsOverview />}
      {active.slug === "acompanhamento" && <ResultsTargets view="tracking" />}
      {active.slug === "metas" && <ResultsTargets view="targets" />}
      {active.slug === "planejamento" && <GoalSimulator />}
    </section>
  );
}
