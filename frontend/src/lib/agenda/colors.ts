import { readableForeground } from "@/lib/color";
import type { AppointmentStatus } from "./types";

// A small qualitative palette, one hue per employee — distinct enough to
// scan quickly when Diária/Semanal/Mensal merge every professional's
// appointments into one calendar.
const EMPLOYEE_PALETTE = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#db2777", "#7c3aed"];

export type EmployeeColorMap = Map<string, string>;

// Built from the real fetched employee list (order determines the palette index) — there is
// no fixed mock roster anymore, so this can't be a module-level constant.
export function buildEmployeeColorMap(employees: { id: string }[]): EmployeeColorMap {
  return new Map(
    employees.map((employee, index) => [employee.id, EMPLOYEE_PALETTE[index % EMPLOYEE_PALETTE.length]]),
  );
}

export function getEmployeeColor(colorMap: EmployeeColorMap, employeeId: string): string {
  return colorMap.get(employeeId) ?? "#64748b";
}

// Status fill (what happened) + employee border (who) — both dimensions of the color-coding
// requirement stay visible on the same event instead of picking one or the other.
const STATUS_FILL: Record<AppointmentStatus, string> = {
  pending: "#f59e0b",
  in_progress: "#3b82f6",
  completed: "#22c55e",
  cancelled: "#94a3b8",
  no_show: "#ef4444",
};

export function getAppointmentEventColors(
  colorMap: EmployeeColorMap,
  employeeId: string,
  status: AppointmentStatus,
) {
  const backgroundColor = STATUS_FILL[status];
  return {
    backgroundColor,
    borderColor: getEmployeeColor(colorMap, employeeId),
    textColor: readableForeground(backgroundColor),
  };
}

// Cancelled/no-show appointments stay visible (staff need to see the gap
// happened) but visually recede so active appointments stand out.
export function getStatusClassNames(status: AppointmentStatus): string[] {
  if (status === "cancelled" || status === "no_show") {
    return ["opacity-50", "line-through"];
  }
  return [];
}

export function buildEmployeeLegend(
  colorMap: EmployeeColorMap,
  employees: { id: string; displayName: string }[],
) {
  return employees.map((employee) => ({
    id: employee.id,
    displayName: employee.displayName,
    color: getEmployeeColor(colorMap, employee.id),
  }));
}
