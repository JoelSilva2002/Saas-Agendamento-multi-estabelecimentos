import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { TenantStatus } from '../../domain/entities/tenant.entity';

const TENANT_STATUSES: TenantStatus[] = ['active', 'suspended', 'cancelled'];

export class ListTenantsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsIn(TENANT_STATUSES)
  status?: TenantStatus;
}
