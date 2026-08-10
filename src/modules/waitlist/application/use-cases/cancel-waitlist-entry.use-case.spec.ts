import { CancelWaitlistEntryUseCase } from './cancel-waitlist-entry.use-case';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';
import {
  WaitlistEntryAccessDeniedError,
  WaitlistEntryNotFoundError,
} from '../../domain/errors/waitlist-errors';

describe('CancelWaitlistEntryUseCase', () => {
  const entry = WaitlistEntry.create({
    id: 'entry-1',
    establishmentId: 'establishment-1',
    clientId: 'client-1',
    serviceId: 'service-1',
    desiredDate: new Date('2026-03-10T00:00:00.000Z'),
  });

  function build(overrides?: { waitlistEntryRepository?: Partial<WaitlistEntryRepositoryPort> }) {
    const waitlistEntryRepository: WaitlistEntryRepositoryPort = {
      findById: jest.fn().mockResolvedValue(entry),
      update: jest.fn().mockImplementation((e: WaitlistEntry) => Promise.resolve(e)),
      ...overrides?.waitlistEntryRepository,
    } as unknown as WaitlistEntryRepositoryPort;

    return { useCase: new CancelWaitlistEntryUseCase(waitlistEntryRepository) };
  }

  it('cancels the entry when the client is the owner', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      entryId: 'entry-1',
      actingUserId: 'client-1',
      isStaff: false,
    });
    expect(result.status).toBe('cancelled');
  });

  it('lets staff cancel any entry', async () => {
    const { useCase } = build();
    const result = await useCase.execute({
      establishmentId: 'establishment-1',
      entryId: 'entry-1',
      actingUserId: 'staff-1',
      isStaff: true,
    });
    expect(result.status).toBe('cancelled');
  });

  it('throws WaitlistEntryAccessDeniedError for a different client', async () => {
    const { useCase } = build();
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        entryId: 'entry-1',
        actingUserId: 'other',
        isStaff: false,
      }),
    ).rejects.toThrow(WaitlistEntryAccessDeniedError);
  });

  it('throws WaitlistEntryNotFoundError when missing', async () => {
    const { useCase } = build({
      waitlistEntryRepository: { findById: jest.fn().mockResolvedValue(null) },
    });
    await expect(
      useCase.execute({
        establishmentId: 'establishment-1',
        entryId: 'x',
        actingUserId: 'client-1',
        isStaff: false,
      }),
    ).rejects.toThrow(WaitlistEntryNotFoundError);
  });
});
