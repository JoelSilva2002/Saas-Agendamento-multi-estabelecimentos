import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { TenantNotFoundError } from '../../domain/errors/tenant-errors';

@Injectable()
export class GetTenantUseCase {
  constructor(private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(tenantId);
    }
    return tenant;
  }
}
