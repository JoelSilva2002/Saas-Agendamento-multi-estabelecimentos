import { AppointmentCancelledListener } from './appointment-cancelled.listener';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import { EmailNotifierPort } from '../../../notifications/domain/email-notifier.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { AppointmentCancelledEvent } from '../../../appointments/domain/events/appointment-events';

describe('AppointmentCancelledListener', () => {
  const client = User.create({
    id: 'client-1',
    email: 'client@test.local',
    passwordHash: 'hash',
    firstName: 'Cliente',
    lastName: 'Teste',
  });

  const event: AppointmentCancelledEvent = {
    appointmentId: 'appointment-1',
    establishmentId: 'establishment-1',
    clientId: 'client-2',
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T09:00:00.000Z'), // morning
    cancellationReason: 'motivo',
    cancelledById: 'staff-1',
  };

  function buildEntry(desiredPeriod: WaitlistEntry['desiredPeriod'] = 'any'): WaitlistEntry {
    return WaitlistEntry.create({
      id: 'entry-1',
      establishmentId: 'establishment-1',
      clientId: 'client-1',
      serviceId: 'service-1',
      desiredDate: event.startAt,
      desiredPeriod,
    });
  }

  function build(overrides?: {
    waitlistEntryRepository?: Partial<WaitlistEntryRepositoryPort>;
    userRepository?: Partial<UserRepositoryPort>;
    emailNotifier?: Partial<EmailNotifierPort>;
  }) {
    const waitlistEntryRepository: WaitlistEntryRepositoryPort = {
      findWaitingMatches: jest.fn().mockResolvedValue([buildEntry()]),
      update: jest.fn().mockImplementation((e: WaitlistEntry) => Promise.resolve(e)),
      ...overrides?.waitlistEntryRepository,
    } as unknown as WaitlistEntryRepositoryPort;

    const userRepository: UserRepositoryPort = {
      findById: jest.fn().mockResolvedValue(client),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const emailNotifier: EmailNotifierPort = {
      send: jest.fn().mockResolvedValue(undefined),
      ...overrides?.emailNotifier,
    } as unknown as EmailNotifierPort;

    return {
      listener: new AppointmentCancelledListener(waitlistEntryRepository, userRepository, emailNotifier),
      waitlistEntryRepository,
      emailNotifier,
    };
  }

  it('notifies a matching entry by email and marks it notified', async () => {
    const { listener, emailNotifier, waitlistEntryRepository } = build();
    await listener.handleAppointmentCancelled(event);

    expect(emailNotifier.send).toHaveBeenCalledWith(
      'client@test.local',
      expect.any(String),
      expect.objectContaining({ html: expect.any(String), text: expect.any(String) }),
    );
    expect(waitlistEntryRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ toPersistenceProps: expect.any(Function) }),
    );
    const updatedArg = (waitlistEntryRepository.update as jest.Mock).mock
      .calls[0][0] as WaitlistEntry;
    expect(updatedArg.status).toBe('notified');
  });

  it('skips an entry whose desiredPeriod does not match the cancelled slot', async () => {
    const { listener, emailNotifier } = build({
      waitlistEntryRepository: {
        findWaitingMatches: jest.fn().mockResolvedValue([buildEntry('evening')]),
      },
    });

    await listener.handleAppointmentCancelled(event);
    expect(emailNotifier.send).not.toHaveBeenCalled();
  });

  it('never throws even if the repository lookup fails', async () => {
    const { listener } = build({
      waitlistEntryRepository: {
        findWaitingMatches: jest.fn().mockRejectedValue(new Error('db down')),
      },
    });

    await expect(listener.handleAppointmentCancelled(event)).resolves.toBeUndefined();
  });
});
