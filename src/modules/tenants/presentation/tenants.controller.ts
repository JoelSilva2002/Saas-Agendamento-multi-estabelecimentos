import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CreateTenantUseCase } from '../application/use-cases/create-tenant.use-case';
import { GetTenantUseCase } from '../application/use-cases/get-tenant.use-case';
import { ListTenantsUseCase } from '../application/use-cases/list-tenants.use-case';
import { CreateTenantRequestDto } from './dto/create-tenant.request.dto';
import { JwtAuthGuard } from '../../auth/presentation/guards/jwt-auth.guard';
import { PlatformAdminGuard } from '../../auth/presentation/guards/platform-admin.guard';
import { Tenant } from '../domain/entities/tenant.entity';

@Controller('tenants')
@UseGuards(JwtAuthGuard, PlatformAdminGuard)
export class TenantsController {
  constructor(
    private readonly createTenant: CreateTenantUseCase,
    private readonly getTenant: GetTenantUseCase,
    private readonly listTenants: ListTenantsUseCase,
  ) {}

  @Post()
  async create(@Body() dto: CreateTenantRequestDto) {
    const result = await this.createTenant.execute(dto);
    return { ...this.toResponse(result.tenant), ownerUserId: result.ownerUserId };
  }

  @Get()
  async list() {
    const tenants = await this.listTenants.execute();
    return tenants.map((tenant) => this.toResponse(tenant));
  }

  @Get(':tenantId')
  async getOne(@Param('tenantId') tenantId: string) {
    const tenant = await this.getTenant.execute(tenantId);
    return this.toResponse(tenant);
  }

  private toResponse(tenant: Tenant) {
    return { id: tenant.id, name: tenant.name, slug: tenant.slug, status: tenant.status };
  }
}
