import { Readable } from 'stream';

/** Opaque, adapter-agnostic identifier. Never a URL, never a filesystem path — local disk
 * today, S3/R2 tomorrow, and persisted rows must survive the swap untouched. */
export type StorageKey = string;

export interface PutObjectParams {
  /** Path segments joined by the adapter. Each segment is validated — never derive these from
   * user input (e.g. an uploaded filename); use generated ids instead. */
  keyParts: string[];
  body: Buffer;
  contentType: string;
}

export interface StoredObject {
  stream: Readable;
  contentType: string;
  byteSize: number;
  etag: string;
}

export abstract class FileStoragePort {
  abstract put(params: PutObjectParams): Promise<StorageKey>;
  /** Best-effort: a missing object is NOT an error — cleanup must be idempotent. */
  abstract delete(key: StorageKey): Promise<void>;
  abstract read(key: StorageKey): Promise<StoredObject | null>;
  /** Absolute, browser-loadable URL for a stored key. Pure string composition, no I/O — an S3
   * adapter would return the bucket/CDN URL instead. */
  abstract publicUrl(key: StorageKey): string;
}
