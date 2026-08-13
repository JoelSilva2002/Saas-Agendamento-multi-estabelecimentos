import { Global, Module } from '@nestjs/common';
import { EstablishmentRepositoryPort } from './domain/establishment.repository.port';
import { BusinessHoursRepositoryPort } from './domain/business-hours.repository.port';
import { EstablishmentPhotoRepositoryPort } from './domain/establishment-photo.repository.port';
import { PrismaEstablishmentRepository } from './infrastructure/persistence/prisma-establishment.repository';
import { PrismaBusinessHoursRepository } from './infrastructure/persistence/prisma-business-hours.repository';
import { PrismaEstablishmentPhotoRepository } from './infrastructure/persistence/prisma-establishment-photo.repository';
import { CreateEstablishmentUseCase } from './application/use-cases/create-establishment.use-case';
import { GetEstablishmentUseCase } from './application/use-cases/get-establishment.use-case';
import { ListEstablishmentsUseCase } from './application/use-cases/list-establishments.use-case';
import { UpdateEstablishmentUseCase } from './application/use-cases/update-establishment.use-case';
import { DeleteEstablishmentUseCase } from './application/use-cases/delete-establishment.use-case';
import { SetBusinessHoursUseCase } from './application/use-cases/set-business-hours.use-case';
import { GetBusinessHoursUseCase } from './application/use-cases/get-business-hours.use-case';
import { UploadEstablishmentLogoUseCase } from './application/use-cases/upload-establishment-logo.use-case';
import { RemoveEstablishmentLogoUseCase } from './application/use-cases/remove-establishment-logo.use-case';
import { AddEstablishmentPhotoUseCase } from './application/use-cases/add-establishment-photo.use-case';
import { DeleteEstablishmentPhotoUseCase } from './application/use-cases/delete-establishment-photo.use-case';
import { ReorderEstablishmentPhotosUseCase } from './application/use-cases/reorder-establishment-photos.use-case';
import { ListEstablishmentPhotosUseCase } from './application/use-cases/list-establishment-photos.use-case';
import { EstablishmentsController } from './presentation/establishments.controller';
import { EstablishmentMediaController } from './presentation/establishment-media.controller';

// @Global(): TenantScopeGuard (in AuthModule, also global) depends on EstablishmentRepositoryPort
// and is consumed via @UseGuards() from controllers in other modules that don't import
// EstablishmentsModule directly — making this global keeps that resolvable everywhere
// without every consuming module having to import it.
@Global()
@Module({
  controllers: [EstablishmentsController, EstablishmentMediaController],
  providers: [
    { provide: EstablishmentRepositoryPort, useClass: PrismaEstablishmentRepository },
    { provide: BusinessHoursRepositoryPort, useClass: PrismaBusinessHoursRepository },
    { provide: EstablishmentPhotoRepositoryPort, useClass: PrismaEstablishmentPhotoRepository },
    CreateEstablishmentUseCase,
    GetEstablishmentUseCase,
    ListEstablishmentsUseCase,
    UpdateEstablishmentUseCase,
    DeleteEstablishmentUseCase,
    SetBusinessHoursUseCase,
    GetBusinessHoursUseCase,
    UploadEstablishmentLogoUseCase,
    RemoveEstablishmentLogoUseCase,
    AddEstablishmentPhotoUseCase,
    DeleteEstablishmentPhotoUseCase,
    ReorderEstablishmentPhotosUseCase,
    ListEstablishmentPhotosUseCase,
  ],
  exports: [EstablishmentRepositoryPort, BusinessHoursRepositoryPort, EstablishmentPhotoRepositoryPort],
})
export class EstablishmentsModule {}
