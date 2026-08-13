import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { EmployeeRepositoryPort } from './domain/employee.repository.port';
import { EmployeeScheduleRepositoryPort } from './domain/employee-schedule.repository.port';
import { EmployeeTimeOffRepositoryPort } from './domain/employee-time-off.repository.port';
import { PrismaEmployeeRepository } from './infrastructure/persistence/prisma-employee.repository';
import { PrismaEmployeeScheduleRepository } from './infrastructure/persistence/prisma-employee-schedule.repository';
import { PrismaEmployeeTimeOffRepository } from './infrastructure/persistence/prisma-employee-time-off.repository';
import { CreateEmployeeUseCase } from './application/use-cases/create-employee.use-case';
import { GetEmployeeUseCase } from './application/use-cases/get-employee.use-case';
import { ListEmployeesUseCase } from './application/use-cases/list-employees.use-case';
import { UpdateEmployeeUseCase } from './application/use-cases/update-employee.use-case';
import { DeactivateEmployeeUseCase } from './application/use-cases/deactivate-employee.use-case';
import { SetEmployeeScheduleUseCase } from './application/use-cases/set-employee-schedule.use-case';
import { GetEmployeeScheduleUseCase } from './application/use-cases/get-employee-schedule.use-case';
import { AddEmployeeTimeOffUseCase } from './application/use-cases/add-employee-time-off.use-case';
import { ListEmployeeTimeOffUseCase } from './application/use-cases/list-employee-time-off.use-case';
import { RemoveEmployeeTimeOffUseCase } from './application/use-cases/remove-employee-time-off.use-case';
import { EmployeesController } from './presentation/employees.controller';

@Module({
  imports: [UsersModule],
  controllers: [EmployeesController],
  providers: [
    { provide: EmployeeRepositoryPort, useClass: PrismaEmployeeRepository },
    { provide: EmployeeScheduleRepositoryPort, useClass: PrismaEmployeeScheduleRepository },
    { provide: EmployeeTimeOffRepositoryPort, useClass: PrismaEmployeeTimeOffRepository },
    CreateEmployeeUseCase,
    GetEmployeeUseCase,
    ListEmployeesUseCase,
    UpdateEmployeeUseCase,
    DeactivateEmployeeUseCase,
    SetEmployeeScheduleUseCase,
    GetEmployeeScheduleUseCase,
    AddEmployeeTimeOffUseCase,
    ListEmployeeTimeOffUseCase,
    RemoveEmployeeTimeOffUseCase,
  ],
  // ListEmployeesUseCase is re-exported for Fase 24's IntegrationsModule.
  exports: [
    EmployeeRepositoryPort,
    EmployeeScheduleRepositoryPort,
    EmployeeTimeOffRepositoryPort,
    ListEmployeesUseCase,
  ],
})
export class EmployeesModule {}
