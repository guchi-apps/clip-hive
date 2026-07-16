import { requireUserId } from "@/lib/auth-user";
import { db } from "@/lib/db";
import { getStorageAdapter } from "@/lib/storage";

type Params = { params: Promise<{ id: string }> };

// ゴミ箱に入っている動画のみ完全削除できる(誤操作防止のため、必ずゴミ箱を経由させる)。
export async function DELETE(_request: Request, { params }: Params) {
  const userId = await requireUserId();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await db.video.findFirst({ where: { id, userId } });
  if (!existing) return Response.json({ error: "Not Found" }, { status: 404 });
  if (!existing.deletedAt) {
    return Response.json({ error: "先にゴミ箱へ移動してください" }, { status: 400 });
  }

  if (existing.sourceType === "FILE" && existing.storageDriver && existing.storageKey) {
    const storage = getStorageAdapter(existing.storageDriver);
    await storage.delete(existing.storageKey);
  }

  await db.video.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
