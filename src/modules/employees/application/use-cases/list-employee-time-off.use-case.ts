import { Injectable } from '@nestjs/common';
import { EmployeeTimeOffRepositoryPort } from '../../domain/employee-time-off.repository.port';
import { EmployeeTimeOff } from '../../domain/entities/employee-time-off.entity';

@Injectable()
export class ListEmployeeTimeOffUseCase {
  constructor(private readonly timeOffRepository: EmployeeTimeOffRepositoryPort) {}

  async execute(employeeId: string): Promise<EmployeeTimeOff[]> {
    return this.timeOffRepository.findAllByEmployee(employeeId);
  }
}
