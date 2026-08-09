import { ClientProfile } from './entities/client-profile.entity';

export abstract class ClientProfileRepositoryPort {
  abstract create(profile: ClientProfile): Promise<ClientProfile>;
  abstract findByUserAndEstablishment(userId: string, establishmentId: string): Promise<ClientProfile | null>;
}
