import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ApiKeyRepositoryPort } from '../../domain/api-key.repository.port';
import { generateApiKey } from '../../infrastructure/security/api-key-hasher';

// Fixed scope set for every generated key, matching the capability the establishment asked
// for (Fase 24): query availability/appointments, create appointments, and cancel/reschedule
// them. Reuses the exact permission keys PermissionsGuard already checks for staff — there is
// no separate scope vocabulary, and no per-key scope picker in the UI (there's only one thing
// a key can be authorized to do today).
export const API_KEY_SCOPES = ['appointment:read', 'appointment:create', 'appointment:update'];

export interface GenerateApiKeyInput {
  establishmentId: string;
  name: string;
  createdById: string;
  expiresAt?: Date;
}

export interface GenerateApiKeyResult {
  id: string;
  name: string;
  // Only ever returned here, at creation time — never persisted or retrievable again.
  rawKey: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: Date;
}

@Injectable()
export class GenerateApiKeyUseCase {
  constructor(private readonly apiKeyRepository: ApiKeyRepositoryPort) {}

  async execute(input: GenerateApiKeyInput): Promise<GenerateApiKeyResult> {
    const { rawKey, keyPrefix, keyHash } = generateApiKey();

    const created = await this.apiKeyRepository.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      name: input.name,
      keyPrefix,
      keyHash,
      scopes: API_KEY_SCOPES,
      createdById: input.createdById,
      expiresAt: input.expiresAt ?? null,
    });

    return {
      id: created.id,
      name: created.name,
      rawKey,
      keyPrefix: created.keyPrefix,
      scopes: created.scopes,
      createdAt: created.createdAt,
    };
  }
}
