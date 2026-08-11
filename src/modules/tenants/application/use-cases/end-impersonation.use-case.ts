import { Injectable } from '@nestjs/common';
import { ForbiddenError, NotFoundError } from '../../../../shared-kernel/domain/domain-error';
import { ImpersonationSessionRepositoryPort } from '../../domain/impersonation-session.repository.port';

export class ImpersonationSessionNotFoundError extends NotFoundError {
  constructor(id: string) {
    super(`Sessão de impersonation '${id}' não encontrada`);
  }
}

export interface EndImpersonationInput {
  sessionId: string;
  platformAdminUserId: string;
}

@Injectable()
export class EndImpersonationUseCase {
  constructor(private readonly impersonationSessionRepository: ImpersonationSessionRepositoryPort) {}

  async execute(input: EndImpersonationInput): Promise<void> {
    const session = await this.impersonationSessionRepository.findById(input.sessionId);
    if (!session) {
      throw new ImpersonationSessionNotFoundError(input.sessionId);
    }
    if (session.platformAdminUserId !== input.platformAdminUserId) {
      throw new ForbiddenError('Você não pode encerrar a sessão de impersonation de outro administrador');
    }

    await this.impersonationSessionRepository.end(input.sessionId, new Date());
  }
}
