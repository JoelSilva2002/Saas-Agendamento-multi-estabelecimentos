import { Module } from '@nestjs/common';
import { ApiKeyRepositoryPort } from './domain/api-key.repository.port';
import { PrismaApiKeyRepository } from './infrastructure/persistence/prisma-api-key.repository';
import { GenerateApiKeyUseCase } from './application/use-cases/generate-api-key.use-case';
import { ListApiKeysUseCase } from './application/use-cases/list-api-keys.use-case';
import { RevokeApiKeyUseCase } from './application/use-cases/revoke-api-key.use-case';
import { VerifyApiKeyUseCase } from './application/use-cases/verify-api-key.use-case';
import { ApiKeysController } from './presentation/api-keys.controller';

@Module({
  controllers: [ApiKeysController],
  providers: [
    { provide: ApiKeyRepositoryPort, useClass: PrismaApiKeyRepository },
    GenerateApiKeyUseCase,
    ListApiKeysUseCase,
    RevokeApiKeyUseCase,
    VerifyApiKeyUseCase,
  ],
  // VerifyApiKeyUseCase is exported for IntegrationsModule's IntegrationAuthGuard (Fase 24).
  exports: [ApiKeyRepositoryPort, VerifyApiKeyUseCase],
})
export class ApiKeysModule {}
