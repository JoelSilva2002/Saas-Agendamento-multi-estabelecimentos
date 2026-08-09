import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { Employee } from '../../domain/entities/employee.entity';
import { UserNotMemberOfEstablishmentError } from '../../domain/errors/employee-errors';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';

export interface CreateEmployeeInput {
  tenantId: string;
  establishmentId: string;
  userId: string;
  jobTitle: string;
  hiredAt?: Date;
}

@Injectable()
export class CreateEmployeeUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(input: CreateEmployeeInput): Promise<Employee> {
    const isTenantMember = await this.userRepository.existsInTenant(input.userId, input.tenantId);
    if (!isTenantMember) {
      throw new UserNotMemberOfEstablishmentError(input.userId, input.establishmentId);
    }

    const employee = Employee.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      userId: input.userId,
      jobTitle: input.jobTitle,
      hiredAt: input.hiredAt,
    });

    return this.employeeRepository.create(employee);
  }
}
