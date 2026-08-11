import { readableForeground } from "@/lib/color";
import { MOCK_EMPLOYEES } from "@/lib/mock-data/catalog";
import type { AppointmentStatus } from "./types";

// A small qualitative palette, one hue per employee — distinct enough to
// scan quickly when Diária/Semanal/Mensal merge every professional's
// appointments into one calendar.
const EMPLOYEE_PALETTE = ["#4f46e5", "#0ea5e9", "#16a34a", "#d97706", "#db2777", "#7c3aed"];

const employeeColorById = new Map<string, string>(
  MOCK_EMPLOYEES.map((employee, index) => [
    employee.id,
    EMPLOYEE_PALETTE[index % EMPLOYEE_PALETTE.length],
  ]),
);

export function getEmployeeColor(employeeId: string): string {
  return employeeColorById.get(employeeId) ?? "#64748b";
}

export function getEmployeeEventColors(employeeId: string) {
  const backgroundColor = getEmployeeColor(employeeId);
  return {
    backgroundColor,
    borderColor: backgroundColor,
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

export const EMPLOYEE_LEGEND = MOCK_EMPLOYEES.map((employee) => ({
  id: employee.id,
  displayName: employee.displayName,
  color: getEmployeeColor(employee.id),
}));
