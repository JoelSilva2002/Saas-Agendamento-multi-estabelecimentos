import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../../config/configuration';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentNotFoundError,
  InvalidCheckInTokenError,
} from '../../domain/errors/appointment-errors';
import { verifyCheckInToken } from '../../domain/services/checkin-token.util';

export interface CheckInAppointmentInput {
  establishmentId: string;
  appointmentId: string;
  token: string;
}

@Injectable()
export class CheckInAppointmentUseCase {
  constructor(
    private readonly appointmentRepository: AppointmentRepositoryPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(input: CheckInAppointmentInput): Promise<Appointment> {
    const appointment = await this.appointmentRepository.findById(
      input.appointmentId,
      input.establishmentId,
    );
    if (!appointment) {
      throw new AppointmentNotFoundError(input.appointmentId);
    }

    const secret = this.configService.get('jwt', { infer: true }).accessSecret;
    if (!verifyCheckInToken(appointment.id, input.token, secret)) {
      throw new InvalidCheckInTokenError();
    }

    return this.appointmentRepository.update(appointment.checkIn());
  }
}
