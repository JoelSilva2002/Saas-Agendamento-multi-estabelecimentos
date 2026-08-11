// Mirrors AppointmentsController.toAppointmentResponse — bare FK ids, no embedded names.
// "confirmed" is intentionally absent: no backend transition ever sets it (see
// frontend/src/lib/agenda/real-api.ts for the hydration layer that joins names in).
export type AppointmentStatus = "pending" | "in_progress" | "completed" | "cancelled" | "no_show";

export type Appointment = {
  id: string;
  establishmentId: string;
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  priceCents: number;
  isFitIn: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  cancelledById: string | null;
  noShowFeeCents: number | null;
};

export type ListAppointmentsParams = {
  fromDate?: string;
  toDate?: string;
  employeeId?: string;
  clientId?: string;
  status?: AppointmentStatus;
};

export type CreateAppointmentInput = {
  clientId: string;
  employeeId: string;
  serviceId: string;
  startAt: string;
  isFitIn?: boolean;
};
