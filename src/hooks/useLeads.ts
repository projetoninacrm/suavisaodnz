import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUserId } from "@/hooks/useAuthenticatedUserId";

export interface Lead {
  id: string;
  data_registro: string | null;
  canal: string | null;
  nome: string | null;
  numero: string | null;
  orcamento: string | null;
  venda: string | null;
  entrar_em_contato: string | null;
  medico: string | null;
  obs: string | null;
  status: string | null;
  vendedor: string | null;
  vendedor_id: string | null;
  medico_id: string | null;
  valor: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewLeadData {
  data_registro: string;
  canal: string;
  nome: string;
  numero: string;
  orcamento: string;
  venda: string;
  entrar_em_contato: string;
  medico: string;
  obs: string;
  status?: string;
  vendedor?: string;
  vendedor_id?: string | null;
  medico_id?: string | null;
  valor?: string;
}

export type LeadChanges = Partial<Pick<Lead,
  "data_registro" | "canal" | "nome" | "numero" | "orcamento" | "venda" |
  "entrar_em_contato" | "medico" | "medico_id" | "obs" | "status" |
  "vendedor" | "vendedor_id" | "valor"
>>;

const leadsQueryKey = (userId: string) => ["leads", userId] as const;
const LEADS_QUERY_TIMEOUT_MS = 30_000;
const LEADS_QUERY_TIMEOUT_MESSAGE = "A consulta de leads demorou mais de 30 segundos. Tente novamente.";

async function loadAllLeads(querySignal: AbortSignal): Promise<Lead[]> {
  // Keep each request below the backend's 1,000-row response ceiling.
  // Continue requesting pages until the backend returns an empty batch.
  const pageSize = 500;
  let from = 0;
  const all: Lead[] = [];
  const controller = new AbortController();
  let timedOut = false;
  const abortFromQuery = () => controller.abort();
  if (querySignal.aborted) abortFromQuery();
  else querySignal.addEventListener("abort", abortFromQuery, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, LEADS_QUERY_TIMEOUT_MS);

  try {
    while (true) {
      const { data, error } = await supabase
        .from("leads")
        .select("*")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, from + pageSize - 1)
        .abortSignal(controller.signal);

      if (error) throw error;
      const batch = data || [];
      if (batch.length === 0) break;
      all.push(...batch);
      from += pageSize;
    }
  } catch (error) {
    if (timedOut && !querySignal.aborted) {
      throw new Error(LEADS_QUERY_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    querySignal.removeEventListener("abort", abortFromQuery);
  }

  return all;
}

export function useCreateLead() {
  const { toast } = useToast();

  const createLead = useCallback(async (leadData: NewLeadData) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .insert(leadData)
        .select()
        .single();

      if (error) throw error;
      toast({ title: "Adicionado", description: "Novo lead criado com sucesso!" });
      return data;
    } catch (error) {
      console.error("Error adding lead:", error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar o lead.",
        variant: "destructive",
      });
      throw error;
    }
  }, [toast]);

  return { createLead };
}

