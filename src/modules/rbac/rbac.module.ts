import { Global, Module } from '@nestjs/common';
import { EstablishmentsModule } from '../establishments/establishments.module';
import { RoleRepositoryPort } from './domain/role.repository.port';
import { PermissionRepositoryPort } from './domain/permission.repository.port';
import { MembershipRepositoryPort } from './domain/membership.repository.port';
import { PrismaRoleRepository } from './infrastructure/persistence/prisma-role.repository';
import { PrismaPermissionRepository } from './infrastructure/persistence/prisma-permission.repository';
import { PrismaMembershipRepository } from './infrastructure/persistence/prisma-membership.repository';
import { AssignRoleUseCase } from './application/use-cases/assign-role.use-case';
import { ListRolesUseCase } from './application/use-cases/list-roles.use-case';
import { ListPermissionsUseCase } from './application/use-cases/list-permissions.use-case';
import { RolesController } from './presentation/roles.controller';

// @Global(): same reasoning as EstablishmentsModule — TenantScopeGuard depends on
// MembershipRepositoryPort and is consumed from controllers across modules that don't
// import RbacModule directly.
@Global()
@Module({
  imports: [EstablishmentsModule],
  controllers: [RolesController],
  providers: [
    { provide: RoleRepositoryPort, useClass: PrismaRoleRepository },
    { provide: PermissionRepositoryPort, useClass: PrismaPermissionRepository },
    { provide: MembershipRepositoryPort, useClass: PrismaMembershipRepository },
    AssignRoleUseCase,
    ListRolesUseCase,
    ListPermissionsUseCase,
  ],
  exports: [RoleRepositoryPort, PermissionRepositoryPort, MembershipRepositoryPort, AssignRoleUseCase],
})
export class RbacModule {}
