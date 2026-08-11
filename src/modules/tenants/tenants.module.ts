import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { UsersModule } from '../users/users.module';
import { TenantRepositoryPort } from './domain/tenant.repository.port';
import { ImpersonationSessionRepositoryPort } from './domain/impersonation-session.repository.port';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma-tenant.repository';
import { PrismaImpersonationSessionRepository } from './infrastructure/persistence/prisma-impersonation-session.repository';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from './application/use-cases/get-tenant.use-case';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.use-case';
import { UpdateTenantStatusUseCase } from './application/use-cases/update-tenant-status.use-case';
import { ImpersonateTenantUseCase } from './application/use-cases/impersonate-tenant.use-case';
import { EndImpersonationUseCase } from './application/use-cases/end-impersonation.use-case';
import { TenantsController } from './presentation/tenants.controller';

@Module({
  // UsersModule: ImpersonateTenantUseCase needs UserRepositoryPort to load the tenant owner
  // it's about to issue a token for. RbacModule/EstablishmentsModule/AuthModule ports
  // (MembershipRepositoryPort, EstablishmentRepositoryPort, TokenServicePort) are already
  // @Global() and don't need to be imported here.
  imports: [RbacModule, UsersModule],
  controllers: [TenantsController],
  providers: [
    { provide: TenantRepositoryPort, useClass: PrismaTenantRepository },
    { provide: ImpersonationSessionRepositoryPort, useClass: PrismaImpersonationSessionRepository },
    CreateTenantUseCase,
    GetTenantUseCase,
    ListTenantsUseCase,
    UpdateTenantStatusUseCase,
    ImpersonateTenantUseCase,
    EndImpersonationUseCase,
  ],
  exports: [TenantRepositoryPort],
})
export class TenantsModule {}
