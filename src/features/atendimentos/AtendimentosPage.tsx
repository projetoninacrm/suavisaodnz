import { format } from "date-fns";
import { PageHeader } from "@/components/app/PageHeader";
import { DataState } from "@/components/data/DataState";
import { DetalhadoAmigoTable } from "@/components/Dashboard/DetalhadoAmigoTable";
import { useDetalhadoAmigo } from "@/hooks/useDetalhadoAmigo";
import { useGenericTable } from "@/hooks/useGenericTable";
import { useCreateLead } from "@/hooks/useLeads";

export default function AtendimentosPage() {
  const amigo = useDetalhadoAmigo();
  const details = useGenericTable("detalhado");
  const { createLead } = useCreateLead();
  const loadedRangeLabel = amigo.loadedDateRange
    ? `${format(amigo.loadedDateRange.start, "dd/MM/yyyy")} a ${format(amigo.loadedDateRange.end, "dd/MM/yyyy")}`
    : null;
  const sourceError = amigo.error && !amigo.isLoadedRangeCurrent
    ? `${amigo.error}${loadedRangeLabel ? ` Última consulta válida: ${loadedRangeLabel}.` : ""}`
    : null;

  const addPatientToCommercial = async ({ nome, numero }: { nome: string; numero: string }) => {
    await createLead({
      data_registro: format(new Date(), "dd/MM/yyyy"),
      canal: "",
      nome,
      numero,
      orcamento: "Não",
      venda: "Não",
      entrar_em_contato: "",
      medico: "",
      obs: "",
    });
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title="Atendimentos"
        description="Consulte os atendimentos concluídos do Amigo e registre os complementos comerciais da loja."
      />
      {amigo.error && amigo.isLoadedRangeCurrent && (
        <DataState
          variant="error"
          title="Atendimentos não atualizados"
          description={`${amigo.error} A última resposta válida deste período permanece disponível.`}
          action={{ label: "Tentar novamente", onClick: () => void amigo.refresh() }}
        />
      )}
      {amigo.isLoading && loadedRangeLabel && !amigo.isLoadedRangeCurrent && (
        <DataState
          variant="refreshing"
          title="Consultando o novo período"
          description={`A última resposta válida (${loadedRangeLabel}) continua preservada.`}
        />
      )}
      {amigo.isLoading && !amigo.loadedDateRange ? (
        <DataState
          variant="loading"
          title="Carregando atendimentos"
          description="Consultando o período selecionado no Amigo."
        />
      ) : amigo.error && !amigo.loadedDateRange ? (
          <DataState
            variant="error"
            title="Atendimentos indisponíveis"
            description={amigo.error}
            action={{ label: "Tentar novamente", onClick: () => void amigo.refresh() }}
          />
      ) : (
        <DetalhadoAmigoTable
          attendances={amigo.isLoadedRangeCurrent ? amigo.attendances : []}
          sourceError={sourceError}
          isLoading={amigo.isLoading}
          dateRange={amigo.dateRange}
          onDateRangeChange={amigo.updateDateRange}
          onRefresh={amigo.refresh}
          dbRecords={details.records}
          isDbLoading={details.isLoading}
          dbError={details.error}
          onUpdateDb={details.updateRecord}
          onCreateDb={details.createRecord}
          onDeleteDb={details.deleteRecord}
          onRefreshDb={details.fetchRecords}
          onAddToLeads={addPatientToCommercial}
        />
      )}
    </section>
  );
}
