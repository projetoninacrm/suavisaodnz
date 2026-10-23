import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User, UserRound } from "lucide-react";

interface LeadGenderKanbanProps {
  maleCount: number;
  femaleCount: number;
  unknownCount: number;
  isLoading?: boolean;
}

export function LeadGenderKanban({
  maleCount,
  femaleCount,
  unknownCount,
  isLoading = false,
}: LeadGenderKanbanProps) {
  const cards = [
    {
      title: "Homens",
      value: maleCount,
      subtitle: "Dentro do filtro atual",
      icon: User,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      title: "Mulheres",
      value: femaleCount,
      subtitle: unknownCount > 0 ? `${unknownCount} casos ambíguos` : "Dentro do filtro atual",
      icon: UserRound,
      iconClassName: "bg-accent/10 text-accent",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map(({ title, value, subtitle, icon: Icon, iconClassName }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{subtitle}</p>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${iconClassName}`}>
              <Icon className="h-5 w-5" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold tracking-tight">{value}</span>
              {isLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
