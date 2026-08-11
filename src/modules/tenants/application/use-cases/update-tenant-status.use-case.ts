import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { Tenant, TenantStatus } from '../../domain/entities/tenant.entity';
import { TenantNotFoundError } from '../../domain/errors/tenant-errors';

export interface UpdateTenantStatusInput {
  tenantId: string;
  status: TenantStatus;
}

@Injectable()
export class UpdateTenantStatusUseCase {
  constructor(private readonly tenantRepository: TenantRepositoryPort) {}

  async execute(input: UpdateTenantStatusInput): Promise<Tenant> {
    const tenant = await this.tenantRepository.findById(input.tenantId);
    if (!tenant) {
      throw new TenantNotFoundError(input.tenantId);
    }

    const updated = tenant.changeStatus(input.status);
    return this.tenantRepository.update(updated);
  }
}
