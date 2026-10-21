import { useMemo, useRef, useState } from "react";
import { Loader2, Pencil, Plus, Save, UserRound, Stethoscope, UserCheck, UserX } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function DirectoryCard({ title, icon: Icon, kind, roleOptions }: {
  title: string;
  icon: typeof UserRound;
  kind: "employees" | "professionals";
  roleOptions?: string[];
}) {
  const { people, isLoading, error, refresh, create, updateDetails, setActive } = useDirectory(kind);
  const [name, setName] = useState("");
  const [role, setRole] = useState(roleOptions?.[0] || "Vendedor");
  const [formOpen, setFormOpen] = useState(false);
  const [editingPerson, setEditingPerson] = useState<DirectoryPerson | null>(null);
  const [isSavingDetails, setIsSavingDetails] = useState(false);
  const [updatingPersonId, setUpdatingPersonId] = useState<string | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState<DirectoryPerson | null>(null);
  const formReturnFocusRef = useRef<HTMLButtonElement>(null);
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
    if (isSavingDetails || !name.trim()) return;
    setIsSavingDetails(true);
    try {
      const saved = editingPerson
        ? await updateDetails(editingPerson, name, role)
        : await create(name, role);
      if (saved) {
        setName("");
        setEditingPerson(null);
        setFormOpen(false);
      }
    } finally {
      setIsSavingDetails(false);
    }
  };

  const prepareCreate = (event: React.MouseEvent<HTMLButtonElement>) => {
    formReturnFocusRef.current = event.currentTarget;
    setFormOpen(true);
    setEditingPerson(null);
    setName("");
    setRole(roleOptions?.[0] || "Vendedor");
  };

  const openEdit = (person: DirectoryPerson, event: React.MouseEvent<HTMLButtonElement>) => {
    formReturnFocusRef.current = event.currentTarget;
    if (kind !== "employees" || isSavingDetails) return;
    setEditingPerson(person);
    setName(person.name);
    setRole(person.role || roleOptions?.[0] || "Vendedor");
    setFormOpen(true);
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
        <Dialog open={formOpen} onOpenChange={(open) => { if (!isSavingDetails) setFormOpen(open); }}>
          <Button type="button" size="sm" className="shrink-0 gap-1.5" onClick={prepareCreate}><Plus aria-hidden="true" className="size-4" />Cadastrar</Button>
          <DialogContent finalFocus={formReturnFocusRef} closeButtonDisabled={isSavingDetails} aria-busy={isSavingDetails} className="max-w-md gap-5 rounded-xl p-6">
            <DialogHeader className="pr-6 text-left">
              <DialogTitle>{editingPerson ? "Editar funcionário" : "Cadastrar " + (kind === "employees" ? "funcionário" : "profissional")}</DialogTitle>
              <DialogDescription>
                {editingPerson
                  ? "Atualize o nome e o cargo do funcionário."
                  : "O cadastro ficará disponível nos seletores da plataforma."}
              </DialogDescription>
            </DialogHeader>
            <form
              className="grid gap-4"
              onSubmit={submit}
              aria-busy={isSavingDetails}
            >
              <div className="min-w-0 space-y-1.5">
                <Label htmlFor={`${kind}-name`}>Nome completo</Label>
                <Input id={`${kind}-name`} value={name} onChange={(event) => setName(event.target.value)} placeholder="Nome completo" disabled={isSavingDetails} required />
              </div>
              {roleOptions && (
                <div className="space-y-1.5">
                  <Label htmlFor="employee-role">Cargo</Label>
                  <Select value={role} onValueChange={setRole} disabled={isSavingDetails}>
                    <SelectTrigger id="employee-role" aria-label="Cargo do funcionário" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>{roleOptions.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              )}
              <DialogFooter className="mt-2 gap-2 sm:space-x-0">
                <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={isSavingDetails}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={!name.trim() || isSavingDetails}>
                  {isSavingDetails ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : editingPerson ? <Save className="mr-1 size-4" aria-hidden="true" /> : <Plus className="mr-1 size-4" aria-hidden="true" />}
                  {isSavingDetails ? (editingPerson ? "Salvando…" : "Cadastrando…") : (editingPerson ? "Salvar alterações" : "Cadastrar")}
                </Button>
                <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
                  {isSavingDetails ? (editingPerson ? "Salvando alterações do funcionário…" : "Cadastrando " + (kind === "employees" ? "funcionário" : "profissional") + "…") : ""}
                </span>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
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
                  <div className="flex shrink-0 items-center gap-1">
                    {kind === "employees" && (
                      <Button type="button" variant="ghost" size="sm" className="h-8 gap-1 px-2" onClick={(event) => openEdit(person, event)} disabled={updatingPersonId !== null || isSavingDetails} aria-label={"Editar funcionário " + person.name}>
                        <Pencil aria-hidden="true" className="size-4" />Editar
                      </Button>
                    )}
                    <Button type="button" variant="ghost" size="sm" onClick={(event) => openStatusChange(person, event)} disabled={updatingPersonId !== null || isSavingDetails} aria-label={(person.is_active ? "Inativar " : "Reativar ") + person.name}>
                      {updatingPersonId === person.id ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : person.is_active ? <UserX className="mr-1 h-4 w-4" aria-hidden="true" /> : <UserCheck className="mr-1 h-4 w-4" aria-hidden="true" />}
                      {updatingPersonId === person.id ? "Salvando…" : person.is_active ? "Inativar" : "Reativar"}
                    </Button>
                  </div>
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
      <p className="text-xs text-muted-foreground">
        {kind === "professionals"
          ? "Inative alguém para remover das novas seleções; os vínculos históricos permanecem."
          : "Edite o nome ou cargo para corrigir um funcionário sem perder vínculos. Inative alguém para remover das novas seleções; os vínculos históricos permanecem."}
      </p>
    </section>
  );
}
