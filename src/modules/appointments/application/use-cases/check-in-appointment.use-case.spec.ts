import { ConfigService } from '@nestjs/config';
import { CheckInAppointmentUseCase } from './check-in-appointment.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentNotFoundError,
  InvalidCheckInTokenError,
} from '../../domain/errors/appointment-errors';
import { computeCheckInToken } from '../../domain/services/checkin-token.util';

describe('CheckInAppointmentUseCase', () => {
  const SECRET = 'test-secret';

  const appointment = Appointment.create({
    id: 'appointment-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T10:00:00.000Z'),
    endAt: new Date('2026-03-10T10:30:00.000Z'),
    priceCents: 5000,
    createdById: 'staff-1',
  });

  function build(overrides?: { appointmentRepository?: Partial<AppointmentRepositoryPort> }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(appointment),
      update: jest.fn().mockImplementation((a: Appointment) => Promise.resolve(a)),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const configService = {
      get: jest.fn().mockReturnValue({ accessSecret: SECRET }),
    } as unknown as ConfigService;

    return {
      useCase: new CheckInAppointmentUseCase(appointmentRepository, configService as never),
      appointmentRepository,
    };
  }

  it('checks the appointment in with a valid token', async () => {
    const { useCase } = build();
    const token = computeCheckInToken('appointment-1', SECRET);
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      token,
    });
    expect(result.status).toBe('in_progress');
  });

  it('throws InvalidCheckInTokenError for a wrong token', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        token: 'wrong',
      }),
    ).rejects.toThrow(InvalidCheckInTokenError);
  });

  it('throws AppointmentNotFoundError when missing', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        appointmentId: 'x',
        token: 'anything',
      }),
    ).rejects.toThrow(AppointmentNotFoundError);
  });
});
