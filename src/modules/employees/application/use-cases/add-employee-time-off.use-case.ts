import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { EmployeeTimeOffRepositoryPort } from '../../domain/employee-time-off.repository.port';
import { EmployeeTimeOff, TimeOffType } from '../../domain/entities/employee-time-off.entity';
import { EmployeeNotFoundError } from '../../domain/errors/employee-errors';

export interface AddEmployeeTimeOffInput {
  establishmentId: string;
  employeeId: string;
  type: TimeOffType;
  startAt: Date;
  endAt: Date;
  notes?: string;
}

@Injectable()
export class AddEmployeeTimeOffUseCase {
  constructor(
    private readonly employeeRepository: EmployeeRepositoryPort,
    private readonly timeOffRepository: EmployeeTimeOffRepositoryPort,
  ) {}

  async execute(input: AddEmployeeTimeOffInput): Promise<EmployeeTimeOff> {
    const employee = await this.employeeRepository.findById(input.employeeId, input.establishmentId);
    if (!employee) {
      throw new EmployeeNotFoundError(input.employeeId);
    }

    const timeOff = EmployeeTimeOff.create({
      id: randomUUID(),
      employeeId: input.employeeId,
      type: input.type,
      startAt: input.startAt,
      endAt: input.endAt,
      notes: input.notes,
    });

    return this.timeOffRepository.create(timeOff);
  }
}
