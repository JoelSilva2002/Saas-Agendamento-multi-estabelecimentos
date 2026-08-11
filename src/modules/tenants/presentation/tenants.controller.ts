import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CreateTenantUseCase } from '../application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from '../application/use-cases/get-tenant.use-case';
import { ListTenantsUseCase } from '../application/use-cases/list-tenants.use-case';
import { UpdateTenantStatusUseCase } from '../application/use-cases/update-tenant-status.use-case';
import { ImpersonateTenantUseCase } from '../application/use-cases/impersonate-tenant.use-case';
import { EndImpersonationUseCase } from '../application/use-cases/end-impersonation.use-case';
import { CreateTenantRequestDto } from './dto/create-tenant.request.dto';
import { UpdateTenantStatusRequestDto } from './dto/update-tenant-status.request.dto';
import { ListTenantsQueryDto } from './dto/list-tenants.query.dto';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/presentation/guards/platform-admin.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../../auth/domain/request-context.types';
import { Tenant } from '../domain/entities/tenant.entity';
import { Establishment } from '../../establishments/domain/entities/establishment.entity';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
    private readonly updateTenantStatus: UpdateTenantStatusUseCase,
    private readonly impersonateTenant: ImpersonateTenantUseCase,
    private readonly endImpersonation: EndImpersonationUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantRequestDto) {
    const result = await this.createTenant.execute(dto);
    return {
      ...this.toResponse(result.tenant),
      ownerUserId: result.ownerUserId,
      establishment: this.toEstablishmentResponse(result.establishment),
      temporaryPassword: result.temporaryPassword,
    };
  }

  @Get()
  async list(@Query() query: ListTenantsQueryDto) {
    const { items, total } = await this.listTenants.execute(query);
    return {
      items: items.map((tenant) => this.toResponse(tenant)),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Get(':tenantId')
  async getOne(@Param('tenantId') tenantId: string) {
    const tenant = await this.getTenant.execute(tenantId);
    return this.toResponse(tenant);
  }

  @Patch(':tenantId/status')
  async changeStatus(@Param('tenantId') tenantId: string, @Body() dto: UpdateTenantStatusRequestDto) {
    const tenant = await this.updateTenantStatus.execute({ tenantId, status: dto.status });
    return this.toResponse(tenant);
  }

  @Post(':tenantId/impersonate')
  async impersonate(@Param('tenantId') tenantId: string, @CurrentUser() admin: AuthenticatedUser) {
    return this.impersonateTenant.execute({ tenantId, platformAdminUserId: admin.id });
  }

  @Post('impersonation/:sessionId/end')
  @HttpCode(HttpStatus.NO_CONTENT)
  async endImpersonationSession(
    @Param('sessionId') sessionId: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    await this.endImpersonation.execute({ sessionId, platformAdminUserId: admin.id });
  }

  private toResponse(tenant: Tenant) {
    return {
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      document: tenant.document,
      plan: tenant.plan,
      status: tenant.status,
    };
  }

  private toEstablishmentResponse(establishment: Establishment) {
    return { id: establishment.id, name: establishment.name, slug: establishment.slug };
  }
}
