import { format } from "date-fns";
import { PageHeader } from "@/components/app/PageHeader";
import { DetalhadoAmigoTable } from "@/components/Dashboard/DetalhadoAmigoTable";
import { useDetalhadoAmigo } from "@/hooks/useDetalhadoAmigo";
import { useGenericTable } from "@/hooks/useGenericTable";
import { useLeads } from "@/hooks/useLeads";

export default function AtendimentosPage() {
  const amigo = useDetalhadoAmigo();
  const details = useGenericTable("detalhado");
  const { addLead } = useLeads();

  const addPatientToCommercial = async ({ nome, numero }: { nome: string; numero: string }) => {
    await addLead({
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
      <DetalhadoAmigoTable
        attendances={amigo.attendances}
        isLoading={amigo.isLoading}
        dateRange={amigo.dateRange}
        onDateRangeChange={amigo.updateDateRange}
        onRefresh={amigo.refresh}
        dbRecords={details.records}
        onUpdateDb={details.updateRecord}
        onCreateDb={details.createRecord}
        onDeleteDb={details.deleteRecord}
        onRefreshDb={details.fetchRecords}
        onAddToLeads={addPatientToCommercial}
      />
    </section>
  );
}
