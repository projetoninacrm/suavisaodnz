import { Calendar, RefreshCw, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  onRefresh: () => void;
  onAddRow: () => void;
  isLoading: boolean;
}

export function Header({ onRefresh, onAddRow, isLoading }: HeaderProps) {
  return (
    <header className="bg-card border-b border-border px-6 py-4 card-shadow">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Calendar className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Escala de Trabalho</h1>
            <p className="text-sm text-muted-foreground">Gerenciamento de turnos</p>
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
        </div>
      </div>
    </header>
  );
}
