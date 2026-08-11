import { Module } from '@nestjs/common';
import { AgendaBlockRepositoryPort } from './domain/agenda-block.repository.port';
import { PrismaAgendaBlockRepository } from './infrastructure/persistence/prisma-agenda-block.repository';
import { CreateAgendaBlockUseCase } from './application/use-cases/create-agenda-block.use-case';
import { ListAgendaBlocksUseCase } from './application/use-cases/list-agenda-blocks.use-case';
import { DeleteAgendaBlockUseCase } from './application/use-cases/delete-agenda-block.use-case';
import { AgendaBlocksController } from './presentation/agenda-blocks.controller';

@Module({
  controllers: [AgendaBlocksController],
  providers: [
    { provide: AgendaBlockRepositoryPort, useClass: PrismaAgendaBlockRepository },
    CreateAgendaBlockUseCase,
    ListAgendaBlocksUseCase,
    DeleteAgendaBlockUseCase,
  ],
})
export class AgendaBlocksModule {}
