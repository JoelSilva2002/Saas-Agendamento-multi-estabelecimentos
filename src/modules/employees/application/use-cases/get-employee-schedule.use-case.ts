import { Injectable } from '@nestjs/common';
import { EmployeeScheduleRepositoryPort } from '../../domain/employee-schedule.repository.port';
import { EmployeeScheduleSlot } from '../../domain/entities/employee-schedule-slot.entity';

@Injectable()
export class GetEmployeeScheduleUseCase {
  constructor(private readonly scheduleRepository: EmployeeScheduleRepositoryPort) {}

  async execute(employeeId: string): Promise<EmployeeScheduleSlot[]> {
    return this.scheduleRepository.findAllByEmployee(employeeId);
  }
}
