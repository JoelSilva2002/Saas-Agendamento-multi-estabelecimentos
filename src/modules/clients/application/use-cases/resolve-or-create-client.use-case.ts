import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { User } from '../../../users/domain/entities/user.entity';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';
import { EnsureClientMembershipUseCase } from './ensure-client-membership.use-case';

export interface ResolveOrCreateClientInput {
  establishmentId: string;
  firstName: string;
  lastName?: string;
  /** Matched against an existing account first — safe to trust here (unlike the public
   * self-signup endpoint) because the caller is already an authenticated staff member or
   * integration key, not an anonymous visitor trying to take over someone's email. */
  email?: string;
  /** Matched against an existing ClientProfile at this establishment when no email match was
   * found — see ClientProfileRepositoryPort.findByPhone. */
  phone?: string;
  birthDate?: Date;
  notes?: string;
}

export interface ResolveOrCreateClientOutput {
  userId: string;
  clientProfileId: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  /** False when an existing person was matched and reused instead of a new account being
   * created — lets the caller decide whether to show "cliente já cadastrado" feedback. */
  wasCreated: boolean;
}

/**
 * The walk-in counterpart to RegisterClientUseCase: staff (or an integration acting on their
 * behalf) naming a client during manual booking, where an email is often not on hand.
 * Resolution order — email match, then phone match, then create a brand-new walk-in account
 * (User.createWalkIn: no password, email optional) — then always ensures the establishment
 * membership (role grant + ClientProfile) via EnsureClientMembershipUseCase, which is
 * idempotent so re-resolving the same person twice is harmless.
 */
@Injectable()
export class ResolveOrCreateClientUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly clientProfileRepository: ClientProfileRepositoryPort,
    private readonly ensureClientMembership: EnsureClientMembershipUseCase,
  ) {}

  async execute(input: ResolveOrCreateClientInput): Promise<ResolveOrCreateClientOutput> {
    const { user, wasCreated } = await this.resolveOrCreateUser(input);

    const profile = await this.ensureClientMembership.execute({
      userId: user.id,
      establishmentId: input.establishmentId,
      phone: input.phone,
      birthDate: input.birthDate,
      notes: input.notes,
    });

    return {
      userId: user.id,
      clientProfileId: profile.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: profile.phone,
      wasCreated,
    };
  }

  private async resolveOrCreateUser(
    input: ResolveOrCreateClientInput,
  ): Promise<{ user: User; wasCreated: boolean }> {
    if (input.email) {
      const normalizedEmail = input.email.toLowerCase().trim();
      const existingByEmail = await this.userRepository.findByEmail(normalizedEmail);
      if (existingByEmail) {
        return { user: existingByEmail, wasCreated: false };
      }
    }

    if (input.phone) {
      const existingProfile = await this.clientProfileRepository.findByPhone(
        input.establishmentId,
        input.phone,
      );
      if (existingProfile) {
        const existingUser = await this.userRepository.findById(existingProfile.userId);
        if (existingUser) {
          return { user: existingUser, wasCreated: false };
        }
      }
    }

    const walkIn = User.createWalkIn({
      id: randomUUID(),
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
    });
    const created = await this.userRepository.create(walkIn);
    return { user: created, wasCreated: true };
  }
}
