"use client";

import { CreditCard, Receipt } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import type { Appointment } from "@/lib/appointments/types";
import { listAppointments } from "@/lib/appointments/api";
import { getSessionContext } from "@/lib/auth/session-context";
import { createPayment, listPayments, markPaymentPaid } from "@/lib/payments/api";
import type { CreatePaymentInput, Payment, PaymentStatus } from "@/lib/payments/types";
import { listServices } from "@/lib/services/api";
import type { CatalogService } from "@/lib/services/types";
import { listTenantUsers } from "@/lib/users/api";
import type { TenantUser } from "@/lib/users/types";

import { PaymentFormDialog } from "./payment-form-dialog";

const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
  cancelled: "Cancelado",
};

const METHOD_LABEL: Record<Payment["method"], string> = {
  pix: "Pix",
  card: "Cartão",
  cash: "Dinheiro",
};

const ALL_STATUS_VALUE = "all";

const APPOINTMENT_WINDOW_DAYS = 60;

function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function PagamentosScreen() {
  const [session] = useState(() => getSessionContext());
  const [payments, setPayments] = useState<Payment[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<TenantUser[]>([]);
  const [services, setServices] = useState<CatalogService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | typeof ALL_STATUS_VALUE>(ALL_STATUS_VALUE);

  const [formOpen, setFormOpen] = useState(false);
  const [markPaidTarget, setMarkPaidTarget] = useState<string | null>(null);

  async function load(status: PaymentStatus | typeof ALL_STATUS_VALUE) {
    if (!session) return;
    setIsLoading(true);
    try {
      const now = new Date();
      const fromDate = new Date(now);
      fromDate.setDate(fromDate.getDate() - APPOINTMENT_WINDOW_DAYS);
      const toDate = new Date(now);
      toDate.setDate(toDate.getDate() + APPOINTMENT_WINDOW_DAYS);

      const [paymentsResult, appointmentsResult, clientsResult, servicesResult] = await Promise.all([
        listPayments(session.tenantId, session.establishmentId, {
          status: status === ALL_STATUS_VALUE ? undefined : status,
        }),
        listAppointments(session.tenantId, session.establishmentId, {
          fromDate: toIsoDate(fromDate),
          toDate: toIsoDate(toDate),
        }),
        listTenantUsers(session.tenantId),
        listServices(session.tenantId, session.establishmentId),
      ]);
      setPayments(paymentsResult);
      setAppointments(appointmentsResult);
      setClients(clientsResult);
      setServices(servicesResult);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar os pagamentos");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void load(statusFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  if (!session) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          Não foi possível determinar o estabelecimento atual. Saia e entre novamente.
        </AlertDescription>
      </Alert>
    );
  }

  const appointmentsById = new Map(appointments.map((a) => [a.id, a]));
  const clientNames = new Map(clients.map((c) => [c.id, `${c.firstName} ${c.lastName}`.trim()]));
  const serviceNames = new Map(services.map((s) => [s.id, s.name]));

  function appointmentLabel(appointment: Appointment): string {
    const client = clientNames.get(appointment.clientId) ?? "Cliente";
    const service = serviceNames.get(appointment.serviceId) ?? "Serviço";
    const date = new Date(appointment.startAt).toLocaleString("pt-BR");
    return `${client} — ${service} — ${date}`;
  }

  function paymentAppointmentLabel(payment: Payment): string {
    const appointment = appointmentsById.get(payment.appointmentId);
    if (!appointment) return payment.appointmentId;
    const client = clientNames.get(appointment.clientId) ?? "Cliente";
    const service = serviceNames.get(appointment.serviceId) ?? "Serviço";
    return `${client} — ${service}`;
  }

  async function handleCreate(values: CreatePaymentInput) {
    if (!session) throw new Error("Sessão não encontrada");
    await createPayment(session.tenantId, session.establishmentId, values);
    await load(statusFilter);
  }

  async function handleMarkPaid(paymentId: string) {
    if (!session) return;
    setMarkPaidTarget(paymentId);
    try {
      await markPaymentPaid(session.tenantId, session.establishmentId, paymentId);
      toast.success("Pagamento marcado como pago");
      await load(statusFilter);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Não foi possível atualizar o pagamento");
    } finally {
      setMarkPaidTarget(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Pagamentos</h1>
          <p className="text-sm text-muted-foreground">Cobranças, status de pagamento e aplicação de cupons.</p>
        </div>
        <Button onClick={() => setFormOpen(true)}>
          <CreditCard />
          Registrar pagamento
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaymentStatus)}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS_VALUE}>Todos</SelectItem>
            {Object.entries(STATUS_LABEL).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Agendamento</TableHead>
              <TableHead>Método</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Pago em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((__, j) => (
                    <TableCell key={j}>
                      <Skeleton className="h-5 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : payments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Receipt className="size-8 opacity-50" />
                    Nenhum pagamento registrado.
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              payments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell className="font-medium">{paymentAppointmentLabel(payment)}</TableCell>
                  <TableCell className="text-muted-foreground">{METHOD_LABEL[payment.method]}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {(payment.amountCents / 100).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </TableCell>
                  <TableCell>
                    <Badge variant={payment.status === "paid" ? "default" : "secondary"}>
                      {STATUS_LABEL[payment.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {payment.paidAt ? new Date(payment.paidAt).toLocaleString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    {payment.status === "pending" && (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={markPaidTarget === payment.id}
                        onClick={() => handleMarkPaid(payment.id)}
                      >
                        {markPaidTarget === payment.id ? "Marcando..." : "Marcar como pago"}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <PaymentFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        appointments={appointments}
        appointmentLabel={appointmentLabel}
        onSubmit={handleCreate}
      />
    </div>
  );
}
