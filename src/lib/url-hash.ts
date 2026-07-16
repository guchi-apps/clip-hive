import { createHash } from "node:crypto";

// URL の重複判定に使う。MySQL の InnoDB ユニークインデックスが utf8mb4 で
// 3072byte までしか張れないため、長さ上限の無い url 列を直接インデックスできない。
export function hashUrl(url: string): string {
  return createHash("sha256").update(url.trim()).digest("hex");
}
