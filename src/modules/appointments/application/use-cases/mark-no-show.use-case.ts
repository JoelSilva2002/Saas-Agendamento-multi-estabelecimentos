import { Injectable } from '@nestjs/common';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentInFutureError,
  AppointmentNotFoundError,
} from '../../domain/errors/appointment-errors';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../../establishments/domain/errors/establishment-errors';

export interface MarkNoShowInput {
  tenantId: string;
  establishmentId: string;
  appointmentId: string;
}

@Injectable()
export class MarkNoShowUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
  ) {}

  async execute(input: MarkNoShowInput): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    if (appointment.startAt.getTime() > Date.now()) {
      throw new AppointmentInFutureError();
    }

    const establishment = await this.establishmentRepository.findById(
      input.establishmentId,
      input.tenantId,
    );
    if (!establishment) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const noShowFeeCents =
      establishment.noShowFeeEnabled && establishment.noShowFeePercentage
        ? Math.round((appointment.priceCents * establishment.noShowFeePercentage) / 100)
        : null;

    const updated = appointment.markNoShow(noShowFeeCents);
    return this.appointmentRepository.update(updated);
  }
}
