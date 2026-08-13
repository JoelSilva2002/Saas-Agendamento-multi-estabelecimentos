import { ReorderEstablishmentPhotosUseCase } from './reorder-establishment-photos.use-case';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import { InvalidPhotoOrderError } from '../../domain/errors/establishment-errors';

describe('ReorderEstablishmentPhotosUseCase', () => {
  function photo(id: string, position: number) {
    return EstablishmentPhoto.fromPersistence({
      id,
      establishmentId: 'est-1',
      storageKey: `${id}.webp`,
      thumbStorageKey: `${id}_thumb.webp`,
      width: 100,
      height: 100,
      byteSize: 10,
      caption: null,
      position,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  function build(overrides?: Partial<EstablishmentPhotoRepositoryPort>) {
    const current = [photo('a', 0), photo('b', 1), photo('c', 2)];
    const photoRepository: EstablishmentPhotoRepositoryPort = {
      findAllByEstablishment: jest.fn().mockResolvedValue(current),
      reorder: jest.fn().mockResolvedValue([photo('c', 0), photo('a', 1), photo('b', 2)]),
      ...overrides,
    } as unknown as EstablishmentPhotoRepositoryPort;

    return { useCase: new ReorderEstablishmentPhotosUseCase(photoRepository), photoRepository };
  }

  it('reorders when the submitted ids exactly match the current set', async () => {
    const { useCase, photoRepository } = build();

    const result = await useCase.execute('est-1', ['c', 'a', 'b']);

    expect(photoRepository.reorder).toHaveBeenCalledWith('est-1', ['c', 'a', 'b']);
    expect(result[0].id).toBe('c');
  });

  it('rejects a list containing a photo id from another establishment', async () => {
    const { useCase, photoRepository } = build();

    await expect(useCase.execute('est-1', ['a', 'b', 'foreign-id'])).rejects.toThrow(InvalidPhotoOrderError);
    expect(photoRepository.reorder).not.toHaveBeenCalled();
  });

  it('rejects a partial list missing a current photo', async () => {
    const { useCase, photoRepository } = build();

    await expect(useCase.execute('est-1', ['a', 'b'])).rejects.toThrow(InvalidPhotoOrderError);
    expect(photoRepository.reorder).not.toHaveBeenCalled();
  });

  it('rejects a list with a duplicated id', async () => {
    const { useCase, photoRepository } = build();

    await expect(useCase.execute('est-1', ['a', 'a', 'b'])).rejects.toThrow(InvalidPhotoOrderError);
    expect(photoRepository.reorder).not.toHaveBeenCalled();
  });
});
