import { CompleteAppointmentUseCase } from './complete-appointment.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { AppointmentNotFoundError } from '../../domain/errors/appointment-errors';

describe('CompleteAppointmentUseCase', () => {
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

    return {
      useCase: new CompleteAppointmentUseCase(appointmentRepository),
      appointmentRepository,
    };
  }

  it('marks the appointment as completed', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      appointmentId: 'appointment-1',
    });
    expect(result.status).toBe('completed');
  });

  it('throws AppointmentNotFoundError when missing', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      useCase.execute({ establishmentId: 'establishment-1', appointmentId: 'x' }),
    ).rejects.toThrow(AppointmentNotFoundError);
  });
});
