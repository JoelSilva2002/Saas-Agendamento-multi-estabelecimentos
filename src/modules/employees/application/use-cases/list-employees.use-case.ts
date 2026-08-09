import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';

@Injectable()
export class ListEmployeesUseCase {
  constructor(private readonly employeeRepository: EmployeeRepositoryPort) {}

  async execute(establishmentId: string): Promise<Employee[]> {
    return this.employeeRepository.findAllByEstablishment(establishmentId);
  }
}
