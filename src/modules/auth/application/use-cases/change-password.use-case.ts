import { Injectable } from '@nestjs/common';
import { UserRepositoryPort } from '../../../users/domain/user.repository.port';
import { UserNotFoundError } from '../../../users/domain/errors/user-errors';
import { RefreshTokenRepositoryPort } from '../../domain/refresh-token.repository.port';
import { PasswordHasherPort } from '../ports/password-hasher.port';
import { WrongCurrentPasswordError } from '../../domain/errors/auth-errors';

export interface ChangePasswordInput {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

@Injectable()
export class ChangePasswordUseCase {
  constructor(
    private readonly userRepository: UserRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly refreshTokenRepository: RefreshTokenRepositoryPort,
  ) {}

  async execute(input: ChangePasswordInput): Promise<void> {
    const user = await this.userRepository.findById(input.userId);
    if (!user) {
      throw new UserNotFoundError(input.userId);
    }

    // A walk-in client (see User.createWalkIn) has no password at all — there's nothing to
    // change against. In practice this path can't be reached for one anyway, since a user
    // with no password can never authenticate to call this use case in the first place.
    if (!user.passwordHash) {
      throw new WrongCurrentPasswordError();
    }

    const matches = await this.passwordHasher.verify(user.passwordHash, input.currentPassword);
    if (!matches) {
      throw new WrongCurrentPasswordError();
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);
    await this.userRepository.updatePassword(user.id, newHash);

    // Any refresh token issued before the change keeps working otherwise — a password change
    // is the user's way of cutting off sessions they no longer trust.
    await this.refreshTokenRepository.revokeAllForUser(user.id);
  }
}
