import { useCallback, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuthenticatedUserId } from "@/hooks/useAuthenticatedUserId";

export interface Schedule {
  id: string;
  sheet_name: string;
  date: string;
  morning_shift: string | null;
  morning_shift_professional_id: string | null;
  afternoon_shift: string | null;
  afternoon_shift_professional_id: string | null;
  day_of_week: string;
  created_at: string;
  updated_at: string;
}

const schedulesQueryKey = (userId: string, sheetName: string) => ["schedules", userId, sheetName] as const;
const SCHEDULES_QUERY_TIMEOUT_MS = 30_000;
const SCHEDULES_QUERY_TIMEOUT_MESSAGE = "A consulta da escala demorou mais de 30 segundos. Tente novamente.";

async function loadSchedules(sheetName: string, querySignal: AbortSignal): Promise<Schedule[]> {
  const controller = new AbortController();
  let timedOut = false;
  const abortFromQuery = () => controller.abort();
  if (querySignal.aborted) abortFromQuery();
  else querySignal.addEventListener("abort", abortFromQuery, { once: true });
  const timeout = window.setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, SCHEDULES_QUERY_TIMEOUT_MS);

  try {
    const { data, error } = await supabase
      .from("schedules")
      .select("*")
      .eq("sheet_name", sheetName)
      .order("date", { ascending: true })
      .abortSignal(controller.signal);

    if (error) throw error;
    return data || [];
  } catch (error) {
    if (timedOut && !querySignal.aborted) {
      throw new Error(SCHEDULES_QUERY_TIMEOUT_MESSAGE);
    }
    throw error;
  } finally {
    window.clearTimeout(timeout);
    querySignal.removeEventListener("abort", abortFromQuery);
  }
}

export function useSchedules(sheetName: string) {
  const userId = useAuthenticatedUserId();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const previousUserId = useRef<string | null | undefined>(undefined);
  const notifiedErrorAt = useRef<number | null>(null);

  const query = useQuery({
    queryKey: userId ? schedulesQueryKey(userId, sheetName) : ["schedules", "no-authenticated-user", sheetName],
    queryFn: ({ signal }) => loadSchedules(sheetName, signal),
    enabled: userId !== undefined && userId !== null,
    staleTime: 30_000,
    retry: false,
  });
  const refetchSchedules = query.refetch;
  const schedules = query.data ?? [];
  const isLoading = userId === undefined || (userId !== null && query.isFetching);
  const error = query.isError
    ? query.error instanceof Error && query.error.message === SCHEDULES_QUERY_TIMEOUT_MESSAGE
      ? SCHEDULES_QUERY_TIMEOUT_MESSAGE
      : "Não foi possível carregar a escala. Tente novamente."
    : null;

  useEffect(() => {
    const previousId = previousUserId.current;
    if (previousId && previousId !== userId) {
      queryClient.removeQueries({ queryKey: schedulesQueryKey(previousId, sheetName), exact: true });
    }
    previousUserId.current = userId;
  }, [queryClient, sheetName, userId]);

  useEffect(() => {
    if (!query.error || !query.isError || notifiedErrorAt.current === query.errorUpdatedAt) return;
    notifiedErrorAt.current = query.errorUpdatedAt;
    console.error("Error fetching schedules:", query.error);
    toast({
      title: "Erro ao carregar dados",
      description: "Não foi possível carregar os dados da escala.",
      variant: "destructive",
    });
  }, [query.error, query.errorUpdatedAt, query.isError, toast]);

  const fetchSchedules = useCallback(async () => {
    if (userId) await refetchSchedules();
  }, [refetchSchedules, userId]);

  const updateCachedSchedule = useCallback((id: string, update: (schedule: Schedule) => Schedule) => {
    if (!userId) return;
    queryClient.setQueryData<Schedule[]>(schedulesQueryKey(userId, sheetName), (previous) =>
      previous?.map((schedule) => schedule.id === id ? update(schedule) : schedule)
    );
  }, [queryClient, sheetName, userId]);

  const updateSchedule = async (id: string, field: keyof Schedule, value: string) => {
    try {
      const { error } = await supabase
        .from("schedules")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      updateCachedSchedule(id, (schedule) => ({ ...schedule, [field]: value }));

      toast({
        title: "Atualizado",
        description: "Dados salvos com sucesso.",
      });
    } catch (error) {
      console.error("Error updating schedule:", error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive",
      });
    }
  };

  const updateScheduleProfessional = async (
    id: string,
    shift: "morning" | "afternoon",
    professionalId: string | null,
    name: string | null,
  ) => {
    try {
      const result = shift === "morning"
        ? await supabase.from("schedules").update({ morning_shift_professional_id: professionalId, morning_shift: name }).eq("id", id)
        : await supabase.from("schedules").update({ afternoon_shift_professional_id: professionalId, afternoon_shift: name }).eq("id", id);
      if (result.error) throw result.error;
      updateCachedSchedule(id, (schedule) => shift === "morning"
          ? { ...schedule, morning_shift_professional_id: professionalId, morning_shift: name }
          : { ...schedule, afternoon_shift_professional_id: professionalId, afternoon_shift: name });
      toast({ title: "Profissional atualizado", description: name || "Turno sem profissional." });
    } catch (error) {
      console.error("Error updating schedule professional:", error);
      toast({ title: "Erro ao salvar", description: "Não foi possível atualizar o profissional.", variant: "destructive" });
    }
  };

  const addSchedule = async () => {
    try {
      const newSchedule = {
        sheet_name: sheetName,
        date: "",
        morning_shift: "",
        afternoon_shift: "",
        day_of_week: "SEG",
      };

      const { data, error } = await supabase
        .from("schedules")
        .insert(newSchedule)
        .select()
        .single();

      if (error) throw error;

      if (userId) {
        queryClient.setQueryData<Schedule[]>(schedulesQueryKey(userId, sheetName), (previous) =>
          previous ? [...previous, data] : [data]
        );
      }

      toast({
        title: "Linha adicionada",
        description: "Nova linha criada com sucesso.",
      });
    } catch (error) {
      console.error("Error adding schedule:", error);
      toast({
        title: "Erro ao adicionar",
        description: "Não foi possível adicionar nova linha.",
        variant: "destructive",
      });
    }
  };

  const deleteSchedule = async (id: string) => {
    try {
      const { error } = await supabase
        .from("schedules")
        .delete()
        .eq("id", id);

      if (error) throw error;

      if (userId) {
        queryClient.setQueryData<Schedule[]>(schedulesQueryKey(userId, sheetName), (previous) =>
          previous?.filter((schedule) => schedule.id !== id)
        );
      }

      toast({
        title: "Excluído",
        description: "Linha removida com sucesso.",
      });
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a linha.",
        variant: "destructive",
      });
    }
  };

  return {
    schedules,
    isLoading,
    error,
    fetchSchedules,
    updateSchedule,
    updateScheduleProfessional,
    addSchedule,
    deleteSchedule,
  };
}
