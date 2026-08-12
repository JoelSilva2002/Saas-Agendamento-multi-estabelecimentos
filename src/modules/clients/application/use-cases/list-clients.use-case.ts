import { Injectable } from '@nestjs/common';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';

export interface ClientListItem {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  birthDate: Date | null;
  notes: string | null;
}

/**
 * Names/e-mails used to live in the frontend, joined client-side against `GET
 * /tenants/:tenantId/users` — which also meant the fit-in dialog's "pick a client" combobox
 * was really "pick anyone in the tenant, staff included" (see FitInDialog). Resolving the
 * User here removes that leak and gives the screen a display-ready row directly.
 */
@Injectable()
export class ListClientsUseCase {
  constructor(
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly userRepository: UserRepositoryPort,
  ) {}

  async execute(establishmentId: string): Promise<ClientListItem[]> {
    const profiles = await this.clientProfileRepository.findMany(establishmentId);

    const items = await Promise.all(
      profiles.map(async (profile) => {
        const user = await this.userRepository.findById(profile.userId);
        return {
          id: profile.id,
          userId: profile.userId,
          firstName: user?.firstName ?? '',
          lastName: user?.lastName ?? '',
          email: user?.email ?? null,
          phone: profile.phone,
          birthDate: profile.birthDate,
          notes: profile.notes,
        };
      }),
    );

    return items.sort((a, b) => a.firstName.localeCompare(b.firstName, 'pt-BR'));
  }
}
