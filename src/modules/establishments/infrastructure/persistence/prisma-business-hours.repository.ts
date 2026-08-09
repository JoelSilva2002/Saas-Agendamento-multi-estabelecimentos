import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { BusinessHoursDay } from '../../domain/entities/business-hours-day.entity';
import { BusinessHoursRepositoryPort } from '../../domain/business-hours.repository.port';

// @db.Time columns round-trip through Prisma as full JS Dates; only the time-of-day part
// is meaningful, so a fixed arbitrary date is used to carry "HH:mm" in and out.
const TIME_BASE_DATE = '1970-01-01';

function timeStringToDate(time: string | null): Date | null {
  return time ? new Date(`${TIME_BASE_DATE}T${time}:00.000Z`) : null;
}

function dateToTimeString(date: Date | null): string | null {
  if (!date) return null;
  return date.toISOString().slice(11, 16);
}

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
