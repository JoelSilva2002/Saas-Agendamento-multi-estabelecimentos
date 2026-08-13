import { Injectable } from '@nestjs/common';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import { InvalidPhotoOrderError } from '../../domain/errors/establishment-errors';

@Injectable()
export class ReorderEstablishmentPhotosUseCase {
  constructor(private readonly photoRepository: EstablishmentPhotoRepositoryPort) {}

  async execute(establishmentId: string, photoIds: string[]): Promise<EstablishmentPhoto[]> {
    const current = await this.photoRepository.findAllByEstablishment(establishmentId);
    const currentIds = new Set(current.map((photo) => photo.id));
    const submittedIds = new Set(photoIds);

    // The submitted list must be exactly the establishment's current photo set — no extras, no
    // omissions, no duplicates. A partial reorder would leave the missing photos' positions
    // undefined relative to the rest.
    const isExactMatch =
      photoIds.length === currentIds.size &&
      submittedIds.size === photoIds.length &&
      photoIds.every((id) => currentIds.has(id));
    if (!isExactMatch) {
      throw new InvalidPhotoOrderError();
    }

    return this.photoRepository.reorder(establishmentId, photoIds);
  }
}
