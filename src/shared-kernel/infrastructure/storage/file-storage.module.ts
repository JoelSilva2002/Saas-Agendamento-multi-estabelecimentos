import { Global, Module } from '@nestjs/common';
import { FileStoragePort } from '../../domain/file-storage.port';
import { ImageProcessorPort } from '../../domain/image-processor.port';
import { LocalDiskFileStorageAdapter } from './local-disk-file-storage.adapter';
import { SharpImageProcessor } from '../imaging/sharp-image-processor';
import { MediaController } from './media.controller';

// @Global(): FileStoragePort is consumed by PublicController (module public) and by the
// establishments module's media controller/use-cases — making this global avoids every
// consumer having to import a storage module just to resolve a byte sink.
@Global()
@Module({
  controllers: [MediaController],
  providers: [
    { provide: FileStoragePort, useClass: LocalDiskFileStorageAdapter },
    { provide: ImageProcessorPort, useClass: SharpImageProcessor },
  ],
  exports: [FileStoragePort, ImageProcessorPort],
})
export class FileStorageModule {}
