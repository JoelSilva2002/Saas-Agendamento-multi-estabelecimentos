import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { EmployeeScheduleSlot } from '../../domain/entities/employee-schedule-slot.entity';
import { EmployeeScheduleRepositoryPort } from '../../domain/employee-schedule.repository.port';

const TIME_BASE_DATE = '1970-01-01';

function timeStringToDate(time: string): Date {
  return new Date(`${TIME_BASE_DATE}T${time}:00.000Z`);
}

function dateToTimeString(date: Date): string {
  return date.toISOString().slice(11, 16);
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
        startTime: dateToTimeString(record.startTime),
        endTime: dateToTimeString(record.endTime),
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
          startTime: timeStringToDate(slot.startTime),
          endTime: timeStringToDate(slot.endTime),
        })),
      }),
    ]);

    return this.findAllByEmployee(employeeId);
  }
}
