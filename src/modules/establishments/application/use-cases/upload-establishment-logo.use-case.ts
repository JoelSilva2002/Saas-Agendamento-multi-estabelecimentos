import { randomUUID } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';
import { ImageProcessorPort, UnsupportedImageError } from '../../../../shared-kernel/domain/image-processor.port';
import { LOGO_PROFILE } from '../../../../shared-kernel/domain/image-profiles';
import { sniffImageFormat } from '../../../../shared-kernel/domain/image-signature';

export interface UploadEstablishmentLogoInput {
  tenantId: string;
  establishmentId: string;
  buffer: Buffer;
}

export interface UploadEstablishmentLogoResult {
  logoUrl: string;
  logoThumbUrl: string;
}

@Injectable()
export class UploadEstablishmentLogoUseCase {
  private readonly logger = new Logger(UploadEstablishmentLogoUseCase.name);

  constructor(
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly storage: FileStoragePort,
    private readonly imageProcessor: ImageProcessorPort,
  ) {}

  async execute(input: UploadEstablishmentLogoInput): Promise<UploadEstablishmentLogoResult> {
    const existing = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    const sniffed = sniffImageFormat(input.buffer);
    if (!sniffed) {
      throw new UnsupportedImageError();
    }
    const processed = await this.imageProcessor.process(input.buffer, LOGO_PROFILE, sniffed);

    const stem = randomUUID();
    const baseParts = ['establishments', input.tenantId, input.establishmentId, 'logo'];
    const storageKey = await this.storage.put({
      keyParts: [...baseParts, `${stem}.webp`],
      body: processed.full.buffer,
      contentType: processed.full.contentType,
    });
    const thumbStorageKey = await this.storage.put({
      keyParts: [...baseParts, `${stem}_thumb.webp`],
      body: processed.thumb.buffer,
      contentType: processed.thumb.contentType,
    });

    const previousLogo = existing.logo;
    const updated = existing.update({ logo: { storageKey, thumbStorageKey } });
    await this.establishmentRepository.update(updated);

    // Never overwrite in place — the old keys, if any, are now orphaned and can be reclaimed
    // best-effort. A failed unlink here just leaves a harmless unreferenced file.
    if (previousLogo) {
      await this.deleteBestEffort(previousLogo.storageKey);
      await this.deleteBestEffort(previousLogo.thumbStorageKey);
    }

    return {
      logoUrl: this.storage.publicUrl(storageKey),
      logoThumbUrl: this.storage.publicUrl(thumbStorageKey),
    };
  }

  private async deleteBestEffort(key: string): Promise<void> {
    try {
      await this.storage.delete(key);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao remover arquivo de mídia órfão '${key}': ${message}`);
    }
  }
}
