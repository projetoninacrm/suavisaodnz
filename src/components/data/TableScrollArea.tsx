import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TableScrollAreaProps {
  label: string;
  children: ReactNode;
  className?: string;
  busy?: boolean;
}

export function TableScrollArea({ label, children, className, busy = false }: TableScrollAreaProps) {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [hasHorizontalOverflow, setHasHorizontalOverflow] = useState(false);

  useEffect(() => {
    const element = scrollAreaRef.current;
    if (!element) return;

    const updateOverflow = () => {
      const next = element.scrollWidth > element.clientWidth + 1;
      setHasHorizontalOverflow((current) => current === next ? current : next);
    };

    updateOverflow();
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateOverflow);
    resizeObserver?.observe(element);
    const table = element.querySelector("table");
    if (table) resizeObserver?.observe(table);
    window.addEventListener("resize", updateOverflow);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener("resize", updateOverflow);
    };
  }, [children]);

  return (
    <div
      ref={scrollAreaRef}
      role="region"
      aria-label={label}
      aria-description={hasHorizontalOverflow ? "Use a rolagem horizontal para ver todas as colunas." : undefined}
      aria-busy={busy}
      tabIndex={hasHorizontalOverflow ? 0 : undefined}
      className={cn(
        "min-w-0 overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        className,
      )}
    >
      {hasHorizontalOverflow && (
        <p aria-hidden="true" className="sticky left-0 z-10 flex w-fit max-w-full items-center gap-1 border-b border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground">
          <span aria-hidden="true">↔</span>
          <span>Role para ver todas as colunas</span>
        </p>
      )}
      {children}
    </div>
  );
}
