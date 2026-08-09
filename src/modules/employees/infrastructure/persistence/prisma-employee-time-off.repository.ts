import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { EmployeeTimeOff } from '../../domain/entities/employee-time-off.entity';
import { EmployeeTimeOffRepositoryPort } from '../../domain/employee-time-off.repository.port';

@Injectable()
export class PrismaEmployeeTimeOffRepository implements EmployeeTimeOffRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(timeOff: EmployeeTimeOff): Promise<EmployeeTimeOff> {
    const created = await this.prisma.employeeTimeOff.create({
      data: {
        id: timeOff.id,
        employeeId: timeOff.employeeId,
        type: timeOff.type,
        startAt: timeOff.startAt,
        endAt: timeOff.endAt,
        notes: timeOff.notes,
      },
    });
    return EmployeeTimeOff.fromPersistence(created);
  }

  async findAllByEmployee(employeeId: string): Promise<EmployeeTimeOff[]> {
    const records = await this.prisma.employeeTimeOff.findMany({
      where: { employeeId },
      orderBy: { startAt: 'asc' },
    });
    return records.map((record) => EmployeeTimeOff.fromPersistence(record));
  }

  async findById(id: string, employeeId: string): Promise<EmployeeTimeOff | null> {
    const found = await this.prisma.employeeTimeOff.findFirst({ where: { id, employeeId } });
    return found ? EmployeeTimeOff.fromPersistence(found) : null;
  }

  async delete(id: string, employeeId: string): Promise<void> {
    await this.prisma.employeeTimeOff.deleteMany({ where: { id, employeeId } });
  }
}
