import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentNotFoundError, GalleryLimitReachedError } from '../../domain/errors/establishment-errors';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';
import { ImageProcessorPort, UnsupportedImageError } from '../../../../shared-kernel/domain/image-processor.port';
import { GALLERY_PROFILE } from '../../../../shared-kernel/domain/image-profiles';
import { sniffImageFormat } from '../../../../shared-kernel/domain/image-signature';
import { AppConfig } from '../../../../config/configuration';

export interface AddEstablishmentPhotoInput {
  tenantId: string;
  establishmentId: string;
  buffer: Buffer;
  caption?: string | null;
}

@Injectable()
export class AddEstablishmentPhotoUseCase {
  constructor(
    private readonly establishmentRepository: EstablishmentRepositoryPort,
    private readonly photoRepository: EstablishmentPhotoRepositoryPort,
    private readonly storage: FileStoragePort,
    private readonly imageProcessor: ImageProcessorPort,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  async execute(input: AddEstablishmentPhotoInput): Promise<EstablishmentPhoto> {
    const existing = await this.establishmentRepository.findById(input.establishmentId, input.tenantId);
    if (!existing || existing.deletedAt) {
      throw new EstablishmentNotFoundError(input.establishmentId);
    }

    // Checked before processing so a gallery that's already full doesn't burn CPU resizing an
    // image that will just be rejected. Two concurrent uploads can both pass this check and
    // both succeed — accepted as a UX guardrail, not a hard invariant.
    const { maxGalleryPhotos } = this.configService.get('media', { infer: true });
    const currentCount = await this.photoRepository.countByEstablishment(input.establishmentId);
    if (currentCount >= maxGalleryPhotos) {
      throw new GalleryLimitReachedError(maxGalleryPhotos);
    }

    const sniffed = sniffImageFormat(input.buffer);
    if (!sniffed) {
      throw new UnsupportedImageError();
    }
    const processed = await this.imageProcessor.process(input.buffer, GALLERY_PROFILE, sniffed);

    const stem = randomUUID();
    const baseParts = ['establishments', input.tenantId, input.establishmentId, 'gallery'];
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

    return this.photoRepository.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      storageKey,
      thumbStorageKey,
      width: processed.full.width,
      height: processed.full.height,
      byteSize: processed.full.buffer.byteLength,
      caption: input.caption?.trim() || null,
      position: currentCount,
    });
  }
}
