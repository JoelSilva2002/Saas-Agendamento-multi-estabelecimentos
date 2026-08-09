import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ClientProfileRepositoryPort } from './domain/client-profile.repository.port';
import { PrismaClientProfileRepository } from './infrastructure/persistence/prisma-client-profile.repository';
import { RegisterClientUseCase } from './application/use-cases/register-client.use-case';

@Module({
  imports: [UsersModule],
  providers: [
    { provide: ClientProfileRepositoryPort, useClass: PrismaClientProfileRepository },
    RegisterClientUseCase,
  ],
  exports: [ClientProfileRepositoryPort, RegisterClientUseCase],
})
export class ClientsModule {}
