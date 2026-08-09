import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { ClientProfile } from '../../domain/entities/client-profile.entity';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';

@Injectable()
export class PrismaClientProfileRepository implements ClientProfileRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(profile: ClientProfile): Promise<ClientProfile> {
    const created = await this.prisma.clientProfile.create({ data: profile.toPersistenceProps() });
    return ClientProfile.fromPersistence(created);
  }

  async findByUserAndEstablishment(userId: string, establishmentId: string): Promise<ClientProfile | null> {
    const found = await this.prisma.clientProfile.findUnique({
      where: { establishmentId_userId: { establishmentId, userId } },
    });
    return found ? ClientProfile.fromPersistence(found) : null;
  }
}
