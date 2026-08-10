import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserProps {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  isPlatformAdmin: boolean;
  themePreference: ThemePreference;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserProps {
  id: string;
  email: string;
  passwordHash: string;
  firstName: string;
  lastName: string;
  isPlatformAdmin?: boolean;
}

export class User {
  private constructor(private readonly props: UserProps) {}

  static create(props: CreateUserProps): User {
    if (!EMAIL_REGEX.test(props.email)) {
      throw new ValidationError(`Email inválido: '${props.email}'`);
    }
    if (!props.passwordHash) {
      throw new ValidationError('User requer um password_hash definido');
    }
    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new ValidationError('User requer um primeiro nome');
    }

    const now = new Date();
    return new User({
      id: props.id,
      email: props.email.toLowerCase().trim(),
      passwordHash: props.passwordHash,
      firstName: props.firstName.trim(),
      lastName: props.lastName.trim(),
      isActive: true,
      isPlatformAdmin: props.isPlatformAdmin ?? false,
      themePreference: 'system',
      createdAt: now,
      updatedAt: now,
    });
  }

  static fromPersistence(props: UserProps): User {
    return new User(props);
  }

  get id(): string {
    return this.props.id;
  }

  get email(): string {
    return this.props.email;
  }

  get passwordHash(): string {
    return this.props.passwordHash;
  }

  get firstName(): string {
    return this.props.firstName;
  }

  get lastName(): string {
    return this.props.lastName;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get isPlatformAdmin(): boolean {
    return this.props.isPlatformAdmin;
  }

  get themePreference(): ThemePreference {
    return this.props.themePreference;
  }

  update(changes: {
    firstName?: string;
    lastName?: string;
    isActive?: boolean;
    themePreference?: ThemePreference;
  }): User {
    const firstName = changes.firstName?.trim() ?? this.props.firstName;
    if (firstName.length === 0) {
      throw new ValidationError('User requer um primeiro nome');
    }
    return new User({
      ...this.props,
      firstName,
      lastName: changes.lastName?.trim() ?? this.props.lastName,
      isActive: changes.isActive ?? this.props.isActive,
      themePreference: changes.themePreference ?? this.props.themePreference,
      updatedAt: new Date(),
    });
  }

  toPersistenceProps(): UserProps {
    return { ...this.props };
  }
}
