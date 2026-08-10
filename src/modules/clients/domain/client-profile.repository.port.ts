import { ClientProfile } from './entities/client-profile.entity';

export abstract class ClientProfileRepositoryPort {
  abstract create(profile: ClientProfile): Promise<ClientProfile>;
  abstract findByUserAndEstablishment(
    userId: string,
    establishmentId: string,
  ): Promise<ClientProfile | null>;

  /** Count of client profiles created within [from, to) at one establishment — used by the
   * dashboard's "new clients today" metric. */
  abstract countCreatedBetween(establishmentId: string, from: Date, to: Date): Promise<number>;
}
