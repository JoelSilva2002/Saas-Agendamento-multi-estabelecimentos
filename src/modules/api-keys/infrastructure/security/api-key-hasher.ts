import { randomBytes, createHash } from 'crypto';

const API_KEY_SECRET_BYTES = 32;
const API_KEY_PREFIX = 'sk_live_';
// How much of the raw secret (after the prefix) is kept in the clear on the ApiKey row so the
// management UI can help identify a key without ever re-displaying the full secret.
const VISIBLE_PREFIX_CHARS = 8;

export interface GeneratedApiKey {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

// Not injectable on purpose — pure functions, no state, no need for DI (mirrors the free
// functions on JwtTokenService's generate/hash pair but without the JwtService dependency).
export function generateApiKey(): GeneratedApiKey {
  const secret = randomBytes(API_KEY_SECRET_BYTES).toString('hex');
  const rawKey = `${API_KEY_PREFIX}${secret}`;
  return {
    rawKey,
    keyPrefix: rawKey.slice(0, API_KEY_PREFIX.length + VISIBLE_PREFIX_CHARS),
    keyHash: hashApiKey(rawKey),
  };
}

export function hashApiKey(rawKey: string): string {
  return createHash('sha256').update(rawKey).digest('hex');
}
