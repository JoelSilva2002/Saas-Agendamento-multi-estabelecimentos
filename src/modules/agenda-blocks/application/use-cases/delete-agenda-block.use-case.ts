import { Injectable } from '@nestjs/common';
import { AgendaBlockRepositoryPort } from '../../domain/agenda-block.repository.port';
import { AgendaBlockNotFoundError } from '../../domain/errors/agenda-block-errors';

export interface DeleteAgendaBlockInput {
  establishmentId: string;
  blockId: string;
}

@Injectable()
export class DeleteAgendaBlockUseCase {
  constructor(private readonly agendaBlockRepository: AgendaBlockRepositoryPort) {}

  async execute(input: DeleteAgendaBlockInput): Promise<void> {
    const block = await this.agendaBlockRepository.findById(input.blockId, input.establishmentId);
    if (!block) {
      throw new AgendaBlockNotFoundError(input.blockId);
    }
    await this.agendaBlockRepository.delete(input.blockId, input.establishmentId);
  }
}
