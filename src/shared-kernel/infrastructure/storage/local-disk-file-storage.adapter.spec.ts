import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { ConfigService } from '@nestjs/config';
import { LocalDiskFileStorageAdapter } from './local-disk-file-storage.adapter';
import { AppConfig } from '../../../config/configuration';

async function readAll(stream: NodeJS.ReadableStream): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(chunk as Buffer);
  }
  return Buffer.concat(chunks);
}

describe('LocalDiskFileStorageAdapter', () => {
  let root: string;
  let adapter: LocalDiskFileStorageAdapter;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'media-storage-test-'));
    const configService = {
      get: () => ({ storageRoot: root, publicBaseUrl: 'http://localhost:3000' }),
    } as unknown as ConfigService<AppConfig, true>;
    adapter = new LocalDiskFileStorageAdapter(configService);
  });

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true });
  });

  it('writes then reads back the same bytes', async () => {
    const key = await adapter.put({
      keyParts: ['establishments', 'tenant-1', 'est-1', 'logo', 'abc.webp'],
      body: Buffer.from('hello world'),
      contentType: 'image/webp',
    });

    const object = await adapter.read(key);
    expect(object).not.toBeNull();
    expect(await readAll(object!.stream)).toEqual(Buffer.from('hello world'));
    expect(object!.contentType).toBe('image/webp');
  });

  it('delete on a missing key resolves without throwing', async () => {
    await expect(adapter.delete('establishments/does/not/exist.webp')).resolves.toBeUndefined();
  });

  it('read on a missing key returns null', async () => {
    await expect(adapter.read('establishments/does/not/exist.webp')).resolves.toBeNull();
  });

  it('composes an absolute public URL from the configured base', () => {
    expect(adapter.publicUrl('establishments/t/e/logo/abc.webp')).toBe(
      'http://localhost:3000/media/establishments/t/e/logo/abc.webp',
    );
  });

  describe('path traversal', () => {
    it('rejects a key with a ../ segment reaching outside the root', async () => {
      await expect(adapter.read('../../../etc/passwd')).resolves.toBeNull();
    });

    it('rejects a key with an embedded ../ escaping midway', async () => {
      await expect(adapter.read('a/../../b')).resolves.toBeNull();
    });

    it('rejects a Windows-style backslash traversal', async () => {
      await expect(adapter.read('a\\..\\..\\b')).resolves.toBeNull();
    });

    it('rejects an absolute path', async () => {
      await expect(adapter.read('/etc/passwd')).resolves.toBeNull();
    });

    it('rejects a sibling-directory prefix collision (no trailing separator confusion)', async () => {
      const evilRoot = `${root}-evil`;
      await fs.mkdir(evilRoot, { recursive: true });
      try {
        // A naive `startsWith(root)` check would let this key resolve into `${root}-evil`.
        const key = path.relative(root, path.join(evilRoot, 'x.webp'));
        await expect(adapter.read(key)).resolves.toBeNull();
      } finally {
        await fs.rm(evilRoot, { recursive: true, force: true });
      }
    });

    it('put rejects a key segment containing ..', async () => {
      await expect(
        adapter.put({ keyParts: ['..', 'evil.webp'], body: Buffer.from('x'), contentType: 'image/webp' }),
      ).rejects.toThrow();
    });
  });
});
