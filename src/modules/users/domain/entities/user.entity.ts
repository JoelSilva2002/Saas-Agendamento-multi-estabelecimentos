import { ValidationError } from '../../../../shared-kernel/domain/domain-error';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ThemePreference = 'light' | 'dark' | 'system';

export interface UserProps {
  id: string;
  /** Null for a walk-in client created without contact info — see createWalkIn(). Every
   * other user (staff, self-registered clients) always has one; @unique tolerates multiple
   * NULLs in Postgres, so this doesn't weaken the "one account per email" guarantee. */
  email: string | null;
  /** Null iff email is null — a walk-in has no password and therefore can never log in
   * (see User.canAuthenticate and LoginUseCase's explicit guard against a null hash). */
  passwordHash: string | null;
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

export interface CreateWalkInUserProps {
  id: string;
  firstName: string;
  /** Optional — a walk-in is frequently booked with just a first name ("Dona Maria"). */
  lastName?: string;
  /** Optional — validated with the same rules as a real account when present, but a
   * walk-in client is often booked with nothing more than a first name. */
  email?: string | null;
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

  /** A client created inline by staff (walk-in / phone booking) who may not have given an
   * e-mail. Has no password and can never log in — see canAuthenticate. If an e-mail is
   * given it's validated and normalized exactly like a real account's, so it can still be
   * matched against later (e.g. ResolveOrCreateClientUseCase looking the person up again). */
  static createWalkIn(props: CreateWalkInUserProps): User {
    if (!props.firstName || props.firstName.trim().length === 0) {
      throw new ValidationError('User requer um primeiro nome');
    }
    const email = props.email?.trim() || null;
    if (email && !EMAIL_REGEX.test(email)) {
      throw new ValidationError(`Email inválido: '${email}'`);
    }

    const now = new Date();
    return new User({
      id: props.id,
      email: email?.toLowerCase() ?? null,
      passwordHash: null,
      firstName: props.firstName.trim(),
      lastName: props.lastName?.trim() ?? '',
      isActive: true,
      isPlatformAdmin: false,
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

  get email(): string | null {
    return this.props.email;
  }

  get passwordHash(): string | null {
    return this.props.passwordHash;
  }

  /** Only accounts with both an e-mail and a password can log in — a walk-in client created
   * without contact info has neither. */
  get canAuthenticate(): boolean {
    return !!this.props.email && !!this.props.passwordHash;
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
