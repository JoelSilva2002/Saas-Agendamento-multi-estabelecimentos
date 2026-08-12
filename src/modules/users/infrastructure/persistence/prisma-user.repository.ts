import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { User } from '../../domain/entities/user.entity';
import { UserRepositoryPort } from '../../domain/user.repository.port';
import { UserMapper } from './user.mapper';
import { DuplicateEmailError } from '../../domain/errors/user-errors';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaUserRepository implements UserRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: User): Promise<User> {
    try {
      const created = await this.prisma.user.create({ data: UserMapper.toPersistence(user) });
      return UserMapper.toDomain(created);
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION
      ) {
        // Only a non-null email can ever collide — Postgres treats NULLs as distinct in the
        // unique index, so a walk-in (null email) never lands here.
        throw new DuplicateEmailError(user.email!);
      }
      throw error;
    }
  }

  async findById(id: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { id } });
    return found ? UserMapper.toDomain(found) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const found = await this.prisma.user.findUnique({ where: { email } });
    return found ? UserMapper.toDomain(found) : null;
  }

  async update(user: User): Promise<User> {
    const props = UserMapper.toPersistence(user);
    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data: {
        firstName: props.firstName,
        lastName: props.lastName,
        isActive: props.isActive,
        themePreference: props.themePreference,
        updatedAt: props.updatedAt,
      },
    });
    return UserMapper.toDomain(updated);
  }

  async updatePassword(userId: string, passwordHash: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash, updatedAt: new Date() },
    });
  }

  async findAllByTenant(tenantId: string): Promise<User[]> {
    const records = await this.prisma.user.findMany({
      where: { tenantRoles: { some: { tenantId } } },
      orderBy: { firstName: 'asc' },
    });
    return records.map(UserMapper.toDomain);
  }

  async existsInTenant(userId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.userTenantRole.count({ where: { userId, tenantId } });
    return count > 0;
  }
}
