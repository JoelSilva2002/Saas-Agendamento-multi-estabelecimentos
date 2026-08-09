import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeNotFoundError } from '../../domain/errors/employee-errors';

export interface GetEmployeeInput {
  establishmentId: string;
  employeeId: string;
}

@Injectable()
export class GetEmployeeUseCase {
  constructor(private readonly employeeRepository: EmployeeRepositoryPort) {}

  async execute(input: GetEmployeeInput): Promise<Employee> {
    const employee = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!employee) {
      throw new EmployeeNotFoundError(input.employeeId);
    }
    return employee;
  }
}
