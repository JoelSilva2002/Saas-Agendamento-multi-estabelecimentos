import { GetAppointmentUseCase } from './get-appointment.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
} from '../../domain/errors/appointment-errors';

describe('GetAppointmentUseCase', () => {
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
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    return { useCase: new GetAppointmentUseCase(appointmentRepository) };
  }

  it('returns the appointment for staff regardless of the client', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      actingUserId: 'staff-1',
      isStaff: true,
    });
    expect(result.id).toBe('appointment-1');
  });

  it('returns the appointment for the owning client', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
      actingUserId: 'client-1',
      isStaff: false,
    });
    expect(result.id).toBe('appointment-1');
  });

  it('throws AppointmentAccessDeniedError for a different client', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        appointmentId: 'appointment-1',
        actingUserId: 'other-client',
        isStaff: false,
      }),
    ).rejects.toThrow(AppointmentAccessDeniedError);
  });

  it('throws AppointmentNotFoundError when missing', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        appointmentId: 'x',
        actingUserId: 'client-1',
        isStaff: false,
      }),
    ).rejects.toThrow(AppointmentNotFoundError);
  });
});
