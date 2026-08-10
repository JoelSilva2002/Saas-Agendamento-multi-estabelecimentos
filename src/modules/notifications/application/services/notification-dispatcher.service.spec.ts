import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { WhatsAppNotifierPort } from '../../domain/whatsapp-notifier.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { ClientProfileRepositoryPort } from '../../../clients/domain/client-profile.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { ClientProfile } from '../../../clients/domain/entities/client-profile.entity';
import { Notification } from '../../domain/entities/notification.entity';

describe('NotificationDispatcherService', () => {
  const client = User.create({
    id: 'client-1',
    email: 'client@test.local',
    passwordHash: 'hash',
    firstName: 'Cliente',
    lastName: 'Teste',
  });

  const input = {
    type: 'confirmation' as const,
    establishmentId: 'establishment-1',
    appointmentId: 'appointment-1',
    clientId: 'client-1',
    startAt: new Date('2026-03-10T14:00:00.000Z'),
  };

  function build(overrides?: {
    notificationRepository?: Partial<NotificationRepositoryPort>;
    userRepository?: Partial<UserRepositoryPort>;
    clientProfileRepository?: Partial<ClientProfileRepositoryPort>;
    whatsAppNotifier?: Partial<WhatsAppNotifierPort>;
    emailNotifier?: Partial<EmailNotifierPort>;
  }) {
    const notificationRepository: NotificationRepositoryPort = {
      existsForAppointment: jest.fn().mockResolvedValue(false),
      create: jest.fn().mockImplementation((n: Notification) => Promise.resolve(n)),
      update: jest.fn().mockImplementation((n: Notification) => Promise.resolve(n)),
      findByAppointment: jest.fn().mockResolvedValue([]),
      ...overrides?.notificationRepository,
    } as unknown as NotificationRepositoryPort;

    const userRepository: UserRepositoryPort = {
      findById: jest.fn().mockResolvedValue(client),
      ...overrides?.userRepository,
    } as unknown as UserRepositoryPort;

    const clientProfileRepository: ClientProfileRepositoryPort = {
      findByUserAndEstablishment: jest.fn().mockResolvedValue(null),
      ...overrides?.clientProfileRepository,
    } as unknown as ClientProfileRepositoryPort;

    const whatsAppNotifier: WhatsAppNotifierPort = {
      send: jest.fn().mockResolvedValue(undefined),
      ...overrides?.whatsAppNotifier,
    } as unknown as WhatsAppNotifierPort;

    const emailNotifier: EmailNotifierPort = {
      send: jest.fn().mockResolvedValue(undefined),
      ...overrides?.emailNotifier,
    } as unknown as EmailNotifierPort;

    return {
      service: new NotificationDispatcherService(
        notificationRepository,
        userRepository,
        clientProfileRepository,
        whatsAppNotifier,
        emailNotifier,
      ),
      notificationRepository,
      userRepository,
      clientProfileRepository,
      whatsAppNotifier,
      emailNotifier,
    };
  }

  it('always dispatches by email', async () => {
    const { service, emailNotifier, notificationRepository } = build();
    await service.dispatch(input);

    expect(emailNotifier.send).toHaveBeenCalledWith(
      'client@test.local',
      expect.any(String),
      expect.any(String),
    );
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
  });

  it('also dispatches by whatsapp when the client has a phone on file', async () => {
    const profile = ClientProfile.create({
      id: 'profile-1',
      establishmentId: 'establishment-1',
      userId: 'client-1',
      phone: '+5511999999999',
    });
    const { service, whatsAppNotifier, notificationRepository } = build({
      clientProfileRepository: { findByUserAndEstablishment: jest.fn().mockResolvedValue(profile) },
    });

    await service.dispatch(input);

    expect(whatsAppNotifier.send).toHaveBeenCalledWith('+5511999999999', expect.any(String));
    expect(notificationRepository.create).toHaveBeenCalledTimes(2);
  });

  it('skips a channel that was already notified for this appointment/type', async () => {
    const { service, emailNotifier, notificationRepository } = build({
      notificationRepository: { existsForAppointment: jest.fn().mockResolvedValue(true) },
    });

    await service.dispatch(input);

    expect(emailNotifier.send).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it('records a failed notification when the channel throws, without propagating', async () => {
    const { service, notificationRepository } = build({
      emailNotifier: { send: jest.fn().mockRejectedValue(new Error('SMTP down')) },
    });

    await expect(service.dispatch(input)).resolves.toBeUndefined();

    expect(notificationRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({ toPersistenceProps: expect.any(Function) }),
    );
    const updatedArg = (notificationRepository.update as jest.Mock).mock
      .calls[0][0] as Notification;
    expect(updatedArg.status).toBe('failed');
    expect(updatedArg.errorMessage).toBe('SMTP down');
  });

  it('does nothing when the client cannot be found, without throwing', async () => {
    const { service, notificationRepository } = build({
      userRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(service.dispatch(input)).resolves.toBeUndefined();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });
});
