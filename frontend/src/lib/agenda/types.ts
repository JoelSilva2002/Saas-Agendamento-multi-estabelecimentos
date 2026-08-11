// Mirrors the real AppointmentResponse shape (see modules/appointments) plus
// mock-only *Name fields — the real API returns bare clientId/employeeId/
// serviceId with no embedded names (confirmed gap), so a real integration
// must join these client-side exactly like the mock does here.
export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type AgendaAppointment = {
  id: string;
  clientId: string;
  clientName: string;
  employeeId: string;
  employeeName: string;
  serviceId: string;
  serviceName: string;
  startAt: string; // ISO
  endAt: string; // ISO
  status: AppointmentStatus;
  priceCents: number;
  isFitIn: boolean;
  cancellationReason: string | null;
  cancelledAt: string | null;
  noShowFeeCents: number | null;
};

// Mirrors the `AgendaBlock` Prisma model, which is schema-only today — no
// module/controller/use-case implements it anywhere in the backend yet. This
// mock simulates the intended shape; treat create/delete here as a backend
// TODO, not an existing integration.
export type AgendaBlock = {
  id: string;
  employeeId: string | null; // null = blocks the whole establishment
  startAt: string;
  endAt: string;
  reason: string | null;
};

export type CreateFitInInput = {
  clientId: string;
  serviceId: string;
  employeeId: string;
  startAt: string; // ISO — deliberately not constrained to the availability grid
};

export type CreateBlockInput = {
  employeeId: string | null;
  startAt: string;
  endAt: string;
  reason?: string;
};

export type AgendaApi = {
  listAppointments(range: { fromDate: string; toDate: string }): Promise<AgendaAppointment[]>;
  listBlocks(range: { fromDate: string; toDate: string }): Promise<AgendaBlock[]>;
  createFitIn(input: CreateFitInInput): Promise<AgendaAppointment>;
  createBlock(input: CreateBlockInput): Promise<AgendaBlock>;
  deleteBlock(id: string): Promise<void>;
  // No real `PATCH .../confirm` endpoint exists — `confirmed` is a dead
  // status value in the current backend (appointments are created directly
  // as `pending` and the only way out is check-in/cancel/no-show). Kept here
  // so the UI can offer the action the task asked for; flagged clearly so it
  // isn't mistaken for a real integration.
  confirmAppointment(id: string): Promise<AgendaAppointment>;
  markNoShow(id: string): Promise<AgendaAppointment>;
  cancelAppointment(id: string, reason: string): Promise<AgendaAppointment>;
};
