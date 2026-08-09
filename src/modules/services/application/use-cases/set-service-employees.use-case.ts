import { Injectable } from '@nestjs/common';
import { ServiceRepositoryPort } from '../../domain/service.repository.port';
import { EmployeeRepositoryPort } from '../../../employees/domain/employee.repository.port';
import { ServiceNotFoundError, InvalidServiceEmployeeError } from '../../domain/errors/service-errors';

export interface SetServiceEmployeesInput {
  establishmentId: string;
  serviceId: string;
  employeeIds: string[];
}

@Injectable()
export class SetServiceEmployeesUseCase {
  constructor(
    private readonly serviceRepository: ServiceRepositoryPort,
    private readonly employeeRepository: EmployeeRepositoryPort,
  ) {}

  async execute(input: SetServiceEmployeesInput): Promise<string[]> {
    const service = await this.serviceRepository.findById(input.serviceId, input.establishmentId);
    if (!service) {
      throw new ServiceNotFoundError(input.serviceId);
    }

    const uniqueEmployeeIds = [...new Set(input.employeeIds)];
    for (const employeeId of uniqueEmployeeIds) {
      const belongs = await this.employeeRepository.existsInEstablishment(employeeId, input.establishmentId);
      if (!belongs) {
        throw new InvalidServiceEmployeeError(employeeId);
      }
    }

    await this.serviceRepository.replaceEligibleEmployees(input.serviceId, uniqueEmployeeIds);
    return uniqueEmployeeIds;
  }
}
