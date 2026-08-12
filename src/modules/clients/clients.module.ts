import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClientProfileRepositoryPort } from './domain/client-profile.repository.port';
import { PrismaClientProfileRepository } from './infrastructure/persistence/prisma-client-profile.repository';
import { RegisterClientUseCase } from './application/use-cases/register-client.use-case';
import { EnsureClientMembershipUseCase } from './application/use-cases/ensure-client-membership.use-case';
import { ResolveOrCreateClientUseCase } from './application/use-cases/resolve-or-create-client.use-case';
import { ListClientsUseCase } from './application/use-cases/list-clients.use-case';
import { UpdateClientProfileUseCase } from './application/use-cases/update-client-profile.use-case';
import { ClientsController } from './presentation/clients.controller';

@Module({
  imports: [UsersModule],
  controllers: [ClientsController],
  providers: [
    { provide: ClientProfileRepositoryPort, useClass: PrismaClientProfileRepository },
    RegisterClientUseCase,
    EnsureClientMembershipUseCase,
    ResolveOrCreateClientUseCase,
    ListClientsUseCase,
    UpdateClientProfileUseCase,
  ],
  exports: [
    ClientProfileRepositoryPort,
    RegisterClientUseCase,
    EnsureClientMembershipUseCase,
    // Exported for Fase 24's integrations module — a bot resolving "the client on this
    // phone number" reuses the exact same walk-in creation the admin's Encaixe dialog uses.
    ResolveOrCreateClientUseCase,
  ],
})
export class ClientsModule {}
