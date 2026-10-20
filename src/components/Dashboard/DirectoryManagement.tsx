import { useMemo, useRef, useState } from "react";
import { Loader2, Plus, UserRound, Stethoscope, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataState } from "@/components/data/DataState";
import { CatalogFilters } from "@/components/data/CatalogFilters";
import { useCatalogFilterState } from "@/hooks/useCatalogFilterState";
import { Label } from "@/components/ui/label";
import { useDirectory, type DirectoryPerson } from "@/hooks/useDirectory";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

function DirectoryCard({ title, icon: Icon, kind, roleOptions }: {
  title: string;
  icon: typeof UserRound;
  kind: "employees" | "professionals";
  roleOptions?: string[];
}) {
  const { people, isLoading, error, refresh, create, setActive } = useDirectory(kind);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roleOptions?.[0] || "Vendedor");
  const [createOpen, setCreateOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [updatingPersonId, setUpdatingPersonId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<DirectoryPerson | null>(null);
  const statusChangeReturnFocusRef = useRef<HTMLButtonElement>(null);
  const { query, status, setQuery, setStatus, clear: clearFilters } = useCatalogFilterState(`directory-${kind}-filters`);
  const filteredPeople = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return people.filter((person) => {
      const matchesQuery = !normalizedQuery || `${person.name} ${person.role || ""}`.toLocaleLowerCase("pt-BR").includes(normalizedQuery);
      const matchesStatus = status === "all" || person.is_active === (status === "active");
      return matchesQuery && matchesStatus;
    });
  }, [people, query, status]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isCreating || !name.trim()) return;
    setIsCreating(true);
    try {
      if (await create(name, role)) {
        setName("");
        setCreateOpen(false);
      }
    } finally {
      setIsCreating(false);
    }
  };

  const openStatusChange = (person: DirectoryPerson, event: React.MouseEvent<HTMLButtonElement>) => {
    if (updatingPersonId) return;
    statusChangeReturnFocusRef.current = event.currentTarget;
    setPendingStatusChange(person);
  };

  const confirmStatusChange = async () => {
    const person = pendingStatusChange;
    if (!person || updatingPersonId) return;
    setUpdatingPersonId(person.id);
    try {
      const updated = await setActive(person, !person.is_active);
      if (updated) setPendingStatusChange(null);
    } finally {
      setUpdatingPersonId(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex min-w-0 items-center gap-2 text-base"><Icon aria-hidden="true" className="size-4 shrink-0" />{title}</CardTitle>
        <Sheet open={createOpen} onOpenChange={(open) => { if (!isCreating) setCreateOpen(open); }}>
          <SheetTrigger render={<Button type="button" size="sm" className="shrink-0 gap-1.5"><Plus aria-hidden="true" className="size-4" />Cadastrar</Button>} />
          <SheetContent closeButtonDisabled={isCreating} aria-busy={isCreating} className="h-full w-full gap-0 overflow-y-auto p-5 sm:max-w-md">
            <SheetHeader className="mb-6 pr-12">
              <SheetTitle>Cadastrar {kind === "employees" ? "funcionário" : "profissional"}</SheetTitle>
              <SheetDescription>
                O cadastro ficará disponível nos seletores da plataforma. Inative a pessoa para preservar os vínculos históricos.
              </SheetDescription>
            </SheetHeader>
            <form
              className="grid gap-4"
              onSubmit={submit}
              aria-busy={isCreating}
            >
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${kind}-name`}>Nome completo</Label>
                <Input id={`${kind}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" disabled={isCreating} required />
              </div>
              {roleOptions && (
                <div className="space-y-1.5">
                  <Label htmlFor="employee-role">Cargo</Label>
                  <Select value={role} onValueChange={setRole} disabled={isCreating}>
                    <SelectTrigger id="employee-role" aria-label="Cargo do funcionário" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{roleOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <SheetFooter className="mt-2 gap-2 sm:space-x-0">
                <Button type="button" variant="outline" onClick={() => setCreateOpen(false)} disabled={isCreating}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!name.trim() || isCreating}>
                  {isCreating ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : <Plus className="mr-1 size-4" aria-hidden="true" />}
                  {isCreating ? "Cadastrando…" : "Cadastrar"}
                </Button>
                <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {isCreating ? `Cadastrando ${kind === "employees" ? "funcionário" : "profissional"}…` : ""}
                </span>
              </SheetFooter>
            </form>
          </SheetContent>
        </Sheet>
      </CardHeader>
      <CardContent className="space-y-4">
        <CatalogFilters
          idPrefix={`directory-${kind}`}
          query={query}
          onQueryChange={setQuery}
          searchLabel={`Buscar ${title.toLocaleLowerCase("pt-BR")}`}
          searchPlaceholder={kind === "employees" ? "Nome ou cargo..." : "Nome completo..."}
          status={status}
          onStatusChange={setStatus}
          statusLabel="Filtrar situação do cadastro"
          statusOptions={{ all: "Ativos e inativos", active: "Somente ativos", inactive: "Somente inativos" }}
        />
        {error && people.length > 0 && (
          <DataState variant="error" title="Atualização incompleta" description={error} action={{ label: "Tentar novamente", onClick: () => void refresh() }} />
        )}
        {isLoading && people.length === 0 ? (
          <DataState variant="loading" title="Carregando cadastros" />
        ) : error && people.length === 0 ? (
          <DataState
            variant="error"
            title="Lista indisponível"
            description={error}
            action={{ label: "Tentar novamente", onClick: () => void refresh() }}
          />
        ) : people.length === 0 ? (
          <DataState variant="empty" title="Nenhum cadastro encontrado" description="Cadastre a primeira pessoa para disponibilizá-la nos seletores." />
        ) : filteredPeople.length === 0 ? (
          <DataState
            variant="empty"
            title="Nenhum resultado para esses filtros"
            description="Ajuste a busca ou a situação selecionada."
            action={query || status !== "all" ? { label: "Limpar busca e situação", onClick: clearFilters } : undefined}
          />
        ) : (
          <>
            <p className="text-xs text-muted-foreground" aria-live="polite">
              {filteredPeople.length} {filteredPeople.length === 1 ? "cadastro" : "cadastros"}
            </p>
            <ul className="divide-y rounded-md border">
              {filteredPeople.map((person: DirectoryPerson) => (
                <li key={person.id} className="flex items-center justify-between gap-3 px-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{person.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {kind === "employees" ? person.role : "Profissional"}{!person.is_active ? " · Inativo" : ""}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={(event) => openStatusChange(person, event)} disabled={updatingPersonId !== null} aria-label={`${person.is_active ? "Inativar" : "Reativar"} ${person.name}`}>
                    {updatingPersonId === person.id ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : person.is_active ? <UserX className="mr-1 h-4 w-4" aria-hidden="true" /> : <UserCheck className="mr-1 h-4 w-4" aria-hidden="true" />}
                    {updatingPersonId === person.id ? "Salvando…" : person.is_active ? "Inativar" : "Reativar"}
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
      <AlertDialog
        open={pendingStatusChange !== null}
        onOpenChange={(open) => {
          if (!open && updatingPersonId === null) setPendingStatusChange(null);
        }}
      >
        <AlertDialogContent finalFocus={statusChangeReturnFocusRef}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingStatusChange?.is_active ? "Inativar cadastro?" : "Reativar cadastro?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingStatusChange?.is_active
                ? `${pendingStatusChange.name} deixará de aparecer nas novas seleções. Os registros e vínculos históricos serão preservados, e o cadastro poderá ser reativado depois.`
                : `${pendingStatusChange?.name} voltará a aparecer nas novas seleções. Os registros e vínculos históricos serão preservados.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updatingPersonId !== null}>Cancelar</AlertDialogCancel>
            <Button
              type="button"
              variant={pendingStatusChange?.is_active ? "destructive" : "default"}
              onClick={() => void confirmStatusChange()}
              disabled={!pendingStatusChange || updatingPersonId !== null}
              aria-busy={updatingPersonId !== null}
            >
              {updatingPersonId !== null && <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" />}
              {updatingPersonId !== null
                ? "Salvando…"
                : pendingStatusChange?.is_active
                  ? "Inativar cadastro"
                  : "Reativar cadastro"}
            </Button>
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {updatingPersonId !== null ? "Atualizando situação do cadastro…" : ""}
            </span>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
      <p className="text-xs text-muted-foreground">Inativar mantém os registros e vínculos históricos; a pessoa deixa de aparecer em novas seleções. Para substituir um nome ou cargo, inative o cadastro atual e crie outro; os vínculos antigos permanecem no cadastro original.</p>
    </section>
  );
}
