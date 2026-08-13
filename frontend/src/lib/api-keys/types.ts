export interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: string[];
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
  createdAt: string;
}

export interface CreateApiKeyInput {
  name: string;
  expiresAt?: string;
}

export interface CreateApiKeyResult {
  id: string;
  name: string;
  /** Shown to the caller exactly once — never retrievable again after this response. */
  rawKey: string;
  keyPrefix: string;
  scopes: string[];
  createdAt: string;
}
