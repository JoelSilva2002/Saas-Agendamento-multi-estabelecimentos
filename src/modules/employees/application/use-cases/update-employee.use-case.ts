import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeNotFoundError } from '../../domain/errors/employee-errors';

export interface UpdateEmployeeInput {
  establishmentId: string;
  employeeId: string;
  jobTitle?: string;
  hiredAt?: Date;
}

@Injectable()
export class UpdateEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepositoryPort) {}

  async execute(input: UpdateEmployeeInput): Promise<Employee> {
    const existing = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!existing) {
      throw new EmployeeNotFoundError(input.employeeId);
    }
    const updated = existing.update({ jobTitle: input.jobTitle, hiredAt: input.hiredAt });
    return this.employeeRepository.update(updated);
  }
}
