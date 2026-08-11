import { IsIn } from 'class-validator';
import { TenantStatus } from '../../domain/entities/tenant.entity';

const TENANT_STATUSES: TenantStatus[] = ['active', 'suspended', 'cancelled'];

export class UpdateTenantStatusRequestDto {
  @IsIn(TENANT_STATUSES)
  status!: TenantStatus;
}
