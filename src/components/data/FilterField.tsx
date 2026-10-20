import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FilterFieldProps {
  id: string;
  label: ReactNode;
  children: ReactNode;
  labelAdornment?: ReactNode;
  labelClassName?: string;
  className?: string;
}

export function FilterField({
  id,
  label,
  children,
  labelAdornment,
  labelClassName,
  className,
}: FilterFieldProps) {
  return (
    <div className={cn("min-w-0 space-y-1.5", className)}>
      <Label htmlFor={id} className={cn("text-sm", labelAdornment && "flex items-center gap-2", labelClassName)}>
        {labelAdornment}
        {label}
      </Label>
      {children}
    </div>
  );
}
