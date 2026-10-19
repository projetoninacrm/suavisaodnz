import { CircleAlert, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/app/PageHeader";

export default function MarketingPage() {
  return (
    <section className="space-y-5">
      <PageHeader
        title="Marketing"
        description="Acompanhe campanhas da Meta quando a conta de anúncios estiver conectada."
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex flex-wrap items-center gap-2 text-base">
            <Megaphone className="size-4 text-primary" />
            Dados da Meta
            <Badge variant="outline" className="ml-auto">Desconectado</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 rounded-md border border-border bg-muted/40 p-4">
            <CircleAlert className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Integração da Meta ainda não configurada</p>
              <p className="text-sm text-muted-foreground">
                Não há dados de campanhas disponíveis nesta versão. A tela manual foi retirada da operação; nenhum indicador será preenchido até a conexão e a permissão de leitura estarem prontas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
}
