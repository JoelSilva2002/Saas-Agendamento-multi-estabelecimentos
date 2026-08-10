import { ListAppointmentsUseCase } from './list-appointments.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';

describe('ListAppointmentsUseCase', () => {
  function build(overrides?: { appointmentRepository?: Partial<AppointmentRepositoryPort> }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findMany: jest.fn().mockResolvedValue([]),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    return { useCase: new ListAppointmentsUseCase(appointmentRepository), appointmentRepository };
  }

  it('passes filters through untouched for staff', async () => {
    const { useCase, appointmentRepository } = build();
    await useCase.execute({
      establishmentId: 'establishment-1',
      actingUserId: 'staff-1',
      isStaff: true,
      filters: { clientId: 'some-client', status: 'pending' },
    });

    expect(appointmentRepository.findMany).toHaveBeenCalledWith('establishment-1', {
      clientId: 'some-client',
      status: 'pending',
    });
  });

  it('forces clientId to the acting user for non-staff, overriding any provided filter', async () => {
    const { useCase, appointmentRepository } = build();
    await useCase.execute({
      establishmentId: 'establishment-1',
      actingUserId: 'client-1',
      isStaff: false,
      filters: { clientId: 'someone-else', status: 'pending' },
    });

    expect(appointmentRepository.findMany).toHaveBeenCalledWith('establishment-1', {
      clientId: 'client-1',
      status: 'pending',
    });
  });
});
