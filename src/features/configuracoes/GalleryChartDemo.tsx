import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableScrollArea } from "@/components/data/TableScrollArea";

const config = {
  leads: { label: "Leads fictícios", color: "oklch(var(--chart-1))" },
} satisfies ChartConfig;

const data = [
  { month: "Jan", leads: 12 },
  { month: "Fev", leads: 18 },
  { month: "Mar", leads: 15 },
  { month: "Abr", leads: 23 },
];

export default function GalleryChartDemo() {
  return (
    <div className="space-y-3">
      <ChartContainer config={config} role="img" aria-label="Leads fictícios por mês" className="h-44 w-full">
        <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tickMargin={8} />
          <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
          <Bar dataKey="leads" fill="var(--color-leads)" radius={4} />
        </BarChart>
      </ChartContainer>
      <TableScrollArea label="Tabela de leads fictícios por mês" className="rounded-md border">
        <Table>
          <TableCaption>Valores sintéticos usados apenas nesta prévia.</TableCaption>
          <TableHeader>
            <TableRow><TableHead>Mês</TableHead><TableHead className="text-right">Leads fictícios</TableHead></TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={row.month}>
                <TableCell>{row.month}</TableCell>
                <TableCell className="text-right tabular-nums">{row.leads}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScrollArea>
    </div>
  );
}
