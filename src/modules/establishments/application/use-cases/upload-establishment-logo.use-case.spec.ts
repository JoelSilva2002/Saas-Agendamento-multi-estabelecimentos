import { UploadEstablishmentLogoUseCase } from './upload-establishment-logo.use-case';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment } from '../../domain/entities/establishment.entity';
import { EstablishmentNotFoundError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';
import { ImageProcessorPort } from '../../../../shared-kernel/domain/image-processor.port';
import { LOGO_PROFILE } from '../../../../shared-kernel/domain/image-profiles';

describe('UploadEstablishmentLogoUseCase', () => {
  const processedImage = {
    full: { buffer: Buffer.from('full'), width: 512, height: 512, contentType: 'image/webp' as const },
    thumb: { buffer: Buffer.from('thumb'), contentType: 'image/webp' as const },
  };

  function buildEstablishment(logo: Establishment['logo'] = null) {
    let establishment = Establishment.create({
      id: 'est-1',
      tenantId: 'tenant-1',
      name: 'Filial',
      slug: 'filial',
    });
    if (logo) {
      establishment = establishment.update({ logo });
    }
    return establishment;
  }

  function build(overrides?: {
    establishmentRepository?: Partial<EstablishmentRepositoryPort>;
    storage?: Partial<FileStoragePort>;
    imageProcessor?: Partial<ImageProcessorPort>;
    existingLogo?: Establishment['logo'];
  }) {
    const establishmentRepository: EstablishmentRepositoryPort = {
      findById: jest.fn().mockResolvedValue(buildEstablishment(overrides?.existingLogo ?? null)),
      update: jest.fn().mockImplementation(async (e) => e),
      ...overrides?.establishmentRepository,
    } as unknown as EstablishmentRepositoryPort;

    const storage: FileStoragePort = {
      put: jest.fn().mockResolvedValueOnce('key-full').mockResolvedValueOnce('key-thumb'),
      delete: jest.fn().mockResolvedValue(undefined),
      publicUrl: jest.fn().mockImplementation((key: string) => `http://localhost:3000/media/${key}`),
      ...overrides?.storage,
    } as unknown as FileStoragePort;

    const imageProcessor: ImageProcessorPort = {
      process: jest.fn().mockResolvedValue(processedImage),
      ...overrides?.imageProcessor,
    } as unknown as ImageProcessorPort;

    return {
      useCase: new UploadEstablishmentLogoUseCase(establishmentRepository, storage, imageProcessor),
      establishmentRepository,
      storage,
      imageProcessor,
    };
  }

  // A real 1x1 PNG — its magic bytes must pass sniffImageFormat before the (mocked) processor
  // is even reached.
  const validPngBuffer = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
    'base64',
  );

  it('throws EstablishmentNotFoundError when the establishment does not exist', async () => {
    const { useCase, establishmentRepository } = build({
      establishmentRepository: { findById: jest.fn().mockResolvedValue(null) },
    });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer }),
    ).rejects.toThrow(EstablishmentNotFoundError);
    expect(establishmentRepository.update).not.toHaveBeenCalled();
  });

  it('processes with the logo profile and writes full + thumb', async () => {
    const { useCase, imageProcessor, storage } = build();

    await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    expect(imageProcessor.process).toHaveBeenCalledWith(validPngBuffer, LOGO_PROFILE, 'png');
    expect(storage.put).toHaveBeenCalledTimes(2);
  });

  it('persists the new logo keys on the establishment', async () => {
    const { useCase, establishmentRepository } = build();

    await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    const updateMock = establishmentRepository.update as jest.Mock;
    expect(updateMock).toHaveBeenCalledTimes(1);
    const updatedEstablishment: Establishment = updateMock.mock.calls[0][0];
    expect(updatedEstablishment.logo).toEqual({ storageKey: 'key-full', thumbStorageKey: 'key-thumb' });
  });

  it('returns absolute URLs for the new logo', async () => {
    const { useCase } = build();

    const result = await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    expect(result).toEqual({
      logoUrl: 'http://localhost:3000/media/key-full',
      logoThumbUrl: 'http://localhost:3000/media/key-thumb',
    });
  });

  it('deletes the previous logo keys only after the establishment update succeeds', async () => {
    const previousLogo = { storageKey: 'old-full', thumbStorageKey: 'old-thumb' };
    const callOrder: string[] = [];
    const { useCase, establishmentRepository, storage } = build({ existingLogo: previousLogo });
    (establishmentRepository.update as jest.Mock).mockImplementation(async (e) => {
      callOrder.push('repository.update');
      return e;
    });
    (storage.delete as jest.Mock).mockImplementation(async () => {
      callOrder.push('storage.delete');
    });

    await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    expect(storage.delete).toHaveBeenCalledWith('old-full');
    expect(storage.delete).toHaveBeenCalledWith('old-thumb');
    expect(callOrder).toEqual(['repository.update', 'storage.delete', 'storage.delete']);
  });

  it('does not attempt cleanup when there was no previous logo', async () => {
    const { useCase, storage } = build({ existingLogo: null });

    await useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer });

    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('does not fail the request when deleting the old logo fails', async () => {
    const previousLogo = { storageKey: 'old-full', thumbStorageKey: 'old-thumb' };
    const { useCase } = build({
      existingLogo: previousLogo,
      storage: { delete: jest.fn().mockRejectedValue(new Error('disk unavailable')) },
    });

    await expect(
      useCase.execute({ tenantId: 'tenant-1', establishmentId: 'est-1', buffer: validPngBuffer }),
    ).resolves.toBeDefined();
  });
});
