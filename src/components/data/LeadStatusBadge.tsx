import { Badge, type BadgeProps } from "@/components/ui/badge";

type LeadStatusBadgeProps = {
  status: string | null | undefined;
};

const statusVariant = (status: string): NonNullable<BadgeProps["variant"]> => {
  const normalized = status.trim().toLocaleLowerCase("pt-BR");
  if (normalized === "perdido") return "destructive";
  if (normalized === "pós venda") return "info";
  if (normalized === "" || normalized === "ativo" || normalized === "em atendimento") return "success";
  return "outline";
};

export function LeadStatusBadge({ status }: LeadStatusBadgeProps) {
  const label = status?.trim() || "Ativo";

  return (
    <Badge variant={statusVariant(status || "")} className="whitespace-nowrap font-medium">
      {label}
    </Badge>
  );
}
