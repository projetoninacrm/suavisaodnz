import type { CSSProperties } from "react";
import type { ReactTable, RowData, TableFeatures } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableScrollArea } from "@/components/data/TableScrollArea";
import { cn } from "@/lib/utils";

type EntityDataTableProps<TFeatures extends TableFeatures, TData extends RowData> = {
  table: ReactTable<TFeatures, TData>;
  label: string;
  className?: string;
  tableClassName?: string;
  headerClassName?: string;
  headerRowClassName?: string;
  rowClassName?: string;
  getRowStyle?: (row: TData, index: number) => CSSProperties | undefined;
  getHeaderClassName?: (columnId: string) => string | undefined;
  getCellClassName?: (columnId: string) => string | undefined;
  busy?: boolean;
};

/** Shared semantic table renderer for domain-specific TanStack column definitions. */
export function EntityDataTable<TFeatures extends TableFeatures, TData extends RowData>({
  table,
  label,
  className,
  tableClassName,
  headerClassName,
  headerRowClassName,
  rowClassName,
  getRowStyle,
  getHeaderClassName,
  getCellClassName,
  busy = false,
}: EntityDataTableProps<TFeatures, TData>) {
  return (
    <TableScrollArea label={label} busy={busy} className={className}>
      <Table aria-label={label} className={tableClassName}>
        <TableHeader className={headerClassName}>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id} className={cn("bg-muted/60 hover:bg-muted/60", headerRowClassName)}>
              {group.headers.map((header) => (
                <TableHead key={header.id} className={getHeaderClassName?.(header.column.id)}>
                  {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow key={row.id} className={rowClassName} style={getRowStyle?.(row.original, index)}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id} className={getCellClassName?.(cell.column.id)}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableScrollArea>
  );
}
