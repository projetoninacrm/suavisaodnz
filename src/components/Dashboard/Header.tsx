import { Calendar, RefreshCw, Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface HeaderProps {
  onRefresh?: () => void;
  onAddRow?: () => void;
  isLoading: boolean;
  legacy?: boolean;
}

export function Header({ onRefresh, onAddRow, isLoading, legacy = false }: HeaderProps) {
  const navigate = useNavigate();
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth", { replace: true });
  };
  return (
    <header className={legacy ? "mb-4 flex justify-end border-b border-border pb-3" : "bg-card border-b border-border px-6 py-4 card-shadow"}>
      <div className={legacy ? "flex items-center justify-end gap-2" : "max-w-7xl mx-auto flex items-center justify-between"}>
        {!legacy && <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Escala de Trabalho</h1>
              <p className="text-sm text-muted-foreground">Gerenciamento de turnos</p>
            </div>
          </div>
        </div>}

        <div className="flex items-center gap-2">
          {onRefresh && (
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
          )}
          {onAddRow && (
            <Button
              size="sm"
              onClick={onAddRow}
              className="gap-2"
            >
              <Plus className="w-4 h-4" />
              Nova Linha
            </Button>
          )}
          {!legacy && <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </Button>}
        </div>
      </div>
    </header>
  );
}
