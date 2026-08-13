import { randomUUID } from 'crypto';
import * as fs from 'fs/promises';
import { createReadStream } from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../../config/configuration';
import { FileStoragePort, PutObjectParams, StorageKey, StoredObject } from '../../domain/file-storage.port';

const SEGMENT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;

/** Zero-config default adapter: writes/reads under a local directory. Keys are relative POSIX
 * paths (always '/'-joined, regardless of host OS) so they round-trip identically whichever
 * adapter is behind the port. */
@Injectable()
export class LocalDiskFileStorageAdapter implements FileStoragePort {
  private readonly root: string;
  private readonly publicBaseUrl: string;

  constructor(configService: ConfigService<AppConfig, true>) {
    const media = configService.get('media', { infer: true });
    this.root = path.resolve(media.storageRoot);
    this.publicBaseUrl = media.publicBaseUrl.replace(/\/+$/, '');
  }

  async put({ keyParts, body, contentType }: PutObjectParams): Promise<StorageKey> {
    for (const part of keyParts) {
      if (!SEGMENT_PATTERN.test(part)) {
        throw new Error(`invalid storage key segment: '${part}'`);
      }
    }
    void contentType; // content type is inferred from the extension embedded in keyParts on read

    const key = keyParts.join('/');
    const absolute = this.resolveInsideRoot(key);
    if (!absolute) {
      throw new Error(`storage key escapes root: '${key}'`);
    }

    await fs.mkdir(path.dirname(absolute), { recursive: true });
    // Write to a temp path and rename into place — rename is atomic on the same filesystem, so
    // a crash mid-write never leaves a half-written file being served.
    const tmpPath = `${absolute}.tmp-${randomUUID()}`;
    await fs.writeFile(tmpPath, body);
    await fs.rename(tmpPath, absolute);

    return key;
  }

  async delete(key: StorageKey): Promise<void> {
    const absolute = this.resolveInsideRoot(key);
    if (!absolute) return;
    try {
      await fs.unlink(absolute);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async read(key: StorageKey): Promise<StoredObject | null> {
    const absolute = this.resolveInsideRoot(key);
    if (!absolute) return null;

    let stat;
    try {
      stat = await fs.stat(absolute);
    } catch {
      return null;
    }
    if (!stat.isFile()) return null;

    return {
      stream: createReadStream(absolute),
      contentType: contentTypeFromExtension(absolute),
      byteSize: stat.size,
      etag: `W/"${stat.size}-${stat.mtimeMs}"`,
    };
  }

  publicUrl(key: StorageKey): string {
    return `${this.publicBaseUrl}/media/${key}`;
  }

  /** Resolves `key` to an absolute path guaranteed to sit inside `this.root`, or null if it
   * doesn't (or is malformed) — this is the gate that matters most, since on GET /media/*
   * `key` comes straight from the URL. */
  private resolveInsideRoot(key: string): string | null {
    // On win32, path.resolve treats '\' as a separator too, so a key like 'a\..\..\etc' would
    // slip past a check that only normalizes '/'. Reject backslash and NUL outright.
    if (key.includes('\\') || key.includes('\0')) return null;

    const absolute = path.resolve(this.root, key);
    const rootWithSep = this.root.endsWith(path.sep) ? this.root : this.root + path.sep;
    // The trailing separator matters: without it, '/data/media-evil' would pass a naive
    // startsWith('/data/media') check.
    return absolute.startsWith(rootWithSep) ? absolute : null;
  }
}

function contentTypeFromExtension(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.webp':
      return 'image/webp';
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    default:
      return 'application/octet-stream';
  }
}
