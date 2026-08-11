import { randomBytes, randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { TenantRepositoryPort } from '../../domain/tenant.repository.port';
import { Tenant } from '../../domain/entities/tenant.entity';
import { DuplicateTenantSlugError } from '../../domain/errors/tenant-errors';
import { RoleRepositoryPort } from '../../../rbac/domain/role.repository.port';
import { RoleNotFoundError } from '../../../rbac/domain/errors/rbac-errors';
import { PasswordHasherPort } from '../../../auth/application/ports/password-hasher.port';
import { EstablishmentRepositoryPort } from '../../../establishments/domain/establishment.repository.port';
import { Establishment } from '../../../establishments/domain/entities/establishment.entity';

const OWNER_ROLE_NAME = 'owner';
const TEMPORARY_PASSWORD_BYTES = 9;

export interface CreateTenantInput {
  name: string;
  slug: string;
  document?: string;
  plan?: string;
  ownerEmail: string;
  ownerFirstName: string;
  ownerLastName: string;
  /** If omitted, a random temporary password is generated and returned once in the output —
   * the SuperAdmin onboarding flow never asks the platform admin to choose the client's
   * password. */
  ownerPassword?: string;
  establishmentName: string;
  establishmentSlug: string;
}

export interface CreateTenantOutput {
  tenant: Tenant;
  ownerUserId: string;
  establishment: Establishment;
  /** Only present when input.ownerPassword was omitted — shown once, never persisted. */
  temporaryPassword?: string;
}

@Injectable()
export class CreateTenantUseCase {
  constructor(
    private readonly tenantRepository: TenantRepositoryPort,
    private readonly roleRepository: RoleRepositoryPort,
    private readonly passwordHasher: PasswordHasherPort,
    private readonly establishmentRepository: EstablishmentRepositoryPort,
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

    const tenant = Tenant.create({
      id: randomUUID(),
      name: input.name,
      slug: input.slug,
      document: input.document,
      plan: input.plan,
    });

    const temporaryPassword = input.ownerPassword ? undefined : this.generateTemporaryPassword();
    const ownerPasswordHash = await this.passwordHasher.hash(input.ownerPassword ?? temporaryPassword!);

    const { tenant: createdTenant, ownerUserId } = await this.tenantRepository.createWithOwner({
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

    const establishment = await this.establishmentRepository.create(
      Establishment.create({
        id: randomUUID(),
        tenantId: createdTenant.id,
        name: input.establishmentName,
        slug: input.establishmentSlug,
      }),
    );

    return { tenant: createdTenant, ownerUserId, establishment, temporaryPassword };
  }

  private generateTemporaryPassword(): string {
    return randomBytes(TEMPORARY_PASSWORD_BYTES).toString('base64url');
  }
}
