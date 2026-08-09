import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';

@Injectable()
export class ListTenantsUseCase {
  constructor(private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(): Promise<Tenant[]> {
    return this.tenantRepository.findAll();
  }
}
