import { Injectable } from '@nestjs/common';
import { PrismaService as PrismaClientService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Service } from '../../domain/entities/service.entity';
import { ListServicesFilters, ServiceRepositoryPort } from '../../domain/service.repository.port';

@Injectable()
export class PrismaServiceRepository implements ServiceRepositoryPort {
  constructor(private readonly prisma: PrismaClientService) {}

  async create(service: Service): Promise<Service> {
    const created = await this.prisma.service.create({ data: service.toPersistenceProps() });
    return Service.fromPersistence(created);
  }

  async findById(id: string, establishmentId: string): Promise<Service | null> {
    const found = await this.prisma.service.findFirst({ where: { id, establishmentId } });
    return found ? Service.fromPersistence(found) : null;
  }

  async findAllByEstablishment(establishmentId: string, filters?: ListServicesFilters): Promise<Service[]> {
    const records = await this.prisma.service.findMany({
      where: { establishmentId, categoryId: filters?.categoryId, status: filters?.status },
      orderBy: { name: 'asc' },
    });
    return records.map((record) => Service.fromPersistence(record));
  }

  async update(service: Service): Promise<Service> {
    const props = service.toPersistenceProps();
    const updated = await this.prisma.service.update({
      where: { id: service.id },
      data: {
        categoryId: props.categoryId,
        name: props.name,
        description: props.description,
        priceCents: props.priceCents,
        durationMinutes: props.durationMinutes,
        bufferBeforeMinutes: props.bufferBeforeMinutes,
        bufferAfterMinutes: props.bufferAfterMinutes,
        status: props.status,
        updatedAt: props.updatedAt,
      },
    });
    return Service.fromPersistence(updated);
  }

  async replaceEligibleEmployees(serviceId: string, employeeIds: string[]): Promise<void> {
    await this.prisma.$transaction([
      this.prisma.serviceEmployee.deleteMany({ where: { serviceId } }),
      this.prisma.serviceEmployee.createMany({
        data: employeeIds.map((employeeId) => ({ serviceId, employeeId })),
      }),
    ]);
  }

  async findEligibleEmployeeIds(serviceId: string): Promise<string[]> {
    const rows = await this.prisma.serviceEmployee.findMany({ where: { serviceId }, select: { employeeId: true } });
    return rows.map((row) => row.employeeId);
  }
}
