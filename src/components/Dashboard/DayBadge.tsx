import { Badge } from "@/components/ui/badge";

interface DayBadgeProps {
  day: string;
}

const DAY_STYLES: Record<string, string> = {
  SEG: "border-transparent bg-[hsl(var(--day-seg))] text-white",
  TER: "border-transparent bg-[hsl(var(--day-ter))] text-white",
  QUA: "border-transparent bg-[hsl(var(--day-qua))] text-white",
  QUI: "border-transparent bg-[hsl(var(--day-qui))] text-white",
  SEX: "border-transparent bg-[hsl(var(--day-sex))] text-white",
  SAB: "border-transparent bg-[hsl(var(--day-sab))] text-white",
  DOM: "border-transparent bg-[hsl(var(--day-sab))] text-white",
};

export function DayBadge({ day }: DayBadgeProps) {
  const style = DAY_STYLES[day.toUpperCase()];

  return (
    <Badge variant={style ? "outline" : "secondary"} className={style}>
      {day}
    </Badge>
  );
}
