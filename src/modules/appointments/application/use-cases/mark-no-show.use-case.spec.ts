import { MarkNoShowUseCase } from './mark-no-show.use-case';
import { AppointmentRepositoryPort } from '../../domain/appointment.repository.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { Appointment } from '../../domain/entities/appointment.entity';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';
import {
  AppointmentInFutureError,
  AppointmentNotFoundError,
} from '../../domain/errors/appointment-errors';

describe('MarkNoShowUseCase', () => {
  const NOW = new Date('2026-03-10T12:00:00.000Z');

  function buildAppointment(startAt: Date): Appointment {
    return Appointment.create({
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
  }

  function build(overrides?: {
    appointmentRepository?: Partial<AppointmentRepositoryPort>;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
  }) {
    const appointmentRepository: AppointmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildAppointment(new Date('2026-03-10T09:00:00.000Z'))),
      update: jest
        .fn()
        .mockImplementation((appointment: Appointment) => Promise.resolve(appointment)),
      ...overrides?.appointmentRepository,
    } as unknown as AppointmentRepositoryPort;

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(
        Establishment.create({
          id: 'establishment-1',
          tenantId: 'tenant-1',
          name: 'Filial',
          slug: 'filial',
        }),
      ),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    return {
      useCase: new MarkNoShowUseCase(appointmentRepository, establishmentRepository),
      appointmentRepository,
    };
  }

  const baseInput = {
    tenantId: 'tenant-1',
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('marks a past appointment as no-show with no fee when the establishment has fees disabled', async () => {
    const { useCase } = build();
    const result = await useCase.execute(baseInput);
    expect(result.status).toBe('no_show');
    expect(result.noShowFeeCents).toBeNull();
  });

  it('computes the fee as a percentage of the service price when enabled', async () => {
    const { useCase } = build({
      establishmentRepository: {
        findById: jest.fn().mockResolvedValue(
          Establishment.create({
            id: 'establishment-1',
            tenantId: 'tenant-1',
            name: 'Filial',
            slug: 'filial',
            noShowFeeEnabled: true,
            noShowFeePercentage: 50,
          }),
        ),
      },
    });
    const result = await useCase.execute(baseInput);
    expect(result.noShowFeeCents).toBe(2500);
  });

  it('throws AppointmentNotFoundError when the appointment does not exist', async () => {
    const { useCase } = build({
      appointmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentNotFoundError);
  });

  it('throws AppointmentInFutureError when the appointment has not started yet', async () => {
    const { useCase } = build({
      appointmentRepository: {
        findById: jest
          .fn()
          .mockResolvedValue(buildAppointment(new Date('2026-03-11T09:00:00.000Z'))),
      },
    });
    await expect(useCase.execute(baseInput)).rejects.toThrow(AppointmentInFutureError);
  });
});
