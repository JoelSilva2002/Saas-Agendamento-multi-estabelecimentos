import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment, EstablishmentAddress } from '../../domain/entities/establishment.entity';
import {
  DuplicateEstablishmentSlugError,
  EstablishmentNotFoundError,
} from '../../domain/errors/establishment-errors';

export interface UpdateEstablishmentInput {
  tenantId: string;
  establishmentId: string;
  name?: string;
  slug?: string;
  description?: string | null;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
  cancellationMinHoursNotice?: number;
  noShowFeeEnabled?: boolean;
  noShowFeePercentage?: number;
  depositEnabled?: boolean;
  depositPercentage?: number;
}

@Injectable()
export class UpdateEstablishmentUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(input: UpdateEstablishmentInput): Promise<Establishment> {
    const existing = await this.establishmentRepository.findById(
      input.establishmentId,
      input.tenantId,
    );
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    if (input.slug && input.slug !== existing.slug) {
      const slugTaken = await this.establishmentRepository.existsWithSlug(input.slug, existing.id);
      if (slugTaken) {
        throw new DuplicateEstablishmentSlugError(input.slug);
      }
    }

    const updated = existing.update({
      name: input.name,
      slug: input.slug,
      description: input.description,
      timezone: input.timezone,
      address: input.address,
      phones: input.phones,
      cancellationMinHoursNotice: input.cancellationMinHoursNotice,
      noShowFeeEnabled: input.noShowFeeEnabled,
      noShowFeePercentage: input.noShowFeePercentage,
      depositEnabled: input.depositEnabled,
      depositPercentage: input.depositPercentage,
    });
    return this.establishmentRepository.update(updated);
  }
}
