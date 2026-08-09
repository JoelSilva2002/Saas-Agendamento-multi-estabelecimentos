import { Injectable } from '@nestjs/common';
import { EstablishmentRepositoryPort } from '../../domain/establishment.repository.port';
import { Establishment } from '../../domain/entities/establishment.entity';

@Injectable()
export class ListEstablishmentsUseCase {
  constructor(private readonly establishmentRepository: EstablishmentRepositoryPort) {}

  async execute(tenantId: string): Promise<Establishment[]> {
    const establishments = await this.establishmentRepository.findAllByTenant(tenantId);
    return establishments.filter((establishment) => !establishment.deletedAt);
  }
}
