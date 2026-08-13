import { AddEstablishmentPhotoUseCase } from './add-establishment-photo.use-case';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { Establishment } from '../../domain/entities/establishment.entity';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import { EstablishmentNotFoundError, GalleryLimitReachedError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';
import { ImageProcessorPort } from '../../../../shared-kernel/domain/image-processor.port';

describe('AddEstablishmentPhotoUseCase', () => {
  const processedImage = {
    full: { buffer: Buffer.from('full'), width: 1600, height: 1200, contentType: 'image/webp' as const },
    thumb: { buffer: Buffer.from('thumb'), contentType: 'image/webp' as const },
  };

  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  function build(overrides?: {
    photoCount?: number;
    maxGalleryPhotos?: number;
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
    photoRepository?: Partial<EstablishmentPhotoRepositoryPort>;
    imageProcessor?: Partial<ImageProcessorPort>;
  }) {
    const establishment = Establishment.create({
      id: 'est-1',
      tenantId: 'tenant-1',
      name: 'Filial',
      slug: 'filial',
    });

    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(establishment),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const photoRepository: EstablishmentPhotoRepositoryPort = {
      countByEstablishment: jest.fn().mockResolvedValue(overrides?.photoCount ?? 0),
      create: jest.fn().mockImplementation(async (params) =>
        EstablishmentPhoto.fromPersistence({ ...params, createdAt: new Date(), updatedAt: new Date() }),
      ),
      ...overrides?.photoRepository,
    } as unknown as EstablishmentPhotoRepositoryPort;

    const storage: FileStoragePort = {
      put: jest.fn().mockResolvedValueOnce('gallery-full').mockResolvedValueOnce('gallery-thumb'),
    } as unknown as FileStoragePort;

    const imageProcessor: ImageProcessorPort = {
      process: jest.fn().mockResolvedValue(processedImage),
      ...overrides?.imageProcessor,
    } as unknown as ImageProcessorPort;

    const configService = {
      get: jest.fn().mockReturnValue({ maxGalleryPhotos: overrides?.maxGalleryPhotos ?? 12 }),
    };

    return {
      useCase: new AddEstablishmentPhotoUseCase(
        establishmentRepository,
        photoRepository,
        storage,
        imageProcessor,
        configService as never,
      ),
      establishmentRepository,
      photoRepository,
      storage,
      imageProcessor,
    };
  }

  it('throws EstablishmentNotFoundError when the establishment does not exist', async () => {
    const { useCase } = build({
      establishmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer }),
    ).rejects.toThrow(EstablishmentNotFoundError);
  });

  it('throws GalleryLimitReachedError before touching the image processor when the gallery is full', async () => {
    const { useCase, imageProcessor } = build({ photoCount: 12, maxGalleryPhotos: 12 });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer }),
    ).rejects.toThrow(GalleryLimitReachedError);
    expect(imageProcessor.process).not.toHaveBeenCalled();
  });

  it('creates the photo at the next position with the processed image dimensions', async () => {
    const { useCase, photoRepository } = build({ photoCount: 3 });

    const photo = await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    expect(photo.position).toBe(3);
    expect(photo.width).toBe(1600);
    expect(photo.height).toBe(1200);
    expect(photoRepository.create).toHaveBeenCalledTimes(1);
  });
});
