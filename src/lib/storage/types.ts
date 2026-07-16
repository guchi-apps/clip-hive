import type { Readable } from "node:stream";

export type StorageDriverName = "LOCAL" | "S3";

export interface PutObjectParams {
  key: string;
  body: Readable;
  contentType?: string;
}

export interface StorageAdapter {
  readonly driver: StorageDriverName;
  put(params: PutObjectParams): Promise<void>;
  createReadStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
}
