import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';

export interface DeleteEstablishmentInput {
  tenantId: string;
  establishmentId: string;
}

@Injectable()
export class DeleteEstablishmentUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(input: DeleteEstablishmentInput): Promise<void> {
    const existing = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }
    await this.establishmentRepository.softDelete(input.establishmentId, input.tenantId);
  }
}
