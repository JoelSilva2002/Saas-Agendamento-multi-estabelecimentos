import { Injectable } from '@nestjs/common';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';
import { ApiKey } from '../../domain/entities/api-key.entity';
import { hashApiKey } from '../../infrastructure/security/api-key-hasher';

@Injectable()
export class VerifyApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepositoryPort) {}

  async execute(rawKey: string): Promise<ApiKey | null> {
    const apiKey = await this.apiKeyRepository.findByHash(hashApiKey(rawKey));
    if (!apiKey || !apiKey.isValid) {
      return null;
    }
    // Fire-and-forget: a slow/failed write here must never block the request the key is
    // authenticating. Best-effort telemetry only (shown in the key management UI).
    void this.apiKeyRepository.touchLastUsed(apiKey.id);
    return apiKey;
  }
}
