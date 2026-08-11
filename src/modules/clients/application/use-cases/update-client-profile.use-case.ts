import { Injectable } from '@nestjs/common';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { ClientProfile } from '../../domain/entities/client-profile.entity';
import { ClientProfileNotFoundError } from '../../domain/errors/client-errors';

export interface UpdateClientProfileInput {
  establishmentId: string;
  clientId: string;
  phone?: string | null;
  birthDate?: Date | null;
  notes?: string | null;
}

@Injectable()
export class UpdateClientProfileUseCase {
  constructor(private readonly clientProfileRepository: ClientProfileRepositoryPort) {}

  async execute(input: UpdateClientProfileInput): Promise<ClientProfile> {
    const profile = await this.clientProfileRepository.findById(input.clientId, input.establishmentId);
    if (!profile) {
      throw new ClientProfileNotFoundError(input.clientId);
    }

    const updated = profile.update({
      phone: input.phone,
      birthDate: input.birthDate,
      notes: input.notes,
    });
    return this.clientProfileRepository.update(updated);
  }
}
