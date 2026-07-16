import { db } from "@/lib/db";

const DEFAULT_QUOTA_GB = 20;

// 容量上限は環境変数(設定ファイル)で管理する。管理画面での変更は今回のスコープ外。
export function getQuotaBytes(): bigint {
  const gb = Number(process.env.STORAGE_QUOTA_GB ?? DEFAULT_QUOTA_GB);
  return BigInt(Math.round(gb * 1024 ** 3));
}

export async function getUsedBytes(userId: string): Promise<bigint> {
  const result = await db.video.aggregate({
    where: { userId, sourceType: "FILE" },
    _sum: { fileSize: true },
  });
  return result._sum.fileSize ?? BigInt(0);
}

export async function hasCapacityFor(userId: string, incomingBytes: bigint): Promise<boolean> {
  const used = await getUsedBytes(userId);
  return used + incomingBytes <= getQuotaBytes();
}
