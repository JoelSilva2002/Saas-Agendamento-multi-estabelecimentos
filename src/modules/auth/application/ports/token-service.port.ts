export interface AccessTokenPayload {
  sub: string;
  email: string;
}

export abstract class TokenServicePort {
  abstract signAccessToken(payload: AccessTokenPayload): string;
  abstract generateOpaqueRefreshToken(): string;
  abstract hashRefreshToken(rawToken: string): string;
}
