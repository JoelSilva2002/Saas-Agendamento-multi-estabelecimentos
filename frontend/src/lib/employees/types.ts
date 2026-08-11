export type EmployeeStatus = "active" | "inactive";

// No name field — the backend Employee entity only knows userId; a display name comes from
// cross-referencing the tenant users list (see @/lib/users/api.ts).
export type Employee = {
  id: string;
  establishmentId: string;
  userId: string;
  jobTitle: string;
  status: EmployeeStatus;
  hiredAt: string | null;
};

export type CreateEmployeeInput = {
  userId: string;
  jobTitle: string;
  hiredAt?: string;
};

export type UpdateEmployeeInput = {
  jobTitle?: string;
  hiredAt?: string;
};

export type ScheduleSlotType = "working" | "break";

export type ScheduleSlot = {
  weekday: number; // 0=Sunday .. 6=Saturday
  slotType: ScheduleSlotType;
  startTime: string;
  endTime: string;
};
