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

  async findByUserAndEstablishment(
    userId: string,
    establishmentId: string,
  ): Promise<ClientProfile | null> {
    const found = await this.prisma.clientProfile.findUnique({
      where: { establishmentId_userId: { establishmentId, userId } },
    });
    return found ? ClientProfile.fromPersistence(found) : null;
  }

  async countCreatedBetween(establishmentId: string, from: Date, to: Date): Promise<number> {
    return this.prisma.clientProfile.count({
      where: { establishmentId, createdAt: { gte: from, lt: to } },
    });
  }

  async findById(id: string, establishmentId: string): Promise<ClientProfile | null> {
    const found = await this.prisma.clientProfile.findFirst({ where: { id, establishmentId } });
    return found ? ClientProfile.fromPersistence(found) : null;
  }

  async findMany(establishmentId: string): Promise<ClientProfile[]> {
    const records = await this.prisma.clientProfile.findMany({
      where: { establishmentId },
      orderBy: { createdAt: 'desc' },
    });
    return records.map(ClientProfile.fromPersistence);
  }

  async update(profile: ClientProfile): Promise<ClientProfile> {
    const props = profile.toPersistenceProps();
    const updated = await this.prisma.clientProfile.update({
      where: { id: props.id },
      data: { phone: props.phone, birthDate: props.birthDate, notes: props.notes },
    });
    return ClientProfile.fromPersistence(updated);
  }
}
