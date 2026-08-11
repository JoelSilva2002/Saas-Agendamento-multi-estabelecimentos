import type { AppointmentStatus } from "./types";

export const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Pendente",
  in_progress: "Em atendimento",
  completed: "Concluído",
  cancelled: "Cancelado",
  no_show: "Não compareceu",
};

export const STATUS_BADGE_VARIANT: Record<
  AppointmentStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  in_progress: "default",
  completed: "outline",
  cancelled: "destructive",
  no_show: "destructive",
};

export const TERMINAL_STATUSES: AppointmentStatus[] = ["completed", "cancelled", "no_show"];
