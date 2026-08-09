import { Injectable } from '@nestjs/common';
import { EmployeeTimeOffRepositoryPort } from '../../domain/employee-time-off.repository.port';
import { EmployeeTimeOffNotFoundError } from '../../domain/errors/employee-errors';

export interface RemoveEmployeeTimeOffInput {
  employeeId: string;
  timeOffId: string;
}

@Injectable()
export class RemoveEmployeeTimeOffUseCase {
  constructor(private readonly timeOffRepository: EmployeeTimeOffRepositoryPort) {}

  async execute(input: RemoveEmployeeTimeOffInput): Promise<void> {
    const existing = await this.timeOffRepository.findById(input.timeOffId, input.employeeId);
    if (!existing) {
      throw new EmployeeTimeOffNotFoundError(input.timeOffId);
    }
    await this.timeOffRepository.delete(input.timeOffId, input.employeeId);
  }
}
