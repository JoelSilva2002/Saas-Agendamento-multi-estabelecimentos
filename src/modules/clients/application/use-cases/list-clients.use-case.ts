import { Injectable } from '@nestjs/common';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { ClientProfile } from '../../domain/entities/client-profile.entity';

@Injectable()
export class ListClientsUseCase {
  constructor(private readonly clientProfileRepository: ClientProfileRepositoryPort) {}

  async execute(establishmentId: string): Promise<ClientProfile[]> {
    return this.clientProfileRepository.findMany(establishmentId);
  }
}
