import { db } from "@/lib/db";

/**
 * タグ名の配列から、そのユーザーのタグレコードのIDを解決する。
 * 存在しない名前は新規作成する(初回入力時にタグ辞書へ自動登録するため)。
 */
export async function resolveTagIds(
  userId: string,
  names: string[] | undefined
): Promise<string[] | undefined> {
  if (names === undefined) return undefined;

  const uniqueNames = Array.from(new Set(names.map((name) => name.trim()).filter(Boolean)));
  if (uniqueNames.length === 0) return [];

  const ids = await Promise.all(
    uniqueNames.map(async (name) => {
      const tag = await db.tag.upsert({
        where: { userId_name: { userId, name } },
        update: {},
        create: { userId, name },
      });
      return tag.id;
    })
  );
  return ids;
}
