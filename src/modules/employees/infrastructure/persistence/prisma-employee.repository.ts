import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../../shared-kernel/infrastructure/prisma.service';
import { Employee } from '../../domain/entities/employee.entity';
import { EmployeeRepositoryPort } from '../../domain/employee.repository.port';
import { DuplicateEmployeeProfileError } from '../../domain/errors/employee-errors';

const PRISMA_UNIQUE_CONSTRAINT_VIOLATION = 'P2002';

@Injectable()
export class PrismaEmployeeRepository implements EmployeeRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(employee: Employee): Promise<Employee> {
    try {
      const created = await this.prisma.employee.create({ data: employee.toPersistenceProps() });
      return Employee.fromPersistence(created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === PRISMA_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new DuplicateEmployeeProfileError();
      }
      throw error;
    }
  }

  async findById(id: string, establishmentId: string): Promise<Employee | null> {
    const found = await this.prisma.employee.findFirst({ where: { id, establishmentId } });
    return found ? Employee.fromPersistence(found) : null;
  }

  async findByUserAndEstablishment(userId: string, establishmentId: string): Promise<Employee | null> {
    const found = await this.prisma.employee.findUnique({
      where: { establishmentId_userId: { establishmentId, userId } },
    });
    return found ? Employee.fromPersistence(found) : null;
  }

  async findAllByEstablishment(establishmentId: string): Promise<Employee[]> {
    const records = await this.prisma.employee.findMany({
      where: { establishmentId },
      orderBy: { jobTitle: 'asc' },
    });
    return records.map((record) => Employee.fromPersistence(record));
  }

  async update(employee: Employee): Promise<Employee> {
    const props = employee.toPersistenceProps();
    const updated = await this.prisma.employee.update({
      where: { id: employee.id },
      data: { jobTitle: props.jobTitle, hiredAt: props.hiredAt, status: props.status, updatedAt: props.updatedAt },
    });
    return Employee.fromPersistence(updated);
  }

  async existsInEstablishment(id: string, establishmentId: string): Promise<boolean> {
    const count = await this.prisma.employee.count({ where: { id, establishmentId } });
    return count > 0;
  }
}
