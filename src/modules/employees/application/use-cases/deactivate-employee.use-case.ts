import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeNotFoundError } from '../../domain/errors/employee-errors';

export interface DeactivateEmployeeInput {
  establishmentId: string;
  employeeId: string;
}

@Injectable()
export class DeactivateEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepositoryPort) {}

  async execute(input: DeactivateEmployeeInput): Promise<Employee> {
    const existing = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!existing) {
      throw new EmployeeNotFoundError(input.employeeId);
    }
    return this.employeeRepository.update(existing.deactivate());
  }
}
