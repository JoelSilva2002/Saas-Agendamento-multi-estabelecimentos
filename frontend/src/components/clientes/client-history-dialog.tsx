"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ApiError } from "@/lib/api/client";
import { STATUS_BADGE_VARIANT, STATUS_LABELS } from "@/lib/agenda/status";
import type { Appointment } from "@/lib/appointments/types";

export function ClientHistoryDialog({
  open,
  onOpenChange,
  clientName,
  getHistory,
  serviceNames,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
  getHistory: () => Promise<Appointment[]>;
  serviceNames: Map<string, string>;
}) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    getHistory()
      .then(setAppointments)
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Não foi possível carregar o histórico");
      })
      .finally(() => setIsLoading(false));
  }, [open, getHistory]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Histórico de {clientName || "cliente"}</DialogTitle>
        </DialogHeader>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Serviço</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Status</TableHead>
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
            ) : appointments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                  Nenhum agendamento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              appointments
                .slice()
                .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
                .map((appointment) => (
                  <TableRow key={appointment.id}>
                    <TableCell className="font-medium">
                      {serviceNames.get(appointment.serviceId) ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(appointment.startAt).toLocaleString("pt-BR")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE_VARIANT[appointment.status]}>
                        {STATUS_LABELS[appointment.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
            )}
          </TableBody>
        </Table>
      </DialogContent>
    </Dialog>
  );
}
