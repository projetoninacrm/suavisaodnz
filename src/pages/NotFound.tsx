import { ArrowLeft, LayoutDashboard } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/app/ButtonLink";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();

  return (
    <main className="flex min-h-svh items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg border-border shadow-sm">
        <CardHeader className="space-y-4">
          <Badge variant="outline" className="w-fit">Erro 404</Badge>
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold leading-none tracking-tight">Página não encontrada</h1>
            <CardDescription>
              Esse endereço não corresponde a uma tela do Gerencia DNZ. Confira o link ou volte ao Comercial.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="break-all rounded-md bg-muted px-3 py-2 font-mono text-xs text-muted-foreground">
            {location.pathname}
          </p>
          <ButtonLink to="/comercial/leads" className="w-full gap-2 sm:w-auto">
            <LayoutDashboard className="size-4" aria-hidden="true" />
            Ir para Comercial
          </ButtonLink>
          <p className="text-xs text-muted-foreground">
            <ArrowLeft className="mr-1 inline size-3.5" aria-hidden="true" />
            Você também pode retornar à tela anterior pelo navegador.
          </p>
        </CardContent>
      </Card>
    </main>
  );
};

export default NotFound;
