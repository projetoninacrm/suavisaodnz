import { PageHeader } from "@/components/app/PageHeader";
import { AutomacoesTable } from "@/components/Dashboard/AutomacoesTable";

export default function AutomacoesPage() {
  return (
    <section className="space-y-5">
      <PageHeader
        title="Automações"
        description="Gerencie as regras, consulte os envios e revise as observações geradas pela IA."
      />
      <AutomacoesTable />
    </section>
  );
}
