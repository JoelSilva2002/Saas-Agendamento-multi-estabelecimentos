import { ClientProfile } from './entities/client-profile.entity';

export abstract class ClientProfileRepositoryPort {
  abstract create(profile: ClientProfile): Promise<ClientProfile>;
  abstract findByUserAndEstablishment(
    userId: string,
    establishmentId: string,
  ): Promise<ClientProfile | null>;
  abstract findById(id: string, establishmentId: string): Promise<ClientProfile | null>;
  /** Matches on digits only — a phone typed as "(11) 99999-0000" finds a profile stored as
   * "11999990000" or vice versa. Used by ResolveOrCreateClientUseCase to avoid creating a
   * duplicate walk-in for someone who already has a profile at this establishment. */
  abstract findByPhone(establishmentId: string, phone: string): Promise<ClientProfile | null>;
  abstract findMany(establishmentId: string): Promise<ClientProfile[]>;
  abstract update(profile: ClientProfile): Promise<ClientProfile>;

  /** Count of client profiles created within [from, to) at one establishment — used by the
   * dashboard's "new clients today" metric. */
  abstract countCreatedBetween(establishmentId: string, from: Date, to: Date): Promise<number>;
}
