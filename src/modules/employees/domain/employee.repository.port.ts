import { Employee } from './entities/employee.entity';

export abstract class EmployeeRepositoryPort {
  abstract create(employee: Employee): Promise<Employee>;

  abstract findById(id: string, establishmentId: string): Promise<Employee | null>;

  abstract findByUserAndEstablishment(userId: string, establishmentId: string): Promise<Employee | null>;

  abstract findAllByEstablishment(establishmentId: string): Promise<Employee[]>;

  abstract update(employee: Employee): Promise<Employee>;

  /** Existence check (active or inactive) without loading the full entity — used by the
   * Services module to validate an employeeId belongs to the establishment before linking
   * it to a service. */
  abstract existsInEstablishment(id: string, establishmentId: string): Promise<boolean>;
}
