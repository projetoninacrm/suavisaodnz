import { Button } from "@/components/ui/button";
import type { DirectoryPerson } from "@/hooks/useDirectory";
import { Link } from "react-router-dom";

interface PersonDirectoryHintProps {
  title: string;
  kind: "funcionário" | "profissional";
  path: string;
  people: DirectoryPerson[];
  isLoading: boolean;
  error: string | null;
  onRetry: () => void | Promise<unknown>;
}

export function PersonDirectoryHint({
  title,
  kind,
  path,
  people,
  isLoading,
  error,
  onRetry,
}: PersonDirectoryHintProps) {
  const hasActive = people.some((person) => person.is_active);

  if (isLoading) {
    return (
      <p role="status" className="text-xs text-muted-foreground">
        {people.length > 0 ? `Atualizando lista de ${title.toLocaleLowerCase("pt-BR")}…` : `Carregando ${title.toLocaleLowerCase("pt-BR")}…`}
      </p>
    );
  }

  if (!error && hasActive) return null;

  const message = error
    ? hasActive
      ? `A lista de ${title.toLocaleLowerCase("pt-BR")} não foi atualizada; os cadastros carregados continuam disponíveis.`
      : `Não foi possível carregar a lista de ${title.toLocaleLowerCase("pt-BR")}.`
    : `Nenhum ${kind} ativo cadastrado. Cadastros históricos ficam preservados; cadastre ou reative um para novas atribuições.`;

  return (
    <div role="status" className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <span>{message}</span>
      {!hasActive ? (
        <>
          <Link to={path} target="_blank" rel="noreferrer" className="font-medium text-primary underline underline-offset-2">
            Abrir Cadastros → {title} (nova aba)
          </Link>
          <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void onRetry()}>
            Atualizar opções
          </Button>
        </>
      ) : (
        <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => void onRetry()}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
