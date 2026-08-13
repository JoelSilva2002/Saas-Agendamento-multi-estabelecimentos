import { sniffImageFormat } from './image-signature';

function padded(buffer: Buffer, minLength = 12): Buffer {
  return buffer.length >= minLength
    ? buffer
    : Buffer.concat([buffer, Buffer.alloc(minLength - buffer.length)]);
}

describe('sniffImageFormat', () => {
  it('recognizes a JPEG by its magic bytes', () => {
    const buffer = padded(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]));
    expect(sniffImageFormat(buffer)).toBe('jpeg');
  });

  it('recognizes a PNG by its magic bytes', () => {
    const buffer = padded(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(sniffImageFormat(buffer)).toBe('png');
  });

  it('recognizes a WebP by its RIFF/WEBP markers', () => {
    const buffer = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x00, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(sniffImageFormat(buffer)).toBe('webp');
  });

  it('recognizes an AVIF by its ftyp/avif markers', () => {
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x1c]),
      Buffer.from('ftyp', 'ascii'),
      Buffer.from('avif', 'ascii'),
    ]);
    expect(sniffImageFormat(buffer)).toBe('avif');
  });

  it('recognizes an AVIF sequence (avis) by its ftyp marker', () => {
    const buffer = Buffer.concat([
      Buffer.from([0x00, 0x00, 0x00, 0x1c]),
      Buffer.from('ftyp', 'ascii'),
      Buffer.from('avis', 'ascii'),
    ]);
    expect(sniffImageFormat(buffer)).toBe('avif');
  });

  it('returns null for an HTML document disguised as an image', () => {
    const buffer = padded(Buffer.from('<html><body>hi</body></html>', 'ascii'));
    expect(sniffImageFormat(buffer)).toBeNull();
  });

  it('returns null for a zip file', () => {
    const buffer = padded(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(sniffImageFormat(buffer)).toBeNull();
  });

  it('returns null for a truncated buffer', () => {
    expect(sniffImageFormat(Buffer.from([0xff, 0xd8, 0xff]))).toBeNull();
  });

  it('returns null for an empty buffer', () => {
    expect(sniffImageFormat(Buffer.alloc(0))).toBeNull();
  });
});
