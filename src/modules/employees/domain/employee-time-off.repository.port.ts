import { EmployeeTimeOff } from './entities/employee-time-off.entity';

export abstract class EmployeeTimeOffRepositoryPort {
  abstract create(timeOff: EmployeeTimeOff): Promise<EmployeeTimeOff>;
  abstract findAllByEmployee(employeeId: string): Promise<EmployeeTimeOff[]>;
  abstract findById(id: string, employeeId: string): Promise<EmployeeTimeOff | null>;
  abstract delete(id: string, employeeId: string): Promise<void>;
}
