import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Schedule {
  id: string;
  sheet_name: string;
  date: string;
  morning_shift: string | null;
  afternoon_shift: string | null;
  day_of_week: string;
  created_at: string;
  updated_at: string;
}

export function useSchedules(sheetName: string) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchSchedules = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("schedules")
        .select("*")
        .eq("sheet_name", sheetName)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error) {
      console.error("Error fetching schedules:", error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar os dados da escala.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const updateSchedule = async (id: string, field: keyof Schedule, value: string) => {
    try {
      const { error } = await supabase
        .from("schedules")
        .update({ [field]: value })
        .eq("id", id);

      if (error) throw error;

      setSchedules((prev) =>
        prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
      );

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

      setSchedules((prev) => [...prev, data]);

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

      setSchedules((prev) => prev.filter((s) => s.id !== id));

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

  useEffect(() => {
    fetchSchedules();
  }, [sheetName]);

  return {
    schedules,
    isLoading,
    fetchSchedules,
    updateSchedule,
    addSchedule,
    deleteSchedule,
  };
}
