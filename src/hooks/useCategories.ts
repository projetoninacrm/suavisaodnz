import { useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type CategoryDomain = "lead_channel" | "service_origin";
const CATEGORY_CATALOG_QUERY_KEY = ["category-catalog"] as const;

// Compatibility choices used only if the category migration is unavailable.
export const DEFAULT_LEAD_CHANNELS = ["Internet", "Sua Visão", "Loja", "Du Benefícios", "Indique e Ganhe"] as const;

export interface CategoryCatalogItem {
  id: string;
  domain: CategoryDomain;
  label: string;
  aliases: string[];
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function normalizeCategoryValue(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("pt-BR");
}

export function categoryMatchesValue(category: CategoryCatalogItem, value: string | null | undefined) {
  if (!value) return false;
  const normalizedValue = normalizeCategoryValue(value);
  return [category.label, ...category.aliases].some((candidate) => normalizeCategoryValue(candidate) === normalizedValue);
}

function prepareAliases(label: string, aliases: string[]) {
  const normalizedLabel = normalizeCategoryValue(label);
  const seen = new Set<string>([normalizedLabel]);
  return aliases
    .map((alias) => alias.trim().replace(/\s+/g, " "))
    .filter((alias) => {
      if (!alias) return false;
      const normalized = normalizeCategoryValue(alias);
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });
}

function conflictsWithCatalog(domain: CategoryDomain, label: string, aliases: string[], categories: CategoryCatalogItem[], exceptId?: string) {
  const proposedTerms = [label, ...aliases].map(normalizeCategoryValue);
  return categories.some((category) => {
    if (category.domain !== domain) return false;
    if (category.id === exceptId) return false;
    return [category.label, ...category.aliases].some((term) => proposedTerms.includes(normalizeCategoryValue(term)));
  });
}

export function useCategories(domain?: CategoryDomain, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const { toast } = useToast();
  const {
    data: allCategories = [],
    isFetching,
    isError,
    refetch,
  } = useQuery<CategoryCatalogItem[], Error>({
    queryKey: CATEGORY_CATALOG_QUERY_KEY,
    enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("category_catalog")
        .select("*")
        .order("sort_order")
        .order("label");

      if (error) throw error;
      return (data || []) as CategoryCatalogItem[];
    },
    staleTime: 30_000,
    retry: false,
  });
  const categories = useMemo(
    () => domain ? allCategories.filter((category) => category.domain === domain) : allCategories,
    [allCategories, domain],
  );
  const error = isError ? "Não foi possível carregar as categorias. Se o problema continuar, avise a pessoa administradora da plataforma." : null;

  const refresh = useCallback(async (): Promise<boolean> => {
    const result = await refetch();
    return !result.isError;
  }, [refetch]);

  const create = useCallback(async (input: { domain: CategoryDomain; label: string; aliases: string[] }) => {
    const label = input.label.trim().replace(/\s+/g, " ");
    const aliases = prepareAliases(label, input.aliases);
    if (!label) return false;
    if (conflictsWithCatalog(input.domain, label, aliases, allCategories)) {
      toast({ title: "Termo já cadastrado", description: "Revise os nomes e aliases neste domínio antes de salvar.", variant: "destructive" });
      return false;
    }

    try {
      const result = await supabase.from("category_catalog").insert({
        domain: input.domain,
        label,
        aliases,
        sort_order: allCategories.filter((item) => item.domain === input.domain).length * 10 + 10,
      });
      if (result.error) {
        if (result.error.code !== "23505") void refresh();
        toast({
          title: result.error.code === "23505" ? "Categoria já existente" : "Não foi possível confirmar a categoria",
          description: result.error.code === "23505"
            ? "Já existe uma categoria com esse nome neste domínio."
            : "A lista será atualizada. Confira se a categoria apareceu antes de tentar novamente.",
          variant: "destructive",
        });
        return false;
      }

      const listUpdated = await refresh();
      toast({
        title: "Categoria cadastrada",
        description: listUpdated ? `${label} já pode ser selecionada.` : "A categoria foi salva; atualize a lista para exibi-la.",
      });
      return true;
    } catch (cause) {
      console.error("Could not confirm category creation:", cause);
      void refresh();
      toast({
        title: "Não foi possível confirmar a categoria",
        description: "A lista será atualizada. Confira se a categoria apareceu antes de tentar novamente.",
        variant: "destructive",
      });
      return false;
    }
  }, [allCategories, refresh, toast]);

  const update = useCallback(async (id: string, input: { label: string; aliases: string[]; sort_order: number }) => {
    const label = input.label.trim().replace(/\s+/g, " ");
    const aliases = prepareAliases(label, input.aliases);
    const current = allCategories.find((item) => item.id === id);
    if (!current || !label) return false;
    if (conflictsWithCatalog(current.domain, label, aliases, allCategories, id)) {
      toast({ title: "Termo já cadastrado", description: "Revise os nomes e aliases neste domínio antes de salvar.", variant: "destructive" });
      return false;
    }

    try {
      const { error: updateError } = await supabase.from("category_catalog").update({ label, aliases, sort_order: input.sort_order }).eq("id", id);
      if (updateError) {
        if (updateError.code !== "23505") void refresh();
        toast({
          title: updateError.code === "23505" ? "Categoria já existente" : "Não foi possível confirmar a atualização",
          description: updateError.code === "23505"
            ? "Já existe uma categoria com esse nome neste domínio."
            : "A lista será atualizada para conferir as alterações antes de repetir.",
          variant: "destructive",
        });
        return false;
      }

      const listUpdated = await refresh();
      toast({
        title: "Categoria atualizada",
        description: listUpdated ? label : "A categoria foi salva; atualize a lista para conferir as alterações.",
      });
      return true;
    } catch (cause) {
      console.error("Could not confirm category update:", cause);
      void refresh();
      toast({
        title: "Não foi possível confirmar a atualização",
        description: "A lista será atualizada para conferir as alterações antes de repetir.",
        variant: "destructive",
      });
      return false;
    }
  }, [allCategories, refresh, toast]);

  const setActive = useCallback(async (category: CategoryCatalogItem, isActive: boolean) => {
    try {
      const { error: updateError } = await supabase.from("category_catalog").update({ is_active: isActive }).eq("id", category.id);
      if (updateError) {
        void refresh();
        toast({
          title: "Não foi possível confirmar a situação da categoria",
          description: "A lista será atualizada para conferir a situação antes de repetir a ação.",
          variant: "destructive",
        });
        return false;
      }

      const listUpdated = await refresh();
      toast({
        title: isActive ? "Categoria reativada" : "Categoria inativada",
        description: listUpdated ? category.label : `${category.label} foi atualizada; atualize a lista para conferir a situação.`,
      });
      return true;
    } catch (cause) {
      console.error("Could not confirm category status update:", cause);
      void refresh();
      toast({
        title: "Não foi possível confirmar a situação da categoria",
        description: "A lista será atualizada para conferir a situação antes de repetir a ação.",
        variant: "destructive",
      });
      return false;
    }
  }, [refresh, toast]);

  return { categories, isLoading: enabled && isFetching, error, refresh, create, update, setActive };
}
