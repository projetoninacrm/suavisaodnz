import { AlertCircle, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { cn } from "@/lib/utils";

type DataStateVariant = "loading" | "refreshing" | "error" | "empty";

interface DataStateProps {
  variant: DataStateVariant;
  title: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

const stateIcons = {
  loading: Spinner,
  refreshing: Spinner,
  error: AlertCircle,
  empty: Inbox,
};

export function DataState({ variant, title, description, action, className }: DataStateProps) {
  const Icon = stateIcons[variant];

  if (variant === "empty") {
    return (
      <section role="status" aria-live="polite" className={cn("flex min-h-28 items-center justify-center rounded-lg border border-border bg-card", className)}>
        <Empty className="min-h-28 border-0 bg-transparent px-5 py-8">
          <EmptyHeader>
            <EmptyMedia variant="icon"><Icon aria-hidden="true" /></EmptyMedia>
            <EmptyTitle>{title}</EmptyTitle>
            {description && <EmptyDescription>{description}</EmptyDescription>}
          </EmptyHeader>
          {action && <EmptyContent><Button type="button" variant="outline" size="sm" onClick={action.onClick}>{action.label}</Button></EmptyContent>}
        </Empty>
      </section>
    );
  }

  if (variant === "refreshing") {
    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={cn("flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground", className)}
      >
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="font-medium">{title}</span>
        {description && <span>{description}</span>}
      </div>
    );
  }

  return (
    <section
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={cn("flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-border bg-card px-5 py-8 text-center", className)}
    >
      <Icon aria-hidden="true" className={cn("size-5 text-muted-foreground", variant === "loading" && "animate-spin")} />
      <div>
        <p className="text-sm font-medium">{title}</p>
        {description && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {action && (
        <Button type="button" variant="outline" size="sm" onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      )}
    </section>
  );
}
