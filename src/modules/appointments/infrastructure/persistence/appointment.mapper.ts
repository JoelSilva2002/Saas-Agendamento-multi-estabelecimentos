import { Appointment as PrismaAppointment } from '@prisma/client';
import { Appointment } from '../../domain/entities/appointment.entity';

export class AppointmentMapper {
  static toDomain(record: PrismaAppointment): Appointment {
    return Appointment.fromPersistence({
      id: record.id,
      establishmentId: record.establishmentId,
      clientId: record.clientId,
      employeeId: record.employeeId,
      serviceId: record.serviceId,
      startAt: record.startAt,
      endAt: record.endAt,
      status: record.status,
      priceCents: record.priceCents,
      isFitIn: record.isFitIn,
      cancellationReason: record.cancellationReason,
      cancelledAt: record.cancelledAt,
      cancelledById: record.cancelledById,
      createdById: record.createdById,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }
}
