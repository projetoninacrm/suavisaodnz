import { useMemo, useState } from "react";
import { Check, Loader2, Pencil, Plus, UserCheck, UserX, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataState } from "@/components/data/DataState";
import { CatalogFilters } from "@/components/data/CatalogFilters";
import { useCatalogFilterState } from "@/hooks/useCatalogFilterState";
import { useCategories, type CategoryCatalogItem, type CategoryDomain } from "@/hooks/useCategories";
import { useRouteState } from "@/hooks/useRouteState";

const DOMAINS: { value: CategoryDomain; label: string; title: string; description: string }[] = [
  { value: "lead_channel", label: "Canal do lead", title: "Canais de lead", description: "Origens usadas ao cadastrar e filtrar leads comerciais." },
  { value: "service_origin", label: "Origem do atendimento", title: "Origens de atendimento", description: "Valores de como o cliente conheceu a loja, usados em Atendimentos vindos do Amigo." },
];

function isCategoryDomain(value: unknown): value is CategoryDomain {
  return DOMAINS.some((domain) => domain.value === value);
}

function parseCategoryDomain(value: unknown): CategoryDomain {
  return isCategoryDomain(value) ? value : DOMAINS[0].value;
}

function CategoryList({ domain, title, description, categories, isLoading, error, refresh, create, update, setActive }: {
  domain: CategoryDomain;
  title: string;
  description: string;
  categories: CategoryCatalogItem[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<boolean>;
  create: (input: { domain: CategoryDomain; label: string; aliases: string[] }) => Promise<boolean>;
  update: (id: string, input: { label: string; aliases: string[]; sort_order: number }) => Promise<boolean>;
  setActive: (category: CategoryCatalogItem, isActive: boolean) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState<CategoryCatalogItem | null>(null);
  const [label, setLabel] = useState("");
  const [aliases, setAliases] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [updatingCategoryId, setUpdatingCategoryId] = useState<string | null>(null);
  const catalogUnavailable = error !== null && categories.length === 0;
  const { query, status, setQuery, setStatus, clear: clearFilters } = useCatalogFilterState(`category-${domain}-filters`);
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
    return categories.filter((category) => {
      const matchesQuery = !normalizedQuery || [category.label, ...category.aliases].some((value) => value.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
      const matchesStatus = status === "all" || category.is_active === (status === "active");
      return category.domain === domain && matchesQuery && matchesStatus;
    });
  }, [categories, domain, query, status]);

  const resetForm = () => { setEditing(null); setLabel(""); setAliases(""); };
  const startEdit = (category: CategoryCatalogItem) => {
    setEditing(category);
    setLabel(category.label);
    setAliases(category.aliases.join("\n"));
  };
  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (isSaving || !label.trim()) return;
    setIsSaving(true);
    try {
      const aliasList = aliases.split("\n").map((value) => value.trim()).filter(Boolean);
      const saved = editing
        ? await update(editing.id, { label, aliases: aliasList, sort_order: editing.sort_order })
        : await create({ domain, label, aliases: aliasList });
      if (saved) resetForm();
    } finally {
      setIsSaving(false);
    }
  };
  const toggleActive = async (category: CategoryCatalogItem) => {
    if (updatingCategoryId) return;
    setUpdatingCategoryId(category.id);
    try {
      await setActive(category, !category.is_active);
    } finally {
      setUpdatingCategoryId(null);
    }
  };

  return (
    <section className="space-y-4" aria-labelledby={`${domain}-heading`}>
      <div>
        <h2 id={`${domain}-heading`} className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <Card>
        <CardHeader className="pb-3"><CardTitle className="text-base">{editing ? "Editar categoria" : "Nova categoria"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(220px,1fr)_minmax(220px,1fr)_auto] lg:items-end" aria-busy={isSaving} aria-describedby={catalogUnavailable ? `${domain}-catalog-unavailable` : undefined}>
            <div className="space-y-2">
              <Label htmlFor={`${domain}-label`}>Nome exibido</Label>
              <Input id={`${domain}-label`} value={label} onChange={(event) => setLabel(event.target.value)} placeholder="Ex.: Indicação" maxLength={100} required disabled={isSaving || catalogUnavailable} />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`${domain}-aliases`}>Variações reconhecidas</Label>
              <Textarea id={`${domain}-aliases`} value={aliases} onChange={(event) => setAliases(event.target.value)} placeholder={"Uma variação por linha\nEx.: Indicacao"} rows={2} disabled={isSaving || catalogUnavailable} />
            </div>
            <div className="flex gap-2 md:col-span-2 md:justify-self-end lg:col-span-1 lg:justify-self-start">
              <Button type="submit" disabled={!label.trim() || isSaving || updatingCategoryId !== null || catalogUnavailable}>
                {isSaving ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : <Check className="mr-1 size-4" aria-hidden="true" />}
                {isSaving ? "Salvando…" : editing ? "Salvar" : "Cadastrar"}
              </Button>
              {editing && <Button type="button" variant="outline" onClick={resetForm} aria-label="Cancelar edição" disabled={isSaving}><X className="size-4" /></Button>}
            </div>
            <span className="sr-only" role="status" aria-live="polite" aria-atomic="true">
              {isSaving ? `${editing ? "Salvando" : "Cadastrando"} categoria…` : ""}
            </span>
          </form>
          {catalogUnavailable && <p id={`${domain}-catalog-unavailable`} role="status" className="mt-3 text-sm text-muted-foreground">O formulário será liberado quando o catálogo estiver disponível. Atualize a lista abaixo para tentar novamente.</p>}
          <p className="mt-2 text-xs text-muted-foreground">Variações ligam grafias conhecidas à categoria, sem alterar os registros históricos.</p>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 p-4">
          <CatalogFilters
            idPrefix={`categories-${domain}`}
            query={query}
            onQueryChange={setQuery}
            searchLabel={`Buscar ${title.toLocaleLowerCase("pt-BR")}`}
            searchPlaceholder="Buscar nome ou variação..."
            status={status}
            onStatusChange={setStatus}
            statusLabel="Filtrar situação"
            statusOptions={{ all: "Ativas e inativas", active: "Somente ativas", inactive: "Somente inativas" }}
          />
          {error && categories.length > 0 && <DataState variant="error" title="Atualização incompleta" description={error} action={{ label: "Tentar novamente", onClick: () => void refresh() }} />}
          {isLoading && categories.length === 0 ? <DataState variant="loading" title="Carregando categorias" />
            : error && categories.length === 0 ? <DataState variant="error" title="Catálogo indisponível" description={error} action={{ label: "Tentar novamente", onClick: () => void refresh() }} />
                : items.length === 0 ? <DataState variant="empty" title="Nenhuma categoria encontrada" description={query || status !== "all" ? "Ajuste a busca ou a situação selecionada." : "Cadastre a primeira categoria para disponibilizá-la nos seletores."} action={query || status !== "all" ? { label: "Limpar busca e situação", onClick: clearFilters } : undefined} />
                : <ul className="divide-y rounded-md border">
                  {items.map((category) => (
                    <li key={category.id} className="flex flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2"><span className="font-medium">{category.label}</span><Badge variant={category.is_active ? "secondary" : "outline"}>{category.is_active ? "Ativa" : "Inativa"}</Badge></div>
                        {category.aliases.length > 0 && <p className="text-sm text-muted-foreground">Variações: {category.aliases.join(", ")}</p>}
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button type="button" variant="outline" size="sm" onClick={() => startEdit(category)} disabled={isSaving || updatingCategoryId !== null}><Pencil className="mr-1 size-4" />Editar</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => void toggleActive(category)} disabled={isSaving || updatingCategoryId !== null} aria-label={`${category.is_active ? "Inativar" : "Reativar"} ${category.label}`}>
                          {updatingCategoryId === category.id ? <Loader2 className="mr-1 size-4 animate-spin" aria-hidden="true" /> : category.is_active ? <UserX className="mr-1 size-4" aria-hidden="true" /> : <UserCheck className="mr-1 size-4" aria-hidden="true" />}
                          {updatingCategoryId === category.id ? "Salvando…" : category.is_active ? "Inativar" : "Reativar"}
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>}
        </CardContent>
      </Card>
    </section>
  );
}

export function CategoryManagement() {
  const { categories, isLoading, error, refresh, create, update, setActive } = useCategories();
  const [activeDomain, setActiveDomain] = useRouteState<CategoryDomain>("activeCategoryDomain", () => DOMAINS[0].value, parseCategoryDomain);
  return (
    <Tabs value={activeDomain} onValueChange={(value) => { if (isCategoryDomain(value)) setActiveDomain(value); }} className="space-y-5">
      <TabsList aria-label="Domínio das categorias" className="h-auto max-w-full flex-wrap justify-start">
        {DOMAINS.map(({ value, label }) => <TabsTrigger key={value} value={value}>{label}</TabsTrigger>)}
      </TabsList>
      {DOMAINS.map(({ value, title, description }) => (
        <TabsContent key={value} value={value}>
          <CategoryList domain={value} title={title} description={description} categories={categories} isLoading={isLoading} error={error} refresh={refresh} create={create} update={update} setActive={setActive} />
        </TabsContent>
      ))}
    </Tabs>
  );
}
