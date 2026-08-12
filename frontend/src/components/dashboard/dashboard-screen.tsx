"use client";

import { CalendarCheck2, CalendarX2, Clock, UserPlus, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/agenda/status";
import type { AppointmentStatus } from "@/lib/appointments/types";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import { getDailySummary } from "@/lib/dashboard/api";
import type { DailySummary } from "@/lib/dashboard/types";

function todayKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function MetricCard({
  title,
  value,
  icon: Icon,
  hint,
  isLoading,
}: {
  title: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <>
            <div className="text-2xl font-bold">{value}</div>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export function DashboardScreen() {
  const [session] = useState(() => getSessionContext());
  const [date, setDate] = useState(() => todayKey());
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setIsLoading(true);
    getDailySummary(session.tenantId, session.establishmentId, date)
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) {
          toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o resumo");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [session, date]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const byStatus = summary?.appointments.byStatus ?? {};
  const statusEntries = Object.entries(byStatus) as [AppointmentStatus, number][];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral do dia no estabelecimento.</p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-44"
          aria-label="Dia do resumo"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Agendamentos do dia"
          value={String(summary?.appointments.total ?? 0)}
          icon={CalendarCheck2}
          isLoading={isLoading}
        />
        <MetricCard
          title="Faturamento"
          value={formatCurrency(summary?.revenueCents ?? 0)}
          icon={Wallet}
          hint="Pagamentos confirmados no dia"
          isLoading={isLoading}
        />
        <MetricCard
          title="Clientes novos"
          value={String(summary?.newClients ?? 0)}
          icon={UserPlus}
          isLoading={isLoading}
        />
        <MetricCard
          title="Cancelamentos"
          value={`${Math.round((summary?.cancellationRate ?? 0) * 100)}%`}
          icon={CalendarX2}
          hint={`${byStatus.cancelled ?? 0} de ${summary?.appointments.total ?? 0}`}
          isLoading={isLoading}
        />
        <MetricCard
          title="Horários livres"
          value={String(summary?.vacantSlots ?? 0)}
          icon={Clock}
          hint="Janelas de 30 min por profissional"
          isLoading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agendamentos por status</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-8 w-full" />
          ) : statusEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento neste dia.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {statusEntries.map(([status, count]) => (
                <Badge key={status} variant={STATUS_BADGE_VARIANT[status] ?? "secondary"}>
                  {STATUS_LABELS[status] ?? status}: {count}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
