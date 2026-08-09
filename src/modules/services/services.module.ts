import { Module } from '@nestjs/common';
import { EmployeesModule } from '../employees/employees.module';
import { ServiceRepositoryPort } from './domain/service.repository.port';
import { ServiceCategoryRepositoryPort } from './domain/service-category.repository.port';
import { PrismaServiceRepository } from './infrastructure/persistence/prisma-service.repository';
import { PrismaServiceCategoryRepository } from './infrastructure/persistence/prisma-service-category.repository';
import { CreateServiceCategoryUseCase } from './application/use-cases/create-service-category.use-case';
import { ListServiceCategoriesUseCase } from './application/use-cases/list-service-categories.use-case';
import { UpdateServiceCategoryUseCase } from './application/use-cases/update-service-category.use-case';
import { DeleteServiceCategoryUseCase } from './application/use-cases/delete-service-category.use-case';
import { CreateServiceUseCase } from './application/use-cases/create-service.use-case';
import { GetServiceUseCase } from './application/use-cases/get-service.use-case';
import { ListServicesUseCase } from './application/use-cases/list-services.use-case';
import { UpdateServiceUseCase } from './application/use-cases/update-service.use-case';
import { DeactivateServiceUseCase } from './application/use-cases/deactivate-service.use-case';
import { SetServiceEmployeesUseCase } from './application/use-cases/set-service-employees.use-case';
import { ServicesController } from './presentation/services.controller';
import { ServiceCategoriesController } from './presentation/service-categories.controller';

@Module({
  imports: [EmployeesModule],
  controllers: [ServicesController, ServiceCategoriesController],
  providers: [
    { provide: ServiceRepositoryPort, useClass: PrismaServiceRepository },
    { provide: ServiceCategoryRepositoryPort, useClass: PrismaServiceCategoryRepository },
    CreateServiceCategoryUseCase,
    ListServiceCategoriesUseCase,
    UpdateServiceCategoryUseCase,
    DeleteServiceCategoryUseCase,
    CreateServiceUseCase,
    GetServiceUseCase,
    ListServicesUseCase,
    UpdateServiceUseCase,
    DeactivateServiceUseCase,
    SetServiceEmployeesUseCase,
  ],
})
export class ServicesModule {}
