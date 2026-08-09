import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { TenantRepositoryPort } from './domain/tenant.repository.port';
import { PrismaTenantRepository } from './infrastructure/persistence/prisma-tenant.repository';
import { CreateTenantUseCase } from './application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from './application/use-cases/get-tenant.use-case';
import { ListTenantsUseCase } from './application/use-cases/list-tenants.use-case';
import { TenantsController } from './presentation/tenants.controller';

@Module({
  imports: [RbacModule],
  controllers: [TenantsController],
  providers: [
    { provide: TenantRepositoryPort, useClass: PrismaTenantRepository },
    CreateTenantUseCase,
    GetTenantUseCase,
    ListTenantsUseCase,
  ],
  exports: [TenantRepositoryPort],
})
export class TenantsModule {}