export function useLeads() {
  const userId = useAuthenticatedUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { createLead } = useCreateLead();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const notifiedErrorAt = useRef<number | null>(null);

  useEffect(() => {
    const previousId = previousUserId.current;
    if (previousId && previousId !== userId) {
      // Lead records contain customer data; discard the old account's cache on sign-out or account switch.
      queryClient.removeQueries({ queryKey: leadsQueryKey(previousId), exact: true });
    }
    previousUserId.current = userId;
  }, [queryClient, userId]);

  const leadsQuery = useQuery({
    queryKey: userId ? leadsQueryKey(userId) : ["leads", "no-authenticated-user"],
    queryFn: ({ signal }) => loadAllLeads(signal),
    enabled: userId !== undefined && userId !== null,
    staleTime: 30_000,
    retry: false,
  });
  const refetchLeads = leadsQuery.refetch;
  const leads = leadsQuery.data ?? [];
  const isLoading = userId === undefined || (userId !== null && leadsQuery.isFetching);
  const isTimeoutError = leadsQuery.error instanceof Error && leadsQuery.error.message === LEADS_QUERY_TIMEOUT_MESSAGE;
  const error = leadsQuery.isError
    ? (isTimeoutError ? LEADS_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar os leads. Tente novamente.")
    : null;

  useEffect(() => {
    if (!leadsQuery.error || !leadsQuery.isError || notifiedErrorAt.current === leadsQuery.errorUpdatedAt) return;
    notifiedErrorAt.current = leadsQuery.errorUpdatedAt;
    console.error("Error fetching leads:", leadsQuery.error);
    toast({
      title: "Erro ao carregar dados",
      description: isTimeoutError ? LEADS_QUERY_TIMEOUT_MESSAGE : "Não foi possível carregar os leads.",
      variant: "destructive",
    });
  }, [isTimeoutError, leadsQuery.error, leadsQuery.errorUpdatedAt, leadsQuery.isError, toast]);

  const fetchLeads = useCallback(async () => {
    if (userId) await refetchLeads();
  }, [refetchLeads, userId]);

  const updateCachedLead = useCallback((id: string, update: (lead: Lead) => Lead) => {
    if (!userId) return;
    queryClient.setQueryData<Lead[]>(leadsQueryKey(userId), (previous) =>
      previous?.map((lead) => lead.id === id ? update(lead) : lead)
    );
  }, [queryClient, userId]);

  const updateLead = async (id: string, field: keyof Lead, value: string) => {
    try {
      const { error } = await supabase
        .from("leads")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      updateCachedLead(id, (lead) => ({ ...lead, [field]: value }));

      toast({ title: "Atualizado", description: "Dados salvos." });
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar.",
        variant: "destructive",
      });
    }
  };

  const updateLeadFields = async (id: string, changes: LeadChanges) => {
    try {
      const { data, error } = await supabase
        .from("leads")
        .update(changes)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      updateCachedLead(id, () => data);
      toast({ title: "Lead atualizado", description: "As alterações foram salvas." });
      return data;
    } catch (error) {
      console.error("Error updating lead:", error);
      toast({ title: "Erro ao salvar", description: "As alterações não foram salvas. Revise os dados e tente novamente.", variant: "destructive" });
      throw error;
    }
  };

  const updateLeadPerson = async (
    id: string,
    person: "employee" | "professional",
    personId: string | null,
    name: string | null,
  ) => {
    try {
      const result = person === "employee"
        ? await supabase.from("leads").update({ vendedor_id: personId, vendedor: name }).eq("id", id)
        : await supabase.from("leads").update({ medico_id: personId, medico: name }).eq("id", id);
      const { error } = result;
      if (error) throw error;
      updateCachedLead(id, (lead) => person === "employee"
        ? { ...lead, vendedor_id: personId, vendedor: name }
        : { ...lead, medico_id: personId, medico: name });
      toast({ title: "Responsável atualizado", description: name || "Atribuição removida." });
    } catch (error) {
      console.error("Error updating lead assignment:", error);
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar a pessoa vinculada.", variant: "destructive" });
    }
  };

  const addLead = useCallback(async (leadData: NewLeadData) => {
    const data = await createLead(leadData);
    if (userId) {
      queryClient.setQueryData<Lead[]>(leadsQueryKey(userId), (previous) =>
        previous ? [data, ...previous] : [data]
      );
    }
    return data;
  }, [createLead, queryClient, userId]);

  const deleteLead = async (id: string) => {
    try {
      const { error } = await supabase.from("leads").delete().eq("id", id);
      if (error) throw error;
      if (userId) {
        queryClient.setQueryData<Lead[]>(leadsQueryKey(userId), (previous) =>
          previous?.filter((lead) => lead.id !== id)
        );
      }
      toast({ title: "Excluído", description: "Lead removido." });
    } catch (error) {
      console.error("Error deleting lead:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir.",
        variant: "destructive",
      });
    }
  };

  return { leads, isLoading, error, fetchLeads, updateLead, updateLeadFields, updateLeadPerson, addLead, deleteLead };
}
