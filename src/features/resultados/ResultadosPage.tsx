import { Navigate, useNavigate, useParams } from "react-router-dom";
import { PageHeader } from "@/components/app/PageHeader";
import { DataState } from "@/components/data/DataState";
import { GoalSimulator } from "@/components/Dashboard/GoalSimulator";
import { IndicadoresTable } from "@/components/Dashboard/IndicadoresTable";
import { MetasCalculator } from "@/components/Dashboard/MetasCalculator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAcompanhamentoDiario } from "@/hooks/useAcompanhamentoDiario";
import { useLeads } from "@/hooks/useLeads";
import { useSchedules } from "@/hooks/useSchedules";

const resultSections = [
  { label: "Visão geral", slug: "visao-geral", title: "Visão geral dos resultados", description: "Acompanhe atendimentos, conversão, faturamento e distribuição por período." },
  { label: "Acompanhamento", slug: "acompanhamento", title: "Acompanhamento diário", description: "Registre o realizado diário e compare com as metas do período." },
  { label: "Metas", slug: "metas", title: "Metas", description: "Revise os parâmetros e veja como cada etapa compõe a meta calculada." },
  { label: "Planejamento", slug: "planejamento", title: "Planejamento", description: "Simule cenários de vendas e veja os volumes estimados sem alterar o realizado." },
] as const;

function ResultsOverview() {
  const { leads, isLoading, error, fetchLeads } = useLeads();
  if (isLoading && leads.length === 0) {
    return <DataState variant="loading" title="Carregando resultados" description="Consultando os leads registrados." />;
  }
  if (error && leads.length === 0) {
    return <DataState variant="error" title="Resultados indisponíveis" description={error} action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }} />;
  }

  return (
    <div className="space-y-4">
      {error && <DataState variant="error" title="Resultados desatualizados" description="Os dados carregados anteriormente continuam visíveis. A atualização dos leads falhou." action={{ label: "Tentar novamente", onClick: () => void fetchLeads() }} />}
      <IndicadoresTable leads={leads} />
    </div>
  );
}

const ignoreTrackingUpdate = async () => true;

function ResultsTracking({ scheduleState }: { scheduleState: ReturnType<typeof useSchedules> }) {
  const acompanhamento = useAcompanhamentoDiario();
  const sourceError = [scheduleState.error, acompanhamento.error].filter(Boolean).join(" ") || null;
  return (
    <MetasCalculator
      schedules={scheduleState.schedules}
      acompanhamentoRegistros={acompanhamento.registros}
      onUpdateAcompanhamento={acompanhamento.upsertRegistro}
      isSourceLoading={scheduleState.isLoading || acompanhamento.isLoading}
      sourceError={sourceError}
      onRetrySources={() => { void scheduleState.fetchSchedules(); void acompanhamento.fetchRegistros(); }}
      view="tracking"
    />
  );
}

function ResultsTargets({ view }: { view: "targets" | "tracking" }) {
  const scheduleState = useSchedules("Escala");
  if (view === "tracking") return <ResultsTracking scheduleState={scheduleState} />;

  return (
    <MetasCalculator
      schedules={scheduleState.schedules}
      acompanhamentoRegistros={[]}
      onUpdateAcompanhamento={ignoreTrackingUpdate}
      isSourceLoading={scheduleState.isLoading}
      sourceError={scheduleState.error}
      onRetrySources={() => void scheduleState.fetchSchedules()}
      view="targets"
    />
  );
}

export default function ResultadosPage() {
  const { section } = useParams();
  const navigate = useNavigate();
  const active = resultSections.find((item) => item.slug === section);
  if (!active) return <Navigate to="/resultados/visao-geral" replace />;

  return (
    <section className="space-y-5">
      <PageHeader title={active.title} description={active.description} />
      <Tabs value={active.slug} onValueChange={(value) => navigate(`/resultados/${value}`)}>
        <TabsList aria-label="Áreas de resultados" className="h-auto max-w-full flex-wrap justify-start">
          {resultSections.map((item) => <TabsTrigger key={item.slug} value={item.slug}>{item.label}</TabsTrigger>)}
        </TabsList>
        <TabsContent value="visao-geral">
          {active.slug === "visao-geral" && <ResultsOverview />}
        </TabsContent>
        <TabsContent value="acompanhamento">
          {active.slug === "acompanhamento" && <ResultsTargets view="tracking" />}
        </TabsContent>
        <TabsContent value="metas">
          {active.slug === "metas" && <ResultsTargets view="targets" />}
        </TabsContent>
        <TabsContent value="planejamento">
          {active.slug === "planejamento" && <GoalSimulator />}
        </TabsContent>
      </Tabs>
    </section>
  );
}
