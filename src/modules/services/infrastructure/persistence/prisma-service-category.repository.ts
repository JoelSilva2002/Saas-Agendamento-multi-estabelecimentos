import { Injectable } from '@nestjs/common';
import { PrismaService as PrismaClientService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { ServiceCategory } from '../../domain/entities/service-category.entity';
import { ServiceCategoryRepositoryPort } from '../../domain/service-category.repository.port';

@Injectable()
export class PrismaServiceCategoryRepository implements ServiceCategoryRepositoryPort {
  constructor(private readonly prisma: PrismaClientService) {}

  async create(category: ServiceCategory): Promise<ServiceCategory> {
    const created = await this.prisma.serviceCategory.create({ data: category.toPersistenceProps() });
    return ServiceCategory.fromPersistence(created);
  }

  async findById(id: string, establishmentId: string): Promise<ServiceCategory | null> {
    const found = await this.prisma.serviceCategory.findFirst({ where: { id, establishmentId } });
    return found ? ServiceCategory.fromPersistence(found) : null;
  }

  async findAllByEstablishment(establishmentId: string): Promise<ServiceCategory[]> {
    const records = await this.prisma.serviceCategory.findMany({
      where: { establishmentId },
      orderBy: { displayOrder: 'asc' },
    });
    return records.map((record) => ServiceCategory.fromPersistence(record));
  }

  async update(category: ServiceCategory): Promise<ServiceCategory> {
    const props = category.toPersistenceProps();
    const updated = await this.prisma.serviceCategory.update({
      where: { id: category.id },
      data: { name: props.name, displayOrder: props.displayOrder, updatedAt: props.updatedAt },
    });
    return ServiceCategory.fromPersistence(updated);
  }

  async delete(id: string, establishmentId: string): Promise<void> {
    await this.prisma.serviceCategory.deleteMany({ where: { id, establishmentId } });
  }

  async existsWithName(establishmentId: string, name: string, excludeId?: string): Promise<boolean> {
    const count = await this.prisma.serviceCategory.count({
      where: { establishmentId, name, id: excludeId ? { not: excludeId } : undefined },
    });
    return count > 0;
  }
}
