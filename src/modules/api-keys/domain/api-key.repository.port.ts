import { ApiKey } from './entities/api-key.entity';

export interface CreateApiKeyParams {
  id: string;
  establishmentId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  createdById: string;
  expiresAt: Date | null;
}

export abstract class ApiKeyRepositoryPort {
  abstract create(params: CreateApiKeyParams): Promise<ApiKey>;
  abstract findByHash(keyHash: string): Promise<ApiKey | null>;
  abstract findAllForEstablishment(establishmentId: string): Promise<ApiKey[]>;
  abstract findByIdInEstablishment(id: string, establishmentId: string): Promise<ApiKey | null>;
  abstract revoke(id: string): Promise<void>;
  abstract touchLastUsed(id: string): Promise<void>;
}
