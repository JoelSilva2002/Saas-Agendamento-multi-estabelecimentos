import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';

@Injectable()
export class RevokeApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepositoryPort) {}

  async execute(id: string, establishmentId: string): Promise<void> {
    const apiKey = await this.apiKeyRepository.findByIdInEstablishment(id, establishmentId);
    if (!apiKey) {
      throw new NotFoundException();
    }
    await this.apiKeyRepository.revoke(id);
  }
}
