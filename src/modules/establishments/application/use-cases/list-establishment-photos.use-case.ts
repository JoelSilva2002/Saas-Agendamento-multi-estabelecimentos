import { Injectable } from '@nestjs/common';
import { EstablishmentPhotoRepositoryPort } from '../../domain/establishment-photo.repository.port';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';

@Injectable()
export class ListEstablishmentPhotosUseCase {
  constructor(private readonly photoRepository: EstablishmentPhotoRepositoryPort) {}

  async execute(establishmentId: string): Promise<EstablishmentPhoto[]> {
    return this.photoRepository.findAllByEstablishment(establishmentId);
  }
}
