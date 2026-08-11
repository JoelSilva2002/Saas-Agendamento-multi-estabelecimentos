import { Injectable } from '@nestjs/common';
import { AgendaBlockFilters, AgendaBlockRepositoryPort } from '../../domain/agenda-block.repository.port';
import { AgendaBlock } from '../../domain/entities/agenda-block.entity';

export interface ListAgendaBlocksInput {
  establishmentId: string;
  filters: AgendaBlockFilters;
}

@Injectable()
export class ListAgendaBlocksUseCase {
  constructor(private readonly agendaBlockRepository: AgendaBlockRepositoryPort) {}

  async execute(input: ListAgendaBlocksInput): Promise<AgendaBlock[]> {
    return this.agendaBlockRepository.findMany(input.establishmentId, input.filters);
  }
}
