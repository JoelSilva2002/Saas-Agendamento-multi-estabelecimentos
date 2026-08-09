import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment, EstablishmentAddress } from '../../domain/entities/establishment.entity';
import { DuplicateEstablishmentSlugError } from '../../domain/errors/establishment-errors';

export interface CreateEstablishmentInput {
  tenantId: string;
  name: string;
  slug: string;
  timezone?: string;
  address?: Partial<EstablishmentAddress>;
  phones?: string[];
}

@Injectable()
export class CreateEstablishmentUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(input: CreateEstablishmentInput): Promise<Establishment> {
    const slugTaken = await this.establishmentRepository.existsWithSlug(input.tenantId, input.slug);
    if (slugTaken) {
      throw new DuplicateEstablishmentSlugError(input.slug);
    }

    const establishment = Establishment.create({
      id: randomUUID(),
      tenantId: input.tenantId,
      name: input.name,
      slug: input.slug,
      timezone: input.timezone,
      address: input.address,
      phones: input.phones,
    });

    return this.establishmentRepository.create(establishment);
  }
}
