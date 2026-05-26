import { Calendar, RefreshCw, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export type Unidade = "DNZ" | "SUA_VISAO";

interface HeaderProps {
  onRefresh: () => void;
  onAddRow: () => void;
  isLoading: boolean;
  unidade: Unidade;
  onUnidadeChange: (unidade: Unidade) => void;
}

export function Header({ onRefresh, onAddRow, isLoading, unidade, onUnidadeChange }: HeaderProps) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  return (
    <header className="bg-card border-b border-border px-6 py-4 card-shadow">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Escala de Trabalho</h1>
              <p className="text-sm text-muted-foreground">Gerenciamento de turnos</p>
            </div>
          </div>
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg ml-2">
            <button
              onClick={() => onUnidadeChange("DNZ")}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200",
                unidade === "DNZ"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              DNZ Óticas
            </button>
            <button
              onClick={() => onUnidadeChange("SUA_VISAO")}
              className={cn(
                "px-3 py-1.5 text-sm font-semibold rounded-md transition-all duration-200",
                unidade === "SUA_VISAO"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Sua Visão
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Atualizar
          </Button>
          <Button
            size="sm"
            onClick={onAddRow}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Nova Linha
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>
        </div>
      </div>
    </header>
  );
}
