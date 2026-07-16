import { localStorageAdapter } from "./local";
import { s3StorageAdapter } from "./s3";
import type { StorageAdapter, StorageDriverName } from "./types";

// アップロード時点のドライバを Video.storageDriver に固定保存しているため、
// 取得・削除時は「今どの設定になっているか」ではなくレコードが指すドライバを使う。
export function getStorageAdapter(driver: StorageDriverName): StorageAdapter {
  switch (driver) {
    case "S3":
      return s3StorageAdapter;
    case "LOCAL":
      return localStorageAdapter;
  }
}

// 新規アップロード時に使うデフォルトドライバ(環境変数 STORAGE_DRIVER で切り替え)
export function getDefaultStorageDriver(): StorageDriverName {
  return process.env.STORAGE_DRIVER === "S3" ? "S3" : "LOCAL";
}

export type { StorageAdapter, StorageDriverName } from "./types";
