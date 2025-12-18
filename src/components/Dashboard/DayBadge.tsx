interface DayBadgeProps {
  day: string;
}

export function DayBadge({ day }: DayBadgeProps) {
  const dayClass = {
    SEG: "day-seg",
    TER: "day-ter",
    QUA: "day-qua",
    QUI: "day-qui",
    SEX: "day-sex",
    SAB: "day-sab",
    DOM: "day-sab",
  }[day.toUpperCase()] || "bg-muted text-muted-foreground";

  return (
    <span className={`day-badge ${dayClass}`}>
      {day}
    </span>
  );
}
