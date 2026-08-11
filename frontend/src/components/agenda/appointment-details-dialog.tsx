"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Clock, Scissors, User, Zap } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { formatFullDate, formatTime } from "@/lib/booking/date-utils";
import { formatCentsToBRL } from "@/lib/booking/pricing";
import { STATUS_BADGE_VARIANT, STATUS_LABELS, TERMINAL_STATUSES } from "@/lib/agenda/status";
import type { AgendaAppointment } from "@/lib/agenda/types";

function InfoRow({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <Icon className="size-4 shrink-0 text-muted-foreground" />
      {children}
    </div>
  );
}

export function AppointmentDetailsDialog({
  appointment,
  open,
  onOpenChange,
  onConfirm,
  onNoShow,
  onCancel,
}: {
  appointment: AgendaAppointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (id: string) => Promise<void>;
  onNoShow: (id: string) => Promise<void>;
  onCancel: (id: string, reason: string) => Promise<void>;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | undefined>();

  useEffect(() => {
    if (open) {
      // Resets the dialog's local UI state whenever it opens for a (possibly
      // different) appointment, so stale cancel-form input never leaks in.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsCancelling(false);
      setReason("");
      setReasonError(undefined);
      setActionError(undefined);
    }
  }, [open, appointment?.id]);

  if (!appointment) return null;
  const currentAppointment = appointment;

  const isTerminal = TERMINAL_STATUSES.includes(appointment.status);
  const canMarkNoShow = new Date(appointment.startAt) <= new Date();

  async function run(action: () => Promise<void>) {
    setIsSubmitting(true);
    setActionError(undefined);
    try {
      await action();
      onOpenChange(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Não foi possível concluir a ação");
    } finally {
      setIsSubmitting(false);
    }
  }

  function submitCancel() {
    if (!reason.trim()) {
      setReasonError("Informe o motivo do cancelamento");
      return;
    }
    void run(() => onCancel(currentAppointment.id, reason));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {appointment.serviceName}
            {appointment.isFitIn && (
              <Badge variant="outline" className="gap-1">
                <Zap className="size-3" />
                Encaixe
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>{appointment.clientName}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2.5">
          <InfoRow icon={User}>{appointment.employeeName}</InfoRow>
          <InfoRow icon={CalendarDays}>{formatFullDate(appointment.startAt.slice(0, 10))}</InfoRow>
          <InfoRow icon={Clock}>
            {formatTime(appointment.startAt)} – {formatTime(appointment.endAt)}
          </InfoRow>
          <InfoRow icon={Scissors}>{formatCentsToBRL(appointment.priceCents)}</InfoRow>
          <div className="flex items-center gap-2 pt-1">
            <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
              {STATUS_LABELS[appointment.status]}
            </Badge>
            {appointment.status === "no_show" && appointment.noShowFeeCents !== null && (
              <span className="text-xs text-muted-foreground">
                Multa: {formatCentsToBRL(appointment.noShowFeeCents)}
              </span>
            )}
          </div>
          {appointment.status === "cancelled" && appointment.cancellationReason && (
            <Alert>
              <AlertDescription>Motivo: {appointment.cancellationReason}</AlertDescription>
            </Alert>
          )}
        </div>

        {isCancelling && (
          <Field data-invalid={!!reasonError}>
            <FieldLabel htmlFor="cancel-reason">Motivo do cancelamento</FieldLabel>
            <Textarea
              id="cancel-reason"
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                if (reasonError) setReasonError(undefined);
              }}
              placeholder="Ex: cliente remarcou por telefone"
              rows={3}
            />
            <FieldError errors={reasonError ? [{ message: reasonError }] : undefined} />
          </Field>
        )}

        {actionError && (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          {isTerminal || isCancelling ? null : (
            <div className="flex flex-wrap gap-2">
              {appointment.status === "pending" && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSubmitting}
                  onClick={() => void run(() => onConfirm(appointment.id))}
                >
                  Confirmar
                </Button>
              )}
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting || !canMarkNoShow}
                title={
                  canMarkNoShow ? undefined : "Só é possível marcar falta após o horário agendado"
                }
                onClick={() => void run(() => onNoShow(appointment.id))}
              >
                Marcar falta
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {isCancelling ? (
              <>
                <Button type="button" variant="ghost" onClick={() => setIsCancelling(false)}>
                  Voltar
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={submitCancel}
                >
                  Confirmar cancelamento
                </Button>
              </>
            ) : (
              !isTerminal && (
                <Button
                  type="button"
                  variant="destructive"
                  disabled={isSubmitting}
                  onClick={() => setIsCancelling(true)}
                >
                  Cancelar agendamento
                </Button>
              )
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
