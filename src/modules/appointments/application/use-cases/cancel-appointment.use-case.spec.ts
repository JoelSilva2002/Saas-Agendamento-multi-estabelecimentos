import { EventEmitter2 } from '@nestjs/event-emitter';
import { CancelAppointmentUseCase } from './cancel-appointment.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import {
  AppointmentAccessDeniedError,
  AppointmentNotFoundError,
  CancellationReasonRequiredError,
  CancellationWindowExpiredError,
} from '../../domain/errors/appointment-errors';
import { APPOINTMENT_CANCELLED_EVENT } from '../../domain/events/appointment-events';

describe('CancelAppointmentUseCase', () => {
  const NOW = new Date('2026-03-10T00:00:00.000Z');

  function buildAppointment(startAt: Date, overrides?: Partial<{ clientId: string }>): Appointment {
    return Appointment.create({
      id: 'appointment-1',
      establishmentId: 'establishment-1',
      clientId: overrides?.clientId ?? 'client-1',
      employeeId: 'employee-1',
      serviceId: 'service-1',
      startAt,
      endAt: new Date(startAt.getTime() + 30 * 60_000),
      priceCents: 5000,
      createdById: 'staff-1',
    });
  }

  function buildEstablishment(cancellationMinHoursNotice = 24): Establishment {
    return Establishment.create({
      id: 'establishment-1',
      tenantId: 'tenant-1',
      name: 'Filial',
      slug: 'filial',
      cancellationMinHoursNotice,
    });
  }

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildAppointment(new Date('2026-03-15T10:00:00.000Z'))),
      update: jest
        .fn()
        .mockImplementation((appointment: Appointment) => Promise.resolve(appointment)),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildEstablishment()),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const eventEmitter = { emitAsync: jest.fn().mockResolvedValue([]) } as unknown as EventEmitter2;

    return {
      useCase: new CancelAppointmentUseCase(
        appointmentRepository,
        establishmentRepository,
        eventEmitter,
      ),
      appointmentRepository,
      establishmentRepository,
      eventEmitter,
    };
  }

  const baseInput = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    reason: 'Imprevisto',
    actingUserId: 'client-1',
    isStaff: false,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels the appointment when the client is the owner and within the notice window', async () => {
    const { useCase, appointmentRepository } = build();
    const result = await useCase.execute(baseInput);

    expect(result.status).toBe('cancelled');
    expect(result.cancellationReason).toBe('Imprevisto');
    expect(appointmentRepository.update).toHaveBeenCalled();
  });

  it('emits appointment.cancelled with the cancellation data', async () => {
    const { useCase, eventEmitter } = build();
    await useCase.execute(baseInput);

    expect(eventEmitter.emitAsync).toHaveBeenCalledWith(
      APPOINTMENT_CANCELLED_EVENT,
      expect.objectContaining({ appointmentId: 'appointment-1', cancellationReason: 'Imprevisto' }),
    );
  });

  it('throws AppointmentNotFoundError when the appointment does not exist', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotFoundError);
  });

  it("throws AppointmentAccessDeniedError when a client targets someone else's appointment", async () => {
    const { useCase } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(
            buildAppointment(new Date('2026-03-15T10:00:00.000Z'), { clientId: 'other-client' }),
          ),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentAccessDeniedError);
  });

  it('throws CancellationWindowExpiredError when a client cancels with less notice than required', async () => {
    // Appointment starts in 10h, establishment requires 24h notice.
    const { useCase } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(buildAppointment(new Date('2026-03-10T10:00:00.000Z'))),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(CancellationWindowExpiredError);
  });

  it('lets staff cancel regardless of the notice window', async () => {
    const { useCase, appointmentRepository } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(buildAppointment(new Date('2026-03-10T10:00:00.000Z'))),
      },
    });
    const result = await useCase.execute({ ...baseInput, actingUserId: 'staff-1', isStaff: true });
    expect(result.status).toBe('cancelled');
    expect(appointmentRepository.update).toHaveBeenCalled();
  });

  it('propagates CancellationReasonRequiredError from the entity when reason is blank', async () => {
    const { useCase } = build();
    await expect(useCase.execute({ ...baseInput, reason: '   ' })).rejects.toThrow(
      CancellationReasonRequiredError,
    );
  });
});
