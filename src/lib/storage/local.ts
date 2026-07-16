import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import { pipeline } from "node:stream/promises";

import type { PutObjectParams, RangeOptions, StorageAdapter } from "./types";

// ローカル保存先はリポジトリ直下 storage/ (.gitignore 済み)。
// 本番では VPS のディスク上にそのまま永続化される。
function rootDir(): string {
  return process.env.STORAGE_LOCAL_DIR
    ? path.resolve(process.env.STORAGE_LOCAL_DIR)
    : path.resolve(process.cwd(), "storage");
}

function resolveKeyPath(key: string): string {
  const resolved = path.resolve(rootDir(), key);
  if (!resolved.startsWith(rootDir())) {
    throw new Error(`Invalid storage key: ${key}`);
  }
  return resolved;
}

export const localStorageAdapter: StorageAdapter = {
  driver: "LOCAL",

  async put({ key, body }: PutObjectParams) {
    const filePath = resolveKeyPath(key);
    await mkdir(path.dirname(filePath), { recursive: true });
    await pipeline(body, createWriteStream(filePath));
  },

  async createReadStream(key: string, range?: RangeOptions) {
    return createReadStream(resolveKeyPath(key), range && { start: range.start, end: range.end });
  },

  async delete(key: string) {
    await rm(resolveKeyPath(key), { force: true });
  },
};
