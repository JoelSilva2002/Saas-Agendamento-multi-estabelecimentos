export type SniffedImageFormat = 'jpeg' | 'png' | 'webp' | 'avif';

/** Detects the real image format from its magic bytes, ignoring any client-supplied
 * Content-Type (which is attacker-controlled). Returns null for anything that isn't a
 * recognized raster image — the caller must reject before handing the bytes to a decoder. */
export function sniffImageFormat(buffer: Buffer): SniffedImageFormat | null {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  if (
    buffer
      .subarray(0, 8)
      .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  ) {
    return 'png';
  }

  if (
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  if (
    buffer.subarray(4, 8).toString('ascii') === 'ftyp' &&
    ['avif', 'avis'].includes(buffer.subarray(8, 12).toString('ascii'))
  ) {
    return 'avif';
  }

  return null;
}
