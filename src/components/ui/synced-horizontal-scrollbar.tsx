import * as React from "react";

import { cn } from "@/lib/utils";

type SyncedHorizontalScrollbarProps = {
  /** Elemento que realmente rola (overflow-x-auto) */
  targetRef: React.RefObject<HTMLElement>;
  className?: string;
};

/**
 * Barra de rolagem horizontal "no topo" sincronizada com um container real.
 * Útil para tabelas largas em desktop (arrastar a barra fica mais fácil).
 */
export function SyncedHorizontalScrollbar({ targetRef, className }: SyncedHorizontalScrollbarProps) {
  const barRef = React.useRef<HTMLDivElement>(null);
  const [{ scrollWidth, clientWidth }, setSizes] = React.useState({
    scrollWidth: 0,
    clientWidth: 0,
  });

  React.useLayoutEffect(() => {
    const target = targetRef.current;
    if (!target) return;

    const update = () => {
      // scrollWidth é a largura real do conteúdo que rola
      setSizes({ scrollWidth: target.scrollWidth, clientWidth: target.clientWidth });
      if (barRef.current) barRef.current.scrollLeft = target.scrollLeft;
    };

    update();

    const ro = new ResizeObserver(() => update());
    ro.observe(target);

    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [targetRef]);

  React.useEffect(() => {
    const target = targetRef.current;
    const bar = barRef.current;
    if (!target || !bar) return;

    let lock = false;

    const syncFromBar = () => {
      if (lock) return;
      lock = true;
      target.scrollLeft = bar.scrollLeft;
      lock = false;
    };

    const syncFromTarget = () => {
      if (lock) return;
      lock = true;
      bar.scrollLeft = target.scrollLeft;
      lock = false;
    };

    bar.addEventListener("scroll", syncFromBar, { passive: true });
    target.addEventListener("scroll", syncFromTarget, { passive: true });

    // Inicializa alinhado
    bar.scrollLeft = target.scrollLeft;

    return () => {
      bar.removeEventListener("scroll", syncFromBar);
      target.removeEventListener("scroll", syncFromTarget);
    };
  }, [targetRef]);

  // Sem overflow horizontal não faz sentido exibir a barra
  const hasOverflow = scrollWidth > clientWidth + 1;
  if (!hasOverflow) return null;

  return (
    <div
      ref={barRef}
      aria-hidden="true"
      className={cn(
        "overflow-x-scroll scrollbar-visible h-4 bg-card",
        // Mantém a barra colada no topo visualmente
        "border-b border-border",
        className,
      )}
    >
      <div style={{ width: scrollWidth, height: 1 }} />
    </div>
  );
}
