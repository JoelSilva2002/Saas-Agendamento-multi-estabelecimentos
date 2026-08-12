import { NotificationDispatcherService } from './notification-dispatcher.service';
import { NotificationRepositoryPort } from '../../domain/notification.repository.port';
import { EmailNotifierPort } from '../../domain/email-notifier.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
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
        emailNotifier,
        (overrides?.establishmentRepository ?? {
          findByIdUnscoped: jest.fn().mockResolvedValue({
            name: 'Studio Beleza',
            address: {},
            timezone: 'America/Sao_Paulo',
            notifyEmailEnabled: true,
          }),
        }) as never,
        serviceRepository as never,
        employeeRepository as never,
        configService as never,
      ),
      notificationRepository,
      userRepository,
      emailNotifier,
    };
  }

  it('dispatches by email', async () => {
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

  it('does not dispatch when e-mail is disabled at the establishment level', async () => {
    const { service, emailNotifier, notificationRepository } = build({
      establishmentRepository: {
        findByIdUnscoped: jest.fn().mockResolvedValue({
          timezone: 'America/Sao_Paulo',
          notifyEmailEnabled: false,
        }),
      },
    });

    await service.dispatch(input);

    expect(emailNotifier.send).not.toHaveBeenCalled();
    expect(notificationRepository.create).not.toHaveBeenCalled();
  });

  it('skips a notification that was already dispatched for this appointment/type', async () => {
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

  it('records a failed notification when the send throws, without propagating', async () => {
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
