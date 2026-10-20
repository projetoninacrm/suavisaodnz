import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUserId } from "@/hooks/useAuthenticatedUserId";

export interface DirectoryPerson {
  id: string;
  name: string;
  role?: string;
  external_id?: string | null;
  is_active: boolean;
}

type DirectoryKind = "employees" | "professionals";
const directoryQueryKey = (userId: string, kind: DirectoryKind) => ["directory", userId, kind] as const;

async function loadDirectory(kind: DirectoryKind): Promise<DirectoryPerson[]> {
  const result = kind === "employees"
    ? await supabase.from("employees").select("id,name,role,is_active").order("name")
    : await supabase.from("professionals").select("id,name,external_id,is_active").order("name");
  if (result.error) throw result.error;
  return (result.data || []) as DirectoryPerson[];
}

export function useDirectory(kind: DirectoryKind, options: { enabled?: boolean } = {}) {
  const enabled = options.enabled ?? true;
  const userId = useAuthenticatedUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const notifiedErrorAt = useRef<number | null>(null);

  const query = useQuery({
    queryKey: userId ? directoryQueryKey(userId, kind) : ["directory", "no-authenticated-user", kind],
    queryFn: () => loadDirectory(kind),
    enabled: enabled && userId !== undefined && userId !== null,
    staleTime: 30_000,
    retry: false,
  });
  const refetchDirectory = query.refetch;
  const people = query.data ?? [];
  const isLoading = enabled && (userId === undefined || (userId !== null && query.isFetching));
  const error = query.isError ? "Não foi possível carregar esta lista. Tente novamente." : null;

  useEffect(() => {
    const previousId = previousUserId.current;
    if (previousId && previousId !== userId) {
      queryClient.removeQueries({ queryKey: directoryQueryKey(previousId, kind), exact: true });
    }
    previousUserId.current = userId;
  }, [kind, queryClient, userId]);

  useEffect(() => {
    if (!query.error || !query.isError || notifiedErrorAt.current === query.errorUpdatedAt) return;
    notifiedErrorAt.current = query.errorUpdatedAt;
    console.error(`Error fetching ${kind}:`, query.error);
    toast({ title: "Erro ao carregar cadastros", description: "Não foi possível carregar a lista.", variant: "destructive" });
  }, [kind, query.error, query.errorUpdatedAt, query.isError, toast]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!enabled || !userId) return false;
    const result = await refetchDirectory();
    return !result.isError;
  }, [enabled, refetchDirectory, userId]);

  const create = useCallback(async (name: string, role = "Vendedor") => {
    const cleanedName = name.trim().replace(/\s+/g, " ");
    if (!cleanedName) return false;
    try {
      const result = kind === "employees"
        ? await supabase.from("employees").insert({ name: cleanedName, role })
        : await supabase.from("professionals").insert({ name: cleanedName });
      const { error } = result;
      if (error) {
        if (error.code !== "23505") void refresh();
        toast({
          title: error.code === "23505" ? "Cadastro já existente" : "Não foi possível confirmar o cadastro",
          description: error.code === "23505"
            ? "Já existe um cadastro com esse nome."
            : "A lista será atualizada. Confira se o cadastro apareceu antes de tentar novamente.",
          variant: "destructive",
        });
        return false;
      }

      const listUpdated = await refresh();
      toast({
        title: "Cadastro criado",
        description: listUpdated ? `${cleanedName} já pode ser selecionado.` : "O registro foi salvo; atualize a lista para exibi-lo.",
      });
      return true;
    } catch (cause) {
      console.error(`Could not confirm ${kind} creation:`, cause);
      void refresh();
      toast({
        title: "Não foi possível confirmar o cadastro",
        description: "A lista será atualizada. Confira se o cadastro apareceu antes de tentar novamente.",
        variant: "destructive",
      });
      return false;
    }
  }, [kind, refresh, toast]);

  const setActive = useCallback(async (person: DirectoryPerson, isActive: boolean) => {
    try {
      const result = kind === "employees"
        ? await supabase.from("employees").update({ is_active: isActive }).eq("id", person.id)
        : await supabase.from("professionals").update({ is_active: isActive }).eq("id", person.id);
      const { error } = result;
      if (error) {
        void refresh();
        toast({
          title: "Não foi possível confirmar a atualização",
          description: "A lista será atualizada para conferir a situação antes de repetir a ação.",
          variant: "destructive",
        });
        return false;
      }

      const listUpdated = await refresh();
      toast({
        title: isActive ? "Cadastro reativado" : "Cadastro inativado",
        description: listUpdated ? person.name : `${person.name} foi atualizado; atualize a lista para conferir a situação.`,
      });
      return true;
    } catch (cause) {
      console.error(`Could not confirm ${kind} status update:`, cause);
      void refresh();
      toast({
        title: "Não foi possível confirmar a atualização",
        description: "A lista será atualizada para conferir a situação antes de repetir a ação.",
        variant: "destructive",
      });
      return false;
    }
  }, [kind, refresh, toast]);

  return { people, isLoading, error, refresh, create, setActive };
}
