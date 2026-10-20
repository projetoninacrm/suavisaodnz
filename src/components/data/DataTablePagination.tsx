import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DataTablePaginationProps {
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  showPageSizeSelector?: boolean;
  label?: string;
  className?: string;
}

export function DataTablePagination({
  total,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  showPageSizeSelector = true,
  label = "registros",
  className,
}: DataTablePaginationProps) {
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pageCount);
  const firstItem = total === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, total);

  return (
    <div className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card px-3 py-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
        Exibindo <span className="font-medium tabular-nums text-foreground">{firstItem}–{lastItem}</span> de{" "}
        <span className="font-medium tabular-nums text-foreground">{total}</span> {label}
      </p>
      <nav aria-label="Paginação" className="flex flex-wrap items-center gap-2">
        {showPageSizeSelector && (
          <Select
            value={String(pageSize)}
            onValueChange={(value) => {
              const nextPageSize = Number(value);
              if (Number.isInteger(nextPageSize) && nextPageSize > 0) onPageSizeChange?.(nextPageSize);
            }}
          >
            <SelectTrigger className="h-9 w-[132px]" aria-label="Registros por página">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>{size} por página</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <span aria-current="page" className="min-w-[96px] text-center text-sm tabular-nums text-muted-foreground">
          Página {currentPage} de {pageCount}
        </span>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} aria-label="Página anterior">
          Anterior
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= pageCount} aria-label="Próxima página">
          Próxima
        </Button>
      </nav>
    </div>
  );
}
