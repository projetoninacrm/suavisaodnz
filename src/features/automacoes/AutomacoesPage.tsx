import { PageHeader } from "@/components/app/PageHeader";
import { AutomacoesTable } from "@/components/Dashboard/AutomacoesTable";
import { useParams } from "react-router-dom";

export default function AutomacoesPage() {
  const { automationId } = useParams();
  const isDetailView = Boolean(automationId);

  return (
    <section className="space-y-5">
      <PageHeader
        title={isDetailView ? "Detalhe da automação" : "Automações"}
        description={isDetailView
          ? "Consulte a fila, os envios e o relatório desta automação."
          : "Gerencie as regras, consulte os envios e revise as observações geradas pela IA."}
      />
      <AutomacoesTable automationId={automationId} />
    </section>
  );
}
