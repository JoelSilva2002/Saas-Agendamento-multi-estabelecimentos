import { ValidationError } from './domain-error';
import { ImageProfile } from './image-profiles';
import { SniffedImageFormat } from './image-signature';

export class UnsupportedImageError extends ValidationError {
  constructor(format?: string) {
    super(
      format
        ? `Formato de imagem não suportado: ${format}`
        : 'Não foi possível reconhecer o arquivo como uma imagem',
    );
  }
}

export interface ProcessedImage {
  full: { buffer: Buffer; width: number; height: number; contentType: 'image/webp' };
  thumb: { buffer: Buffer; contentType: 'image/webp' };
}

export abstract class ImageProcessorPort {
  /** Resizes/converts the input per `profile`, always outputting WebP. Throws
   * UnsupportedImageError when the bytes aren't a decodable raster image in the allowlist.
   * When `expectedFormat` is given (the caller's own magic-byte sniff), also throws if the
   * decoder's format disagrees — defeats a polyglot file whose header claims one format but
   * decodes as another. */
  abstract process(
    input: Buffer,
    profile: ImageProfile,
    expectedFormat?: SniffedImageFormat,
  ): Promise<ProcessedImage>;
}
