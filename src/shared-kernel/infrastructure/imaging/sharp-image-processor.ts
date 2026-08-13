import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import { ImageProcessorPort, ProcessedImage, UnsupportedImageError } from '../../domain/image-processor.port';
import { ImageProfile } from '../../domain/image-profiles';
import { SniffedImageFormat } from '../../domain/image-signature';

const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp', 'avif']);
// Guards against decompression bombs: a tiny compressed file that decodes to an enormous
// bitmap (e.g. a 100 KB PNG expanding to 20000x20000).
const MAX_INPUT_PIXELS = 50_000_000;

@Injectable()
export class SharpImageProcessor implements ImageProcessorPort {
  async process(
    input: Buffer,
    profile: ImageProfile,
    expectedFormat?: SniffedImageFormat,
  ): Promise<ProcessedImage> {
    // .rotate() with no args applies EXIF orientation, and sharp strips metadata on output by
    // default — GPS coordinates in phone photos are removed for free. Don't add keepMetadata().
    const pipeline = sharp(input, { failOn: 'error', limitInputPixels: MAX_INPUT_PIXELS }).rotate();

    let metadata;
    try {
      metadata = await pipeline.metadata();
    } catch {
      throw new UnsupportedImageError();
    }

    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) {
      throw new UnsupportedImageError(metadata.format);
    }
    // Defeats a polyglot file: header magic bytes claim `expectedFormat`, but the decoder
    // disagrees about what it actually is.
    if (expectedFormat && metadata.format !== expectedFormat) {
      throw new UnsupportedImageError(metadata.format);
    }

    const fullResult = await pipeline
      .clone()
      .resize({
        width: profile.maxWidth,
        height: profile.maxHeight,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality: profile.quality })
      .toBuffer({ resolveWithObject: true });

    const thumbBuffer = await pipeline
      .clone()
      .resize({
        width: profile.thumbWidth,
        height: profile.thumbHeight,
        fit: profile.thumbFit,
        withoutEnlargement: profile.thumbFit === 'inside',
      })
      .webp({ quality: profile.quality })
      .toBuffer();

    return {
      full: {
        buffer: fullResult.data,
        width: fullResult.info.width,
        height: fullResult.info.height,
        contentType: 'image/webp',
      },
      thumb: { buffer: thumbBuffer, contentType: 'image/webp' },
    };
  }
}
