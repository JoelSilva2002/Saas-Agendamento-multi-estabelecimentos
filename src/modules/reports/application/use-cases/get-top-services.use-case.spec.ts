import { GetTopServicesUseCase } from './get-top-services.use-case';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';

describe('GetTopServicesUseCase', () => {
  function buildAppointment(
    serviceId: string,
    priceCents: number,
    status: Appointment['status'],
  ): Appointment {
    const appointment = Appointment.create({
      id: `appointment-${Math.random()}`,
      establishmentId: 'establishment-1',
      clientId: 'client-1',
      employeeId: 'employee-1',
      serviceId,
      startAt: new Date('2026-03-10T10:00:00.000Z'),
      endAt: new Date('2026-03-10T10:30:00.000Z'),
      priceCents,
      createdById: 'staff-1',
    });
    if (status === 'completed') return appointment.complete();
    if (status === 'cancelled') return appointment.cancel('motivo', 'staff-1');
    return appointment;
  }

  function build(appointments: Appointment[]) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findMany: jest.fn().mockResolvedValue(appointments),
    } as unknown as AppointmentRepositoryPort;

    return { useCase: new GetTopServicesUseCase(appointmentRepository) };
  }

  it('aggregates count and revenue per service, only counting completed appointments', async () => {
    const { useCase } = build([
      buildAppointment('service-1', 5000, 'completed'),
      buildAppointment('service-1', 5000, 'completed'),
      buildAppointment('service-2', 12000, 'completed'),
      buildAppointment('service-2', 12000, 'pending'),
      buildAppointment('service-3', 3000, 'cancelled'),
    ]);

    const result = await useCase.execute({ establishmentId: 'establishment-1' });

    expect(result).toEqual([
      { serviceId: 'service-2', count: 1, revenueCents: 12000 },
      { serviceId: 'service-1', count: 2, revenueCents: 10000 },
    ]);
  });

  it('returns an empty array when nothing is completed', async () => {
    const { useCase } = build([buildAppointment('service-1', 5000, 'pending')]);
    const result = await useCase.execute({ establishmentId: 'establishment-1' });
    expect(result).toEqual([]);
  });
});
