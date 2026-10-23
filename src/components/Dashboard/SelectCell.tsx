import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SelectCellProps {
  value: string;
  onSave: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function SelectCell({ value, onSave, options, placeholder = "Selecionar" }: SelectCellProps) {
  return (
    <Select value={value || ""} onValueChange={onSave}>
      <SelectTrigger className="w-full border-0 bg-transparent hover:bg-muted/50 h-auto min-h-[36px] px-3 py-2 text-sm font-normal focus:ring-0">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="bg-popover border-border z-50">
        {options.map(opt => (
          <SelectItem key={opt} value={opt}>{opt}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
