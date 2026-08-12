import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { ClientProfile, ClientProfileProps } from '../../domain/entities/client-profile.entity';
import { ClientProfileRepositoryPort } from '../../domain/client-profile.repository.port';

/** Shape of a row from the raw SQL in findByPhone — $queryRaw bypasses Prisma's usual
 * camelCase mapping, so the snake_case column names come back as-is. */
interface PrismaClientProfileRow {
  id: string;
  establishment_id: string;
  user_id: string;
  phone: string | null;
  birth_date: Date | null;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

function fromRow(row: PrismaClientProfileRow): ClientProfileProps {
  return {
    id: row.id,
    establishmentId: row.establishment_id,
    userId: row.user_id,
    phone: row.phone,
    birthDate: row.birth_date,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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

  async findByPhone(establishmentId: string, phone: string): Promise<ClientProfile | null> {
    const digits = phone.replace(/\D/g, '');
    if (!digits) {
      return null;
    }
    // Prisma's query builder can't express "strip non-digits before comparing" — phone is
    // stored however the caller typed it (e.g. "(11) 99999-0000"), so the match has to
    // normalize both sides. Same raw-SQL precedent as the advisory lock in
    // PrismaAppointmentRepository: reach for it only where the query builder genuinely can't.
    const rows = await this.prisma.$queryRaw<PrismaClientProfileRow[]>`
      SELECT * FROM client_profiles
      WHERE establishment_id = ${establishmentId}
        AND regexp_replace(phone, '\D', '', 'g') = ${digits}
      LIMIT 1
    `;
    return rows[0] ? ClientProfile.fromPersistence(fromRow(rows[0])) : null;
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
