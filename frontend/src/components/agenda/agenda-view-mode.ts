export type AgendaViewMode = "day" | "week" | "month" | "professional";

export const AGENDA_VIEW_MODES: { value: AgendaViewMode; label: string }[] = [
  { value: "day", label: "Diária" },
  { value: "week", label: "Semanal" },
  { value: "month", label: "Mensal" },
  { value: "professional", label: "Por Profissional" },
];
