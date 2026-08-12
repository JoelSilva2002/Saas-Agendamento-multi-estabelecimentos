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
    employeeId: 'employee-1',
    serviceId: 'service-1',
    startAt: new Date('2026-03-10T14:00:00.000Z'),
  };

  function build(overrides?: {
    notificationRepository?: Partial<NotificationRepositoryPort>;
    userRepository?: Partial<UserRepositoryPort>;
    clientProfileRepository?: Partial<ClientProfileRepositoryPort>;
    whatsAppNotifier?: Partial<WhatsAppNotifierPort>;
    emailNotifier?: Partial<EmailNotifierPort>;
    establishmentRepository?: { findByIdUnscoped: jest.Mock };
    serviceRepository?: { findById: jest.Mock };
    employeeRepository?: { findById: jest.Mock };
  }) {
    const notificationRepository: NotificationRepositoryPort = {
      findExisting: jest.fn().mockResolvedValue(null),
      findRetryable: jest.fn().mockResolvedValue([]),
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

    const serviceRepository = overrides?.serviceRepository ?? {
      findById: jest.fn().mockResolvedValue({ name: 'Corte de cabelo' }),
    };
    const employeeRepository = overrides?.employeeRepository ?? {
      findById: jest.fn().mockResolvedValue({ userId: 'employee-user-1' }),
    };
    const configService = {
      get: jest.fn().mockReturnValue('http://localhost:3001'),
    };

    return {
      service: new NotificationDispatcherService(
        notificationRepository,
        userRepository,
        clientProfileRepository,
        whatsAppNotifier,
        emailNotifier,
        (overrides?.establishmentRepository ?? {
          findByIdUnscoped: jest.fn().mockResolvedValue({
            name: 'Studio Beleza',
            address: {},
            timezone: 'America/Sao_Paulo',
            notifyEmailEnabled: true,
            notifyWhatsappEnabled: true,
          }),
        }) as never,
        serviceRepository as never,
        employeeRepository as never,
        configService as never,
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
      expect.objectContaining({ html: expect.any(String), text: expect.any(String) }),
    );
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
  });

  it('includes the service and professional names in the e-mail HTML', async () => {
    const employeeUser = User.create({
      id: 'employee-user-1',
      email: 'joao@test.local',
      passwordHash: 'hash',
      firstName: 'João',
      lastName: 'Barbeiro',
    });
    const { service, emailNotifier } = build({
      userRepository: {
        findById: jest.fn((id: string) => Promise.resolve(id === 'employee-user-1' ? employeeUser : client)),
      },
    });

    await service.dispatch(input);

    const [, , content] = (emailNotifier.send as jest.Mock).mock.calls[0];
    expect(content.html).toContain('Corte de cabelo');
    expect(content.html).toContain('João Barbeiro');
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

    // Normalized to E.164 digits (no leading '+') — the shape a real WhatsApp provider expects.
    expect(whatsAppNotifier.send).toHaveBeenCalledWith('5511999999999', expect.any(String));
    expect(notificationRepository.create).toHaveBeenCalledTimes(2);
  });

  it('skips whatsapp (without creating a row) when the phone on file is not a valid BR number', async () => {
    const profile = ClientProfile.create({
      id: 'profile-1',
      establishmentId: 'establishment-1',
      userId: 'client-1',
      phone: '123',
    });
    const { service, whatsAppNotifier, notificationRepository } = build({
      clientProfileRepository: { findByUserAndEstablishment: jest.fn().mockResolvedValue(profile) },
    });

    await service.dispatch(input);

    expect(whatsAppNotifier.send).not.toHaveBeenCalled();
    // Email still goes out — only the whatsapp channel is affected.
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
  });

  it('skips a channel disabled at the establishment level', async () => {
    const profile = ClientProfile.create({
      id: 'profile-1',
      establishmentId: 'establishment-1',
      userId: 'client-1',
      phone: '+5511999999999',
    });
    const { service, whatsAppNotifier, emailNotifier, notificationRepository } = build({
      clientProfileRepository: { findByUserAndEstablishment: jest.fn().mockResolvedValue(profile) },
      establishmentRepository: {
        findByIdUnscoped: jest.fn().mockResolvedValue({
          timezone: 'America/Sao_Paulo',
          notifyEmailEnabled: false,
          notifyWhatsappEnabled: true,
        }),
      },
    });

    await service.dispatch(input);

    expect(emailNotifier.send).not.toHaveBeenCalled();
    expect(whatsAppNotifier.send).toHaveBeenCalled();
    expect(notificationRepository.create).toHaveBeenCalledTimes(1);
  });

  it('skips a channel that was already notified for this appointment/type', async () => {
    const existing = Notification.create({
      id: 'existing',
      establishmentId: input.establishmentId,
      appointmentId: input.appointmentId,
      recipientUserId: input.clientId,
      channel: 'email',
      type: input.type,
      message: 'já enviado',
    });
    const { service, emailNotifier, notificationRepository } = build({
      notificationRepository: { findExisting: jest.fn().mockResolvedValue(existing) },
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
