import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { AgendaBlockRepositoryPort } from '../../domain/agenda-block.repository.port';
import { AgendaBlock } from '../../domain/entities/agenda-block.entity';

export interface CreateAgendaBlockInput {
  establishmentId: string;
  employeeId?: string | null;
  startAt: Date;
  endAt: Date;
  reason?: string;
  createdById: string;
}

@Injectable()
export class CreateAgendaBlockUseCase {
  constructor(private readonly agendaBlockRepository: AgendaBlockRepositoryPort) {}

  async execute(input: CreateAgendaBlockInput): Promise<AgendaBlock> {
    const block = AgendaBlock.create({
      id: randomUUID(),
      establishmentId: input.establishmentId,
      employeeId: input.employeeId,
      startAt: input.startAt,
      endAt: input.endAt,
      reason: input.reason,
      createdById: input.createdById,
    });
    return this.agendaBlockRepository.create(block);
  }
}
