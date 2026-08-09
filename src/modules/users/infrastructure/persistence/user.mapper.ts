import { User as PrismaUser } from '@prisma/client';
import { User } from '../../domain/entities/user.entity';

export class UserMapper {
  static toDomain(record: PrismaUser): User {
    return User.fromPersistence({
      id: record.id,
      email: record.email,
      passwordHash: record.passwordHash,
      firstName: record.firstName,
      lastName: record.lastName,
      isActive: record.isActive,
      isPlatformAdmin: record.isPlatformAdmin,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  static toPersistence(user: User) {
    return user.toPersistenceProps();
  }
}
