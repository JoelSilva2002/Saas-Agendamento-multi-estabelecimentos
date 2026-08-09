import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { dateToTimeString, timeStringToDate } from '../../../../shared-kernel/infrastructure/time-of-day.util';
import { EmployeeScheduleSlot } from '../../domain/entities/employee-schedule-slot.entity';
import { EmployeeScheduleRepositoryPort } from '../../domain/employee-schedule.repository.port';

// Schedule slots always have a non-null startTime/endTime (unlike business hours, which
// allows nulls for closed days) — these thin wrappers keep that non-null guarantee typed.
function requiredTimeStringToDate(time: string): Date {
  return timeStringToDate(time) as Date;
}

function requiredDateToTimeString(date: Date): string {
  return dateToTimeString(date) as string;
}

@Injectable()
export class PrismaEmployeeScheduleRepository implements EmployeeScheduleRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEmployee(employeeId: string): Promise<EmployeeScheduleSlot[]> {
    const records = await this.prisma.employeeScheduleSlot.findMany({
      where: { employeeId },
      orderBy: [{ weekday: 'asc' }, { startTime: 'asc' }],
    });
    return records.map((record) =>
      EmployeeScheduleSlot.fromPersistence({
        weekday: record.weekday,
        slotType: record.slotType,
        startTime: requiredDateToTimeString(record.startTime),
        endTime: requiredDateToTimeString(record.endTime),
      }),
    );
  }

  async replaceAll(employeeId: string, slots: EmployeeScheduleSlot[]): Promise<EmployeeScheduleSlot[]> {
    await this.prisma.$transaction([
      this.prisma.employeeScheduleSlot.deleteMany({ where: { employeeId } }),
      this.prisma.employeeScheduleSlot.createMany({
        data: slots.map((slot) => ({
          employeeId,
          weekday: slot.weekday,
          slotType: slot.slotType,
          startTime: requiredTimeStringToDate(slot.startTime),
          endTime: requiredTimeStringToDate(slot.endTime),
        })),
      }),
    ]);

    return this.findAllByEmployee(employeeId);
  }
}
