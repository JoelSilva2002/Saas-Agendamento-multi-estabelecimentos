import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { InviteUserUseCase } from '../application/use-cases/invite-user.use-case';
import { GetUserUseCase } from '../application/use-cases/get-user.use-case';
import { ListTenantUsersUseCase } from '../application/use-cases/list-tenant-users.use-case';
import { UpdateUserUseCase } from '../application/use-cases/update-user.use-case';
import { UpdateUserRoleUseCase } from '../application/use-cases/update-user-role.use-case';
import { InviteUserRequestDto } from './dto/invite-user.request.dto';
import { UpdateUserRequestDto } from './dto/update-user.request.dto';
import { UpdateUserRoleRequestDto } from './dto/update-user-role.request.dto';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { User } from '../domain/entities/user.entity';

@Controller('tenants/:tenantId/users')
export class UsersController {
  constructor(
    private readonly inviteUser: InviteUserUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly listTenantUsers: ListTenantUsersUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly updateUserRole: UpdateUserRoleUseCase,
  ) {}

  @Post('invite')
  @Auth('user:invite')
  async invite(@Param('tenantId') tenantId: string, @Body() dto: InviteUserRequestDto) {
    const result = await this.inviteUser.execute({ tenantId, ...dto });
    return {
      user: this.toResponse(result.user),
      temporaryPassword: result.temporaryPassword,
    };
  }

  @Get()
  @Auth('user:read')
  async list(@Param('tenantId') tenantId: string) {
    const users = await this.listTenantUsers.execute(tenantId);
    return users.map((user) => this.toResponse(user));
  }

  @Get(':userId')
  @Auth('user:read')
  async getOne(@Param('tenantId') tenantId: string, @Param('userId') userId: string) {
    const user = await this.getUser.execute({ tenantId, userId });
    return this.toResponse(user);
  }

  @Patch(':userId')
  @Auth('user:update')
  async update(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRequestDto,
  ) {
    const user = await this.updateUser.execute({ tenantId, userId, ...dto });
    return this.toResponse(user);
  }

  @Patch(':userId/role')
  @Auth('role:assign')
  async updateRole(
    @Param('tenantId') tenantId: string,
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleRequestDto,
  ) {
    const membership = await this.updateUserRole.execute({ tenantId, userId, ...dto });
    return {
      id: membership.id,
      userId: membership.userId,
      tenantId: membership.tenantId,
      establishmentId: membership.establishmentId,
      roleId: membership.roleId,
    };
  }

  private toResponse(user: User) {
    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      isActive: user.isActive,
    };
  }
}
