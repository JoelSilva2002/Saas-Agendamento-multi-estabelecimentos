import { Injectable } from '@nestjs/common';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';
import { ApiKey } from '../../domain/entities/api-key.entity';

@Injectable()
export class ListApiKeysUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepositoryPort) {}

  async execute(establishmentId: string): Promise<ApiKey[]> {
    return this.apiKeyRepository.findAllForEstablishment(establishmentId);
  }
}
