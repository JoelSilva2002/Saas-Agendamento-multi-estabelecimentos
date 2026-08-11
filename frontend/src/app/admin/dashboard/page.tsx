import { BarChart3, CalendarCheck2, Star, Wallet } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SUMMARY_CARDS = [
  { title: "Faturamento do mês", value: "—", icon: Wallet },
  { title: "Agendamentos hoje", value: "—", icon: CalendarCheck2 },
  { title: "Avaliação média", value: "—", icon: Star },
  { title: "Horário de pico", value: "—", icon: BarChart3 },
] as const;

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Visão geral do estabelecimento. Os dados serão conectados à API em uma próxima etapa.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {SUMMARY_CARDS.map(({ title, value, icon: Icon }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {title}
              </CardTitle>
              <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
