import { Controller, Get, UseGuards } from '@nestjs/common';
import { ListRolesUseCase } from '../application/use-cases/list-roles.use-case';
import { ListPermissionsUseCase } from '../application/use-cases/list-permissions.use-case';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/presentation/guards/platform-admin.guard';

@Controller()
@UseGuards(JwtAuthGuard)
export class RolesController {
  constructor(
    private readonly listRoles: ListRolesUseCase,
    private readonly listPermissions: ListPermissionsUseCase,
  ) {}

  @Get('roles')
  async getRoles() {
    const roles = await this.listRoles.execute();
    return roles.map((role) => ({
      id: role.id,
      name: role.name,
      description: role.description,
      isSystem: role.isSystem,
      permissions: role.permissionKeys,
    }));
  }

  @Get('permissions')
  @UseGuards(PlatformAdminGuard)
  async getPermissions() {
    const permissions = await this.listPermissions.execute();
    return permissions.map((permission) => ({
      id: permission.id,
      key: permission.key,
      description: permission.description,
    }));
  }
}
