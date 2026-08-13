import { Injectable, Logger } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';

export interface RemoveEstablishmentLogoInput {
  tenantId: string;
  establishmentId: string;
}

@Injectable()
export class RemoveEstablishmentLogoUseCase {
  private readonly logger = new Logger(RemoveEstablishmentLogoUseCase.name);

  constructor(
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: RemoveEstablishmentLogoInput): Promise<void> {
    const existing = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const previousLogo = existing.logo;
    if (!previousLogo) {
      return; // Idempotent: removing an already-absent logo is a no-op, not an error.
    }

    const updated = existing.update({ logo: null });
    await this.establishmentRepository.update(updated);

    for (const key of [previousLogo.storageKey, previousLogo.thumbStorageKey]) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Falha ao remover arquivo de mídia órfão '${key}': ${message}`);
      }
    }
  }
}
