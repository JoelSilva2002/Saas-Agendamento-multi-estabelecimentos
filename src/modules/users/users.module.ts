import { Module } from '@nestjs/common';
import { RbacModule } from '../rbac/rbac.module';
import { UserRepositoryPort } from './domain/user.repository.port';
import { PrismaUserRepository } from './infrastructure/persistence/prisma-user.repository';
import { InviteUserUseCase } from './application/use-cases/invite-user.use-case';
import { GetUserUseCase } from './application/use-cases/get-user.use-case';
import { ListTenantUsersUseCase } from './application/use-cases/list-tenant-users.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user.use-case';
import { UpdateUserRoleUseCase } from './application/use-cases/update-user-role.use-case';
import { UsersController } from './presentation/users.controller';

@Module({
  imports: [RbacModule],
  controllers: [UsersController],
  providers: [
    { provide: UserRepositoryPort, useClass: PrismaUserRepository },
    InviteUserUseCase,
    GetUserUseCase,
    ListTenantUsersUseCase,
    UpdateUserUseCase,
    UpdateUserRoleUseCase,
  ],
  exports: [UserRepositoryPort],
})
export class UsersModule {}
