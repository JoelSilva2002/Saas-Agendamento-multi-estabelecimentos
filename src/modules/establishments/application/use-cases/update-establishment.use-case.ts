import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment } from '../../domain/entities/establishment.entity';
import {
  DuplicateEstablishmentSlugError,
  EstablishmentNotFoundError,
} from '../../domain/errors/establishment-errors';

export interface UpdateEstablishmentInput {
  tenantId: string;
  establishmentId: string;
  name?: string;
  slug?: string;
  timezone?: string;
}

@Injectable()
export class UpdateEstablishmentUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(input: UpdateEstablishmentInput): Promise<Establishment> {
    const existing = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await this.establishmentRepository.existsWithSlug(
        input.tenantId,
        input.slug,
        existing.id,
      );
      if (slugTaken) {
        throw new DuplicateEstablishmentSlugError(input.slug);
      }
    }

    const updated = existing.update({ name: input.name, slug: input.slug, timezone: input.timezone });
    return this.establishmentRepository.update(updated);
  }
}
