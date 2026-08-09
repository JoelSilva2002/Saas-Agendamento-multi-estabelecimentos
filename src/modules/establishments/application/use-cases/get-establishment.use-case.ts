import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment } from '../../domain/entities/establishment.entity';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';

export interface GetEstablishmentInput {
  tenantId: string;
  establishmentId: string;
}

@Injectable()
export class GetEstablishmentUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(input: GetEstablishmentInput): Promise<Establishment> {
    const establishment = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!establishment || establishment.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }
    return establishment;
  }
}
