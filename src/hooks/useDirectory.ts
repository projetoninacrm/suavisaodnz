import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface DirectoryPerson {
  id: string;
  name: string;
  role?: string;
  external_id?: string | null;
  is_active: boolean;
}

type DirectoryKind = "employees" | "professionals";

export function useDirectory(kind: DirectoryKind) {
  const [people, setPeople] = useState<DirectoryPerson[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setIsLoading(true);
    const result = kind === "employees"
      ? await supabase.from("employees").select("id,name,role,is_active").order("name")
      : await supabase.from("professionals").select("id,name,external_id,is_active").order("name");
    const { data, error } = result;
    if (error) {
      console.error(`Error fetching ${kind}:`, error);
      toast({ title: "Erro ao carregar cadastros", description: "Não foi possível carregar a lista.", variant: "destructive" });
    } else {
      setPeople((data || []) as DirectoryPerson[]);
    }
    setIsLoading(false);
  }, [kind, toast]);

  useEffect(() => { void refresh(); }, [refresh]);

  const create = useCallback(async (name: string, role = "Vendedor") => {
    const cleanedName = name.trim().replace(/\s+/g, " ");
    if (!cleanedName) return false;
    const result = kind === "employees"
      ? await supabase.from("employees").insert({ name: cleanedName, role })
      : await supabase.from("professionals").insert({ name: cleanedName });
    const { error } = result;
    if (error) {
      toast({ title: "Não foi possível cadastrar", description: error.code === "23505" ? "Já existe um cadastro com esse nome." : "Tente novamente." , variant: "destructive" });
      return false;
    }
    await refresh();
    toast({ title: "Cadastro criado", description: `${cleanedName} já pode ser selecionado.` });
    return true;
  }, [kind, refresh, toast]);

  const setActive = useCallback(async (person: DirectoryPerson, isActive: boolean) => {
    const result = kind === "employees"
      ? await supabase.from("employees").update({ is_active: isActive }).eq("id", person.id)
      : await supabase.from("professionals").update({ is_active: isActive }).eq("id", person.id);
    const { error } = result;
    if (error) {
      toast({ title: "Não foi possível atualizar", description: "Tente novamente.", variant: "destructive" });
      return;
    }
    await refresh();
    toast({ title: isActive ? "Cadastro reativado" : "Cadastro inativado", description: person.name });
  }, [kind, refresh, toast]);

  return { people, isLoading, refresh, create, setActive };
}
