import { useState } from "react";
import { Plus, UserRound, Stethoscope, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDirectory, type DirectoryPerson } from "@/hooks/useDirectory";
import { cn } from "@/lib/utils";

function DirectoryCard({ title, icon: Icon, kind, roleOptions }: {
  title: string;
  icon: typeof UserRound;
  kind: "employees" | "professionals";
  roleOptions?: string[];
}) {
  const { people, isLoading, create, setActive } = useDirectory(kind);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roleOptions?.[0] || "Vendedor");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (await create(name, role)) setName("");
  };

  return (
    <Card>
      <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2 text-base"><Icon className="h-4 w-4" />{title}</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <form className="flex flex-wrap gap-2" onSubmit={submit}>
          <Input aria-label={`Nome ${title.toLowerCase()}`} value={name} onChange={(event) => setName(event.target.value)} placeholder={`Nome do ${kind === "employees" ? "funcionário" : "profissional"}`} className="min-w-[180px] flex-1" />
          {roleOptions && <Select value={role} onValueChange={setRole}><SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger><SelectContent>{roleOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent></Select>}
          <Button type="submit" disabled={!name.trim()}><Plus className="mr-1 h-4 w-4" />Cadastrar</Button>
        </form>
        {isLoading ? <p className="text-sm text-muted-foreground">Carregando cadastros…</p> : people.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum cadastro encontrado.</p> : (
          <ul className="divide-y rounded-md border">
            {people.map((person: DirectoryPerson) => (
              <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2">
                <div className="min-w-0"><p className="truncate text-sm font-medium">{person.name}</p><p className="text-xs text-muted-foreground">{kind === "employees" ? person.role : "Profissional"}{!person.is_active ? " · Inativo" : ""}</p></div>
                <Button type="button" variant="ghost" size="sm" onClick={() => void setActive(person, !person.is_active)} aria-label={`${person.is_active ? "Inativar" : "Reativar"} ${person.name}`}>
                  {person.is_active ? <><UserX className="mr-1 h-4 w-4" />Inativar</> : <><UserCheck className="mr-1 h-4 w-4" />Reativar</>}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

export function DirectoryManagement({ kind = "all" }: { kind?: "all" | "employees" | "professionals" }) {
  const showEmployees = kind === "all" || kind === "employees";
  const showProfessionals = kind === "all" || kind === "professionals";

  return (
    <section className="space-y-4">
      <div className={cn("grid gap-4", showEmployees && showProfessionals && "lg:grid-cols-2")}>
        {showEmployees && <DirectoryCard title="Funcionários" icon={UserRound} kind="employees" roleOptions={["Vendedor", "Gerente", "Operação"]} />}
        {showProfessionals && <DirectoryCard title="Profissionais" icon={Stethoscope} kind="professionals" roleOptions={undefined} />}
      </div>
      <p className="text-xs text-muted-foreground">Inativar mantém os registros e vínculos históricos; a pessoa deixa de aparecer em novas seleções.</p>
    </section>
  );
}
