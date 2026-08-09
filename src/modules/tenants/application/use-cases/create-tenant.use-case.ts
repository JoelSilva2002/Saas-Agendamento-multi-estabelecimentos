import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { DuplicateTenantSlugError } from '../../domain/errors/tenant-errors';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { RoleNotFoundError } from '../../../rbac/domain/errors/rbac-errors';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';

const OWNER_ROLE_NAME = 'owner';

export interface CreateTenantInput {
  name: string;
  slug: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  ownerPassword: string;
}

export interface CreateTenantOutput {
  tenant: Tenant;
  ownerUserId: string;
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepository: TenantRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
  ) {}

  async execute(input: CreateTenantInput): Promise<CreateTenantOutput> {
    const slugTaken = await this.tenantRepository.existsWithSlug(input.slug);
    if (slugTaken) {
      throw new DuplicateTenantSlugError(input.slug);
    }

    const ownerRole = await this.roleRepository.findByName(OWNER_ROLE_NAME);
    if (!ownerRole) {
      throw new RoleNotFoundError(OWNER_ROLE_NAME);
    }

    const tenant = Tenant.create({ id: randomUUID(), name: input.name, slug: input.slug });
    const ownerPasswordHash = await this.passwordHasher.hash(input.ownerPassword);

    return this.tenantRepository.createWithOwner({
      tenantId: tenant.id,
      tenantName: tenant.name,
      tenantSlug: tenant.slug,
      ownerUserId: randomUUID(),
      ownerEmail: input.ownerEmail,
      ownerFirstName: input.ownerFirstName,
      ownerLastName: input.ownerLastName,
      ownerPasswordHash,
      ownerRoleId: ownerRole.id,
    });
  }
}
