import sharp from 'sharp';
import { SharpImageProcessor } from './sharp-image-processor';
import { UnsupportedImageError } from '../../domain/image-processor.port';
import { LOGO_PROFILE } from '../../domain/image-profiles';

async function makePng(width: number, height: number): Promise<Buffer> {
  return sharp({ create: { width, height, channels: 3, background: { r: 51, g: 102, b: 153 } } })
    .png()
    .toBuffer();
}

describe('SharpImageProcessor', () => {
  const processor = new SharpImageProcessor();

  it('outputs WebP for both full and thumb', async () => {
    const input = await makePng(800, 600);
    const result = await processor.process(input, LOGO_PROFILE);

    expect(result.full.contentType).toBe('image/webp');
    expect(result.thumb.contentType).toBe('image/webp');

    const fullMeta = await sharp(result.full.buffer).metadata();
    const thumbMeta = await sharp(result.thumb.buffer).metadata();
    expect(fullMeta.format).toBe('webp');
    expect(thumbMeta.format).toBe('webp');
  });

  it('clamps dimensions to the profile maximums', async () => {
    const input = await makePng(2000, 1000);
    const result = await processor.process(input, LOGO_PROFILE);

    expect(result.full.width).toBeLessThanOrEqual(LOGO_PROFILE.maxWidth);
    expect(result.full.height).toBeLessThanOrEqual(LOGO_PROFILE.maxHeight);
  });

  it('does not upscale an input smaller than the profile maximums', async () => {
    const input = await makePng(50, 40);
    const result = await processor.process(input, LOGO_PROFILE);

    expect(result.full.width).toBe(50);
    expect(result.full.height).toBe(40);
  });

  it('throws UnsupportedImageError for a non-image buffer', async () => {
    await expect(processor.process(Buffer.from('not an image'), LOGO_PROFILE)).rejects.toThrow(
      UnsupportedImageError,
    );
  });

  it('throws UnsupportedImageError when the decoded format disagrees with expectedFormat', async () => {
    const input = await makePng(100, 100);
    // The file really is a PNG, but the caller sniffed it (incorrectly, or from a spoofed
    // header) as JPEG — the polyglot defense must reject this mismatch.
    await expect(processor.process(input, LOGO_PROFILE, 'jpeg')).rejects.toThrow(UnsupportedImageError);
  });

  it('accepts the input when expectedFormat matches the decoded format', async () => {
    const input = await makePng(100, 100);
    await expect(processor.process(input, LOGO_PROFILE, 'png')).resolves.toBeDefined();
  });
});
