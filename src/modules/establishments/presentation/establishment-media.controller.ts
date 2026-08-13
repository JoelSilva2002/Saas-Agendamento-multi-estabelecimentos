import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Auth } from '../../auth/presentation/decorators/auth.decorator';
import { ValidationError } from '../../../shared-kernel/domain/domain-error';
import { UploadEstablishmentLogoUseCase } from '../application/use-cases/upload-establishment-logo.use-case';
import { RemoveEstablishmentLogoUseCase } from '../application/use-cases/remove-establishment-logo.use-case';
import { ListEstablishmentPhotosUseCase } from '../application/use-cases/list-establishment-photos.use-case';
import { AddEstablishmentPhotoUseCase } from '../application/use-cases/add-establishment-photo.use-case';
import { DeleteEstablishmentPhotoUseCase } from '../application/use-cases/delete-establishment-photo.use-case';
import { ReorderEstablishmentPhotosUseCase } from '../application/use-cases/reorder-establishment-photos.use-case';
import { ReorderEstablishmentPhotosRequestDto } from './dto/reorder-establishment-photos.request.dto';
import { EstablishmentPhoto } from '../domain/entities/establishment-photo.entity';
import { FileStoragePort } from '../../../shared-kernel/domain/file-storage.port';

// FileInterceptor's options are evaluated once at class-decoration time, so they can't read
// ConfigService — this constant duplicates MEDIA_MAX_UPLOAD_BYTES's default from
// configuration.ts. The Joi-validated config value is still the source of truth elsewhere;
// this only bounds what multer buffers into memory before a use case ever runs.
const MAX_UPLOAD_BYTES = parseInt(process.env.MEDIA_MAX_UPLOAD_BYTES ?? '5242880', 10);

const uploadInterceptor = FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 2, parts: 4 },
});

@Controller('tenants/:tenantId/establishments/:establishmentId/media')
export class EstablishmentMediaController {
  constructor(
    private readonly uploadLogo: UploadEstablishmentLogoUseCase,
    private readonly removeLogo: RemoveEstablishmentLogoUseCase,
    private readonly listPhotos: ListEstablishmentPhotosUseCase,
    private readonly addPhoto: AddEstablishmentPhotoUseCase,
    private readonly deletePhoto: DeleteEstablishmentPhotoUseCase,
    private readonly reorderPhotos: ReorderEstablishmentPhotosUseCase,
    private readonly storage: FileStoragePort,
  ) {}

  @Put('logo')
  @Auth('establishment:update')
  @UseInterceptors(uploadInterceptor)
  async putLogo(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new ValidationError('Envie um arquivo no campo "file"');
    }
    return this.uploadLogo.execute({ tenantId, establishmentId, buffer: file.buffer });
  }

  @Delete('logo')
  @Auth('establishment:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteLogo(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
  ) {
    await this.removeLogo.execute({ tenantId, establishmentId });
  }

  @Get('photos')
  @Auth('establishment:read')
  async getPhotos(@Param('establishmentId') establishmentId: string) {
    const photos = await this.listPhotos.execute(establishmentId);
    return photos.map((photo) => this.toPhotoResponse(photo));
  }

  @Post('photos')
  @Auth('establishment:update')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(uploadInterceptor)
  async postPhoto(
    @Param('tenantId') tenantId: string,
    @Param('establishmentId') establishmentId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) {
      throw new ValidationError('Envie um arquivo no campo "file"');
    }
    const photo = await this.addPhoto.execute({ tenantId, establishmentId, buffer: file.buffer });
    return this.toPhotoResponse(photo);
  }

  @Delete('photos/:photoId')
  @Auth('establishment:update')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deletePhotoById(
    @Param('establishmentId') establishmentId: string,
    @Param('photoId') photoId: string,
  ) {
    await this.deletePhoto.execute(photoId, establishmentId);
  }

  @Put('photos/order')
  @Auth('establishment:update')
  async putPhotoOrder(
    @Param('establishmentId') establishmentId: string,
    @Body() dto: ReorderEstablishmentPhotosRequestDto,
  ) {
    const photos = await this.reorderPhotos.execute(establishmentId, dto.photoIds);
    return photos.map((photo) => this.toPhotoResponse(photo));
  }

  private toPhotoResponse(photo: EstablishmentPhoto) {
    return {
      id: photo.id,
      url: this.storage.publicUrl(photo.storageKey),
      thumbUrl: this.storage.publicUrl(photo.thumbStorageKey),
      width: photo.width,
      height: photo.height,
      caption: photo.caption,
      position: photo.position,
      createdAt: photo.createdAt,
    };
  }
}
