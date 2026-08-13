import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { EstablishmentPhoto } from '../../domain/entities/establishment-photo.entity';
import {
  CreateEstablishmentPhotoParams,
  EstablishmentPhotoRepositoryPort,
} from '../../domain/establishment-photo.repository.port';

@Injectable()
export class PrismaEstablishmentPhotoRepository implements EstablishmentPhotoRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(params: CreateEstablishmentPhotoParams): Promise<EstablishmentPhoto> {
    const created = await this.prisma.establishmentPhoto.create({ data: params });
    return EstablishmentPhoto.fromPersistence(created);
  }

  async findAllByEstablishment(establishmentId: string): Promise<EstablishmentPhoto[]> {
    const rows = await this.prisma.establishmentPhoto.findMany({
      where: { establishmentId },
      orderBy: [{ position: 'asc' }, { createdAt: 'asc' }],
    });
    return rows.map(EstablishmentPhoto.fromPersistence);
  }

  async findByIdInEstablishment(id: string, establishmentId: string): Promise<EstablishmentPhoto | null> {
    const found = await this.prisma.establishmentPhoto.findFirst({ where: { id, establishmentId } });
    return found ? EstablishmentPhoto.fromPersistence(found) : null;
  }

  async countByEstablishment(establishmentId: string): Promise<number> {
    return this.prisma.establishmentPhoto.count({ where: { establishmentId } });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.establishmentPhoto.delete({ where: { id } });
  }

  async reorder(establishmentId: string, orderedIds: string[]): Promise<EstablishmentPhoto[]> {
    await this.prisma.$transaction(
      orderedIds.map((id, index) =>
        this.prisma.establishmentPhoto.update({
          where: { id },
          data: { position: index },
        }),
      ),
    );
    return this.findAllByEstablishment(establishmentId);
  }
}
