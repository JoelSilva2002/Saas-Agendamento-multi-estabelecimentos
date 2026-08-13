export interface ApiKeyProps {
  id: string;
  establishmentId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  createdById: string;
  lastUsedAt: Date | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
}

export class ApiKey {
  private constructor(private readonly props: ApiKeyProps) {}

  static fromPersistence(props: ApiKeyProps): ApiKey {
    return new ApiKey(props);
  }

  get id(): string {
    return this.props.id;
  }

  get establishmentId(): string {
    return this.props.establishmentId;
  }

  get name(): string {
    return this.props.name;
  }

  get keyPrefix(): string {
    return this.props.keyPrefix;
  }

  get scopes(): string[] {
    return this.props.scopes;
  }

  get createdById(): string {
    return this.props.createdById;
  }

  get lastUsedAt(): Date | null {
    return this.props.lastUsedAt;
  }

  get expiresAt(): Date | null {
    return this.props.expiresAt;
  }

  get revokedAt(): Date | null {
    return this.props.revokedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get isExpired(): boolean {
    return this.props.expiresAt !== null && this.props.expiresAt.getTime() < Date.now();
  }

  get isRevoked(): boolean {
    return this.props.revokedAt !== null;
  }

  get isValid(): boolean {
    return !this.isExpired && !this.isRevoked;
  }

  hasScope(permissionKey: string): boolean {
    return this.props.scopes.includes(permissionKey);
  }
}
