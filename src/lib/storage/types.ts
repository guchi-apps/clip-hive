import type { Readable } from "node:stream";

export type StorageDriverName = "LOCAL" | "S3";

export interface PutObjectParams {
  key: string;
  body: Readable;
  contentType?: string;
}

// end は inclusive(HTTP Range ヘッダーと同じ意味)。未指定ならファイル末尾まで。
export interface RangeOptions {
  start: number;
  end?: number;
}

export interface StorageAdapter {
  readonly driver: StorageDriverName;
  put(params: PutObjectParams): Promise<void>;
  createReadStream(key: string, range?: RangeOptions): Promise<Readable>;
  delete(key: string): Promise<void>;
}
