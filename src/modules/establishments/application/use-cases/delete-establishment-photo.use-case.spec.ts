import { DeleteEstablishmentPhotoUseCase } from './delete-establishment-photo.use-case';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import { EstablishmentPhotoNotFoundError } from '../../domain/errors/establishment-errors';
import { FileStoragePort } from '../../../../shared-kernel/domain/file-storage.port';

describe('DeleteEstablishmentPhotoUseCase', () => {
  const photo = EstablishmentPhoto.fromPersistence({
    id: 'photo-1',
    establishmentId: 'est-1',
    storageKey: 'gallery-full',
    thumbStorageKey: 'gallery-thumb',
    width: 1600,
    height: 1200,
    byteSize: 1000,
    caption: null,
    position: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  function build(overrides?: {
    photoRepository?: Partial<EstablishmentPhotoRepositoryPort>;
    storage?: Partial<FileStoragePort>;
  }) {
    const photoRepository: EstablishmentPhotoRepositoryPort = {
      findByIdInEstablishment: jest.fn().mockResolvedValue(photo),
      delete: jest.fn().mockResolvedValue(undefined),
      ...overrides?.photoRepository,
    } as unknown as EstablishmentPhotoRepositoryPort;

    const storage: FileStoragePort = {
      delete: jest.fn().mockResolvedValue(undefined),
      ...overrides?.storage,
    } as unknown as FileStoragePort;

    return { useCase: new DeleteEstablishmentPhotoUseCase(photoRepository, storage), photoRepository, storage };
  }

  it('throws EstablishmentPhotoNotFoundError when the photo belongs to another establishment', async () => {
    const { useCase, storage } = build({
      photoRepository: { findByIdInEstablishment: jest.fn().mockResolvedValue(null) },
    });

    await expect(useCase.execute('photo-1', 'est-1')).rejects.toThrow(EstablishmentPhotoNotFoundError);
    expect(storage.delete).not.toHaveBeenCalled();
  });

  it('deletes the row before the files', async () => {
    const callOrder: string[] = [];
    const { useCase, photoRepository, storage } = build();
    (photoRepository.delete as jest.Mock).mockImplementation(async () => {
      callOrder.push('photoRepository.delete');
    });
    (storage.delete as jest.Mock).mockImplementation(async () => {
      callOrder.push('storage.delete');
    });

    await useCase.execute('photo-1', 'est-1');

    expect(callOrder).toEqual(['photoRepository.delete', 'storage.delete', 'storage.delete']);
    expect(storage.delete).toHaveBeenCalledWith('gallery-full');
    expect(storage.delete).toHaveBeenCalledWith('gallery-thumb');
  });

  it('does not fail the request when file cleanup fails', async () => {
    const { useCase } = build({ storage: { delete: jest.fn().mockRejectedValue(new Error('disk error')) } });

    await expect(useCase.execute('photo-1', 'est-1')).resolves.toBeUndefined();
  });
});
