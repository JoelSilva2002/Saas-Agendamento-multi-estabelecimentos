import { JoinWaitlistUseCase } from './join-waitlist.use-case';
import { WaitlistEntryRepositoryPort } from '../../domain/waitlist-entry.repository.port';
import { WaitlistEntry } from '../../domain/entities/waitlist-entry.entity';

describe('JoinWaitlistUseCase', () => {
  function build() {
    const waitlistEntryRepository: WaitlistEntryRepositoryPort = {
      create: jest.fn().mockImplementation((entry: WaitlistEntry) => Promise.resolve(entry)),
    } as unknown as WaitlistEntryRepositoryPort;

    return { useCase: new JoinWaitlistUseCase(waitlistEntryRepository), waitlistEntryRepository };
  }

  it('creates a waiting entry and persists it', async () => {
    const { useCase, waitlistEntryRepository } = build();
    const entry = await useCase.execute({
      establishmentId: 'establishment-1',
      clientId: 'client-1',
      serviceId: 'service-1',
      desiredDate: new Date('2026-03-10T00:00:00.000Z'),
    });

    expect(entry.status).toBe('waiting');
    expect(waitlistEntryRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ clientId: 'client-1' }),
    );
  });
});
