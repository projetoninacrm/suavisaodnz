import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EditableCell } from "./EditableCell";
import type { GenericRecord } from "@/hooks/useGenericTable";

interface Column {
  key: string;
  label: string;
  width?: string;
}

interface GenericTableProps {
  records: GenericRecord[];
  columns: Column[];
  onUpdate: (id: string, field: string, value: string) => void;
  onDelete: (id: string) => void;
  emptyMessage?: string;
}

export function GenericTable({ records, columns, onUpdate, onDelete, emptyMessage = "Nenhum registro encontrado." }: GenericTableProps) {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden card-shadow-lg animate-fade-in">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-table-header border-b border-table-border">
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider"
                  style={{ width: col.width }}
                >
                  {col.label}
                </th>
              ))}
              <th className="px-3 py-3 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider w-[50px]"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-table-border">
            {records.map((record, index) => (
              <tr 
                key={record.id} 
                className="table-cell-hover animate-slide-in"
                style={{ animationDelay: `${index * 15}ms` }}
              >
                {columns.map((col) => (
                  <td key={col.key} className="px-1 py-1">
                    <EditableCell 
                      value={record[col.key] || ""} 
                      onSave={(v) => onUpdate(record.id, col.key, v)} 
                      placeholder={col.label} 
                    />
                  </td>
                ))}
                <td className="px-2 py-2 text-center">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(record.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {records.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <p>{emptyMessage}</p>
          <p className="text-sm mt-1">Clique em "Nova Linha" para adicionar.</p>
        </div>
      )}
    </div>
  );
}
