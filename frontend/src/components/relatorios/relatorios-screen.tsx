"use client";

import { BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { getSessionContext } from "@/lib/auth/session-context";
import { listEmployees } from "@/lib/employees/api";
import type { Employee } from "@/lib/employees/types";
import {
  getCancellationRate,
  getEmployeeProductivity,
  getMonthlyRevenue,
  getPeakHours,
  getTopClients,
  getTopServices,
} from "@/lib/reports/api";
import type {
  CancellationRate,
  ClientMetric,
  EmployeeMetric,
  HourMetric,
  MonthlyRevenue,
  ServiceMetric,
} from "@/lib/reports/types";
import { listServices } from "@/lib/services/api";
import type { CatalogService } from "@/lib/services/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function firstDayOfMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function formatCurrency(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function RelatoriosScreen() {
  const [session] = useState(() => getSessionContext());
  const [month, setMonth] = useState(() => currentMonth());
  const [fromDate, setFromDate] = useState(() => firstDayOfMonth());
  const [toDate, setToDate] = useState(() => today());

  const [services, setServices] = useState<CatalogService[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);

  const [revenue, setRevenue] = useState<MonthlyRevenue | null>(null);
  const [topServices, setTopServices] = useState<ServiceMetric[]>([]);
  const [productivity, setProductivity] = useState<EmployeeMetric[]>([]);
  const [peakHours, setPeakHours] = useState<HourMetric[]>([]);
  const [topClients, setTopClients] = useState<ClientMetric[]>([]);
  const [cancellation, setCancellation] = useState<CancellationRate | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    setIsLoading(true);
    Promise.all([
      listServices(session.tenantId, session.establishmentId),
      listEmployees(session.tenantId, session.establishmentId),
      listTenantUsers(session.tenantId),
      getMonthlyRevenue(session.tenantId, session.establishmentId, month),
      getTopServices(session.tenantId, session.establishmentId, { fromDate, toDate }),
      getEmployeeProductivity(session.tenantId, session.establishmentId, { fromDate, toDate }),
      getPeakHours(session.tenantId, session.establishmentId, { fromDate, toDate }),
      getTopClients(session.tenantId, session.establishmentId, { fromDate, toDate }),
      getCancellationRate(session.tenantId, session.establishmentId, { fromDate, toDate }),
    ])
      .then(([servicesResult, employeesResult, usersResult, revenueResult, topServicesResult, productivityResult, peakHoursResult, topClientsResult, cancellationResult]) => {
        if (cancelled) return;
        setServices(servicesResult);
        setEmployees(employeesResult);
        setUsers(usersResult);
        setRevenue(revenueResult);
        setTopServices(topServicesResult);
        setProductivity(productivityResult);
        setPeakHours(peakHoursResult);
        setTopClients(topClientsResult);
        setCancellation(cancellationResult);
      })
      .catch((err) => {
        if (cancelled) return;
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os relatórios");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, month, fromDate, toDate]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const serviceNames = new Map(services.map((s) => [s.id, s.name]));
  const userNames = new Map(users.map((u) => [u.id, `${u.firstName} ${u.lastName}`.trim()]));
  const employeeNames = new Map(employees.map((e) => [e.id, userNames.get(e.userId) ?? e.jobTitle]));
  const maxHourCount = Math.max(1, ...peakHours.map((h) => h.count));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Faturamento, serviços mais vendidos, produtividade, clientes, cancelamentos e
          horários de pico.
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <div>
            <CardTitle>Faturamento do mês</CardTitle>
            <CardDescription>Total de pagamentos confirmados no período.</CardDescription>
          </div>
          <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-9 w-40" />
          ) : (
            <p className="text-3xl font-semibold tracking-tight">
              {formatCurrency(revenue?.revenueCents ?? 0)}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-from-date">De</Label>
          <Input
            id="report-from-date"
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-40"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="report-to-date">Até</Label>
          <Input
            id="report-to-date"
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-40"
          />
        </div>
        <p className="pb-2 text-sm text-muted-foreground">
          Período usado nos relatórios de serviços, produtividade e horários abaixo.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Serviços mais vendidos</CardTitle>
          <CardDescription>Considera apenas agendamentos concluídos no período.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Serviço</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead>Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : topServices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Nenhum atendimento concluído no período.
                  </TableCell>
                </TableRow>
              ) : (
                topServices.map((metric) => (
                  <TableRow key={metric.serviceId}>
                    <TableCell className="font-medium">
                      {serviceNames.get(metric.serviceId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{metric.count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(metric.revenueCents)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Produtividade por profissional</CardTitle>
          <CardDescription>Considera apenas agendamentos concluídos no período.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profissional</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead>Faturamento</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 3 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : productivity.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                    Nenhum atendimento concluído no período.
                  </TableCell>
                </TableRow>
              ) : (
                productivity.map((metric) => (
                  <TableRow key={metric.employeeId}>
                    <TableCell className="font-medium">
                      {employeeNames.get(metric.employeeId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{metric.count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(metric.revenueCents)}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clientes que mais agendam</CardTitle>
          <CardDescription>Considera apenas atendimentos concluídos no período.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>Atendimentos</TableHead>
                <TableHead>Valor gasto</TableHead>
                <TableHead>Última visita</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 3 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 4 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-5 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : topClients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-muted-foreground">
                    Nenhum atendimento concluído no período.
                  </TableCell>
                </TableRow>
              ) : (
                topClients.map((metric) => (
                  <TableRow key={metric.clientId}>
                    <TableCell className="font-medium">
                      {userNames.get(metric.clientId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{metric.count}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatCurrency(metric.revenueCents)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(metric.lastVisitAt).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Taxa de cancelamento</CardTitle>
          <CardDescription>
            Sobre todos os agendamentos do período, concluídos ou não.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : !cancellation || cancellation.total === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum agendamento no período.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-4">
              <div>
                <p className="text-2xl font-semibold">
                  {Math.round(cancellation.cancellationRate * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Cancelados ({cancellation.cancelled})
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold">
                  {Math.round(cancellation.noShowRate * 100)}%
                </p>
                <p className="text-sm text-muted-foreground">
                  Não compareceu ({cancellation.noShow})
                </p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{cancellation.completed}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div>
                <p className="text-2xl font-semibold">{cancellation.total}</p>
                <p className="text-sm text-muted-foreground">Total no período</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horários de pico</CardTitle>
          <CardDescription>Distribuição de atendimentos concluídos por hora do dia.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : peakHours.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-8 text-muted-foreground">
              <BarChart3 className="size-8 opacity-50" />
              Nenhum atendimento concluído no período.
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {peakHours
                .slice()
                .sort((a, b) => a.hour - b.hour)
                .map((metric) => (
                  <div key={metric.hour} className="flex items-center gap-3">
                    <span className="w-14 text-sm text-muted-foreground">
                      {String(metric.hour).padStart(2, "0")}:00
                    </span>
                    <div className="h-4 flex-1 overflow-hidden rounded-sm bg-muted">
                      <div
                        className="h-full rounded-sm bg-primary"
                        style={{ width: `${(metric.count / maxHourCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-muted-foreground">{metric.count}</span>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
