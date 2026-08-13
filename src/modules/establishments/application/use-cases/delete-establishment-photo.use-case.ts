import { Injectable, Logger } from '@nestjs/common';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhotoNotFoundError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';

@Injectable()
export class DeleteEstablishmentPhotoUseCase {
  private readonly logger = new Logger(DeleteEstablishmentPhotoUseCase.name);

  constructor(
    private readonly photoRepository: EstablishmentPhotoRepositoryPort,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(photoId: string, establishmentId: string): Promise<void> {
    const photo = await this.photoRepository.findByIdInEstablishment(photoId, establishmentId);
    if (!photo) {
      throw new EstablishmentPhotoNotFoundError(photoId);
    }

    // Row first, files after: a failed unlink leaves a harmless orphaned file; the reverse
    // order would leave a row pointing at a 404'd image.
    await this.photoRepository.delete(photo.id);

    for (const key of [photo.storageKey, photo.thumbStorageKey]) {
      try {
        await this.storage.delete(key);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(`Falha ao remover arquivo de mídia órfão '${key}': ${message}`);
      }
    }
  }
}
