import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import {
  CreateImpersonationSessionParams,
  ImpersonationSession,
  ImpersonationSessionRepositoryPort,
} from '../../domain/impersonation-session.repository.port';

@Injectable()
export class PrismaImpersonationSessionRepository implements ImpersonationSessionRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateImpersonationSessionParams): Promise<ImpersonationSession> {
    return this.prisma.impersonationSession.create({ data: params });
  }

  async findById(id: string): Promise<ImpersonationSession | null> {
    return this.prisma.impersonationSession.findUnique({ where: { id } });
  }

  async end(id: string, endedAt: Date): Promise<void> {
    await this.prisma.impersonationSession.update({ where: { id }, data: { endedAt } });
  }
}
