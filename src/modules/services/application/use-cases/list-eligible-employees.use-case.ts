import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { ServiceNotFoundError } from '../../domain/errors/service-errors';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { Employee } from '../../../employees/domain/entities/employee.entity';

export interface ListEligibleEmployeesInput {
  establishmentId: string;
  serviceId: string;
}

@Injectable()
export class ListEligibleEmployeesUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(input: ListEligibleEmployeesInput): Promise<Employee[]> {
    const service = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!service) {
      throw new ServiceNotFoundError(input.serviceId);
    }

    const eligibleEmployeeIds = new Set(
      await this.serviceRepository.findEligibleEmployeeIds(input.serviceId),
    );
    const employees = await this.employeeRepository.findAllByEstablishment(input.establishmentId);
    return employees.filter(
      (employee) => eligibleEmployeeIds.has(employee.id) && employee.status === 'active',
    );
  }
}
