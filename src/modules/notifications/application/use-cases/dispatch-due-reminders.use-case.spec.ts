import { DispatchDueRemindersUseCase } from './dispatch-due-reminders.use-case';
import { AppointmentRepositoryPort } from '../../../appointments/domain/appointment.repository.port';
import { NotificationDispatcherService } from '../services/notification-dispatcher.service';
import { Appointment } from '../../../appointments/domain/entities/appointment.entity';

describe('DispatchDueRemindersUseCase', () => {
  const NOW = new Date('2026-03-10T10:00:00.000Z');

  function buildAppointment(
    startAt: Date,
    status: Appointment['status'] = 'confirmed',
  ): Appointment {
    const appointment = Appointment.create({
      id: 'appointment-1',
      establishmentId: 'establishment-1',
      clientId: 'client-1',
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000),
      priceCents: 5000,
      createdById: 'staff-1',
    });
    return status === 'cancelled' ? appointment.cancel('motivo', 'staff-1') : appointment;
  }

  function build(findManyImpl: AppointmentRepositoryPort['findMany']) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findMany: findManyImpl,
    } as unknown as AppointmentRepositoryPort;

    const dispatcher = {
      dispatch: jest.fn().mockResolvedValue(undefined),
    } as unknown as NotificationDispatcherService;

    return {
      useCase: new DispatchDueRemindersUseCase(appointmentRepository, dispatcher),
      appointmentRepository,
      dispatcher,
    };
  }

  it('calls findMany once per reminder window (24h, then 2h) and dispatches for what comes back', async () => {
    const due24h = buildAppointment(new Date('2026-03-11T10:00:00.000Z'));
    const due2h = buildAppointment(new Date('2026-03-10T12:00:00.000Z'));
    const findMany = jest.fn().mockResolvedValueOnce([due24h]).mockResolvedValueOnce([due2h]);

    const { useCase, dispatcher } = build(
      findMany as unknown as AppointmentRepositoryPort['findMany'],
    );

    await useCase.execute('establishment-1', NOW);

    expect(findMany).toHaveBeenCalledTimes(2);
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reminder_24h', appointmentId: 'appointment-1' }),
    );
    expect(dispatcher.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'reminder_2h', appointmentId: 'appointment-1' }),
    );
  });

  it('centers the 24h window scan on now + 24h', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { useCase } = build(findMany as unknown as AppointmentRepositoryPort['findMany']);

    await useCase.execute('establishment-1', NOW);

    const firstCallFilters = findMany.mock.calls[0][1] as { fromDate: Date; toDate: Date };
    const expectedCenter = new Date(NOW.getTime() + 24 * 60 * 60_000).getTime();
    expect(firstCallFilters.fromDate.getTime()).toBeLessThan(expectedCenter);
    expect(firstCallFilters.toDate.getTime()).toBeGreaterThan(expectedCenter);
  });

  it('never dispatches for cancelled/no-show appointments', async () => {
    const cancelled = buildAppointment(new Date('2026-03-11T10:00:00.000Z'), 'cancelled');
    const findMany = jest.fn().mockResolvedValue([cancelled]);
    const { useCase, dispatcher } = build(
      findMany as unknown as AppointmentRepositoryPort['findMany'],
    );

    await useCase.execute('establishment-1', NOW);

    expect(dispatcher.dispatch).not.toHaveBeenCalled();
  });
});
