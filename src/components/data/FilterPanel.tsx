import type { ReactNode } from "react";
import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface FilterPanelProps {
  children: ReactNode;
  hasActiveFilters?: boolean;
  onClear?: () => void;
  resultSummary?: ReactNode;
  title?: string;
}

export function FilterPanel({
  children,
  hasActiveFilters = false,
  onClear,
  resultSummary,
  title = "Filtros",
}: FilterPanelProps) {
  return (
    <Card className="border-border">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Filter aria-hidden="true" className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">{title}</h3>
            {resultSummary && (
              <span aria-live="polite" className="text-xs text-muted-foreground">
                {resultSummary}
              </span>
            )}
          </div>
          {hasActiveFilters && onClear && (
            <Button type="button" variant="ghost" size="sm" onClick={onClear} className="h-8">
              <X aria-hidden="true" className="size-3.5" />
              Limpar filtros
            </Button>
          )}
        </div>
        <div role="group" aria-label={title}>
          {children}
        </div>
      </CardContent>
    </Card>
  );
}
