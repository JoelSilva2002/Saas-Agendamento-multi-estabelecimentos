import { Global, Module } from '@nestjs/common';
import { EstablishmentRepositoryPort } from './domain/establishment.repository.port';
import { BusinessHoursRepositoryPort } from './domain/business-hours.repository.port';
import { PrismaEstablishmentRepository } from './infrastructure/persistence/prisma-establishment.repository';
import { PrismaBusinessHoursRepository } from './infrastructure/persistence/prisma-business-hours.repository';
import { CreateEstablishmentUseCase } from './application/use-cases/create-establishment.use-case';
import { GetEstablishmentUseCase } from './application/use-cases/get-establishment.use-case';
import { ListEstablishmentsUseCase } from './application/use-cases/list-establishments.use-case';
import { UpdateEstablishmentUseCase } from './application/use-cases/update-establishment.use-case';
import { DeleteEstablishmentUseCase } from './application/use-cases/delete-establishment.use-case';
import { SetBusinessHoursUseCase } from './application/use-cases/set-business-hours.use-case';
import { GetBusinessHoursUseCase } from './application/use-cases/get-business-hours.use-case';
import { EstablishmentsController } from './presentation/establishments.controller';

// @Global(): TenantScopeGuard (in AuthModule, also global) depends on EstablishmentRepositoryPort
// and is consumed via @UseGuards() from controllers in other modules that don't import
// EstablishmentsModule directly — making this global keeps that resolvable everywhere
// without every consuming module having to import it.
@Global()
@Module({
  controllers: [EstablishmentsController],
  providers: [
    { provide: EstablishmentRepositoryPort, useClass: PrismaEstablishmentRepository },
    { provide: BusinessHoursRepositoryPort, useClass: PrismaBusinessHoursRepository },
    CreateEstablishmentUseCase,
    GetEstablishmentUseCase,
    ListEstablishmentsUseCase,
    UpdateEstablishmentUseCase,
    DeleteEstablishmentUseCase,
    SetBusinessHoursUseCase,
    GetBusinessHoursUseCase,
  ],
  exports: [EstablishmentRepositoryPort],
})
export class EstablishmentsModule {}
