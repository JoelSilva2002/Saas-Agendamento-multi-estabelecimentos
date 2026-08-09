import { EmployeeScheduleSlot } from './entities/employee-schedule-slot.entity';

export abstract class EmployeeScheduleRepositoryPort {
  abstract findAllByEmployee(employeeId: string): Promise<EmployeeScheduleSlot[]>;

  /** Replaces the entire weekly schedule in one transaction — same "edit as a set" pattern
   * used for Establishment business hours. */
  abstract replaceAll(employeeId: string, slots: EmployeeScheduleSlot[]): Promise<EmployeeScheduleSlot[]>;
}
