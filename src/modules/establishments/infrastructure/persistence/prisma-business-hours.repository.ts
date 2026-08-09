import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { dateToTimeString, timeStringToDate } from '../../../../shared-kernel/infrastructure/time-of-day.util';
import { BusinessHoursDay } from '../../domain/entities/business-hours-day.entity';
import { BusinessHoursRepositoryPort } from '../../domain/business-hours.repository.port';

@Injectable()
export class PrismaBusinessHoursRepository implements BusinessHoursRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findAllByEstablishment(establishmentId: string): Promise<BusinessHoursDay[]> {
    const records = await this.prisma.establishmentBusinessHours.findMany({
      where: { establishmentId },
      orderBy: { weekday: 'asc' },
    });
    return records.map((record) =>
      BusinessHoursDay.fromPersistence({
        weekday: record.weekday,
        isClosed: record.isClosed,
        openTime: dateToTimeString(record.openTime),
        closeTime: dateToTimeString(record.closeTime),
      }),
    );
  }

  async replaceAll(establishmentId: string, days: BusinessHoursDay[]): Promise<BusinessHoursDay[]> {
    await this.prisma.$transaction([
      this.prisma.establishmentBusinessHours.deleteMany({ where: { establishmentId } }),
      this.prisma.establishmentBusinessHours.createMany({
        data: days.map((day) => ({
          establishmentId,
          weekday: day.weekday,
          isClosed: day.isClosed,
          openTime: timeStringToDate(day.openTime),
          closeTime: timeStringToDate(day.closeTime),
        })),
      }),
    ]);

    return this.findAllByEstablishment(establishmentId);
  }
}
