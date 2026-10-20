import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type FilterGridColumns = 2 | 3 | 4 | 5 | 7;

interface FilterGridProps {
  children: ReactNode;
  columns?: FilterGridColumns;
  className?: string;
}

const columnLayouts: Record<FilterGridColumns, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  5: "sm:grid-cols-2 xl:grid-cols-5",
  7: "sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-7",
};

export function FilterGrid({ children, columns = 4, className }: FilterGridProps) {
  return (
    <div className={cn("grid min-w-0 grid-cols-1 gap-3", columnLayouts[columns], className)}>
      {children}
    </div>
  );
}
