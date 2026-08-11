import { Injectable } from '@nestjs/common';
import { FindPaginatedTenantsParams, PaginatedTenants, TenantRepositoryPort } from '../../domain/tenant.repository.port';

@Injectable()
export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(params: FindPaginatedTenantsParams): Promise<PaginatedTenants> {
    return this.tenantRepository.findPaginated(params);
  }
}
